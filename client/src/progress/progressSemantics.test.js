import {
  buildAssessmentResultSummary,
  normalizeActivityComposition,
  normalizeLearningPathProgress,
  buildLearningPathSegments,
  formatLearningPathPoints,
  getProgressSections,
  mapAssessmentTopicResult,
  PROGRESS_SECTION_IDS,
} from "./progressSemantics";
import enLocale from "../i18n/locales/en.json";
import fs from "fs";
import path from "path";

test("progress sections use learner-facing semantics without mastery nav", () => {
  const sections = getProgressSections({ hasAssessmentResults: true, hasRecommendation: true });
  expect(sections.map(section => section.id)).toEqual([
    PROGRESS_SECTION_IDS.OVERVIEW,
    PROGRESS_SECTION_IDS.ASSESSMENT_RESULTS,
    PROGRESS_SECTION_IDS.RECOMMENDATION,
    PROGRESS_SECTION_IDS.LEARNING_ACTIVITY,
    PROGRESS_SECTION_IDS.BADGES,
  ]);
  expect(sections.some(section => /mastery/i.test(section.id))).toBe(false);
  expect(sections.some(section => /mastery/i.test(section.labelKey))).toBe(false);
});

test("progress locale copy separates assessment results from overall mastery", () => {
  expect(enLocale.progress.title).toBe("My Learning Journey");
  expect(enLocale.progress.sectionNav.overview).toBe("Overview");
  expect(enLocale.progress.sectionNav.assessmentResults).toBe("Assessment Results");
  expect(enLocale.progress.sectionNav.learningActivity).toBe("Activity History");
  expect(enLocale.progress.activityComposition.title).toBe("Learning Activity Overview");
  expect(enLocale.progress.activityComposition.disclaimer).toMatch(/does not measure/i);
  expect(enLocale.progress.sectionNav.mastery).toBeUndefined();
  expect(enLocale.progress.mastery).toBeUndefined();
});

test("assessment topic results preserve score counts without presenting mastery", () => {
  const result = mapAssessmentTopicResult({
    topic_code: "phishing_and_scams",
    correct_count: 2,
    total_count: 3,
    percentage: 67,
    currentLevel: "developing",
  });
  expect(result).toMatchObject({
    topicCode: "phishing_and_scams",
    correctCount: 2,
    totalCount: 3,
    percentage: 67,
    resultLevel: "developing",
    sourceType: "initial_assessment",
  });
  expect(result.masteryPercentage).toBeUndefined();
  expect(buildAssessmentResultSummary(result)).toBe("progress.assessmentResults.correctOutOfTotal");
});

test("activity composition normalizes real segments without fake resource completion", () => {
  const composition = normalizeActivityComposition({
    totalRecordedActivities: 5,
    segments: [
      { id: "assessment_topics", count: 4, sharePercentage: 80, displayValue: "4 assessed topics" },
      { id: "completed_recommendations", count: 1, sharePercentage: 20, displayValue: "1 completed recommendation" },
      { id: "resources_completed", count: 3, sharePercentage: 60, displayValue: "3 completed resources" },
    ],
    disclaimer: "This overview reflects your recorded Cyberly learning activities. It does not measure your overall cybersecurity ability.",
  });

  expect(composition.totalRecordedActivities).toBe(5);
  expect(composition.segments.map(segment => segment.id)).toEqual([
    "assessment_topics",
    "completed_recommendations",
  ]);
  expect(composition.segments[0].completionPercentage).toBeUndefined();
  expect(composition.segments[0].masteryPercentage).toBeUndefined();
});

test("empty activity composition is safe and has no completion claim", () => {
  const composition = normalizeActivityComposition(null);
  expect(composition.totalRecordedActivities).toBe(0);
  expect(composition.segments).toEqual([]);
  expect(composition.overallMasteryPercentage).toBeUndefined();
  expect(composition.completionPercentage).toBeUndefined();
});

test("learning path progress normalizes capped display without mastery semantics", () => {
  const progress = normalizeLearningPathProgress({
    assessment: { earnedPoints: 25, maximumPoints: 25, correctAnswers: 12, totalQuestions: 12 },
    scenarios: { earnedPoints: 75, maximumPoints: 75, completedUnique: 8, totalEligible: 8 },
    engagement: { earnedPoints: 15, maximumPoints: 15, completedRecommendations: 3 },
    rawPoints: 115,
    displayedPercent: 115,
    displayCap: 100,
  });

  expect(progress.displayedPercent).toBe(100);
  expect(progress.rawPoints).toBe(115);
  expect(progress.semantics).toMatchObject({
    type: "learning_path_progress",
    notMastery: true,
    notAbilityScore: true,
  });
  expect(progress.masteryPercentage).toBeUndefined();
  expect(progress.resourceCompletion).toBeUndefined();
});

test("learning path segments fill assessment scenarios engagement then remaining", () => {
  const segments = buildLearningPathSegments({
    assessment: { earnedPoints: 18.75, maximumPoints: 25 },
    scenarios: { earnedPoints: 37.5, maximumPoints: 75 },
    engagement: { earnedPoints: 5, maximumPoints: 15 },
    rawPoints: 61.25,
    displayedPercent: 61,
    displayCap: 100,
  });

  expect(segments.map(segment => segment.id)).toEqual([
    "assessment",
    "scenarios",
    "engagement",
    "remaining",
  ]);
  expect(segments.map(segment => segment.visibleValue)).toEqual([18.75, 37.5, 5, 38.75]);
  expect(Math.round(segments.reduce((sum, segment) => sum + segment.width, 0))).toBe(100);
});

test("learning path segments clip visual overflow at display cap", () => {
  const segments = buildLearningPathSegments({
    assessment: { earnedPoints: 25, maximumPoints: 25 },
    scenarios: { earnedPoints: 75, maximumPoints: 75 },
    engagement: { earnedPoints: 15, maximumPoints: 15 },
    rawPoints: 115,
    displayedPercent: 100,
    displayCap: 100,
  });

  expect(segments.find(segment => segment.id === "engagement")).toBeUndefined();
  expect(segments.find(segment => segment.id === "remaining")).toBeUndefined();
  expect(segments.reduce((sum, segment) => sum + segment.visibleValue, 0)).toBe(100);
});

test("learning path points avoid unnecessary decimal noise", () => {
  expect(formatLearningPathPoints(25)).toBe("25");
  expect(formatLearningPathPoints(18.75)).toBe("18.8");
});

test("dashboard places learning path progress before initial assessment", () => {
  const appSource = fs.readFileSync(path.join(__dirname, "..", "App.jsx"), "utf8");
  const progressIndex = appSource.indexOf('id="dashboard-measured-progress"');
  const assessmentIndex = appSource.indexOf('id="dashboard-initial-assessment"');
  const recommendationIndex = appSource.indexOf('id="dashboard-recommended-next-step"');

  expect(progressIndex).toBeGreaterThan(-1);
  expect(assessmentIndex).toBeGreaterThan(-1);
  expect(recommendationIndex).toBeGreaterThan(-1);
  expect(progressIndex).toBeLessThan(assessmentIndex);
  expect(assessmentIndex).toBeLessThan(recommendationIndex);
});

test("recommendation completion refreshes progress data from the API", () => {
  const appSource = fs.readFileSync(path.join(__dirname, "..", "App.jsx"), "utf8");
  const handlerStart = appSource.indexOf("async function completeRecommendation()");
  const handlerEnd = appSource.indexOf("function scrollToProgressSection", handlerStart);
  const handlerSource = appSource.slice(handlerStart, handlerEnd);

  expect(handlerStart).toBeGreaterThan(-1);
  expect(handlerSource).toMatch(/dbMarkRecommendationCompleted/);
  expect(handlerSource).toMatch(/dbGetProgress/);
  expect(handlerSource.indexOf("dbGetProgress")).toBeGreaterThan(handlerSource.indexOf("dbMarkRecommendationCompleted"));
});

export const PROGRESS_SECTION_IDS = {
  OVERVIEW: "progress-overview",
  ASSESSMENT_RESULTS: "progress-assessment-results",
  RECOMMENDATION: "progress-recommendation",
  LEARNING_ACTIVITY: "progress-learning-activity",
  BADGES: "progress-badges",
};

export const PROGRESS_SEMANTIC_SECTIONS = [
  { id: PROGRESS_SECTION_IDS.OVERVIEW, labelKey: "progress.sectionNav.overview" },
  { id: PROGRESS_SECTION_IDS.ASSESSMENT_RESULTS, labelKey: "progress.sectionNav.assessmentResults", optional: "assessmentResults" },
  { id: PROGRESS_SECTION_IDS.RECOMMENDATION, labelKey: "progress.sectionNav.recommendation", optional: "recommendation" },
  { id: PROGRESS_SECTION_IDS.LEARNING_ACTIVITY, labelKey: "progress.sectionNav.learningActivity" },
  { id: PROGRESS_SECTION_IDS.BADGES, labelKey: "progress.sectionNav.badges" },
];

export const ACTIVITY_COMPOSITION_SEGMENT_IDS = [
  "assessment_topics",
  "completed_scenarios",
  "completed_recommendations",
  "learning_events",
];

export const LEARNING_PATH_SEGMENT_IDS = [
  "assessment",
  "scenarios",
  "engagement",
  "remaining",
];

function numberOrZero(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeComponent(component = {}, fallbackMaximum = 0) {
  return {
    earnedPoints: Math.max(0, numberOrZero(component.earnedPoints)),
    maximumPoints: Math.max(0, numberOrZero(component.maximumPoints || fallbackMaximum)),
    status: component.status || "",
  };
}

export function getProgressSections({ hasAssessmentResults = false, hasRecommendation = false } = {}) {
  return PROGRESS_SEMANTIC_SECTIONS.filter(section => (
    (section.optional !== "assessmentResults" || hasAssessmentResults) &&
    (section.optional !== "recommendation" || hasRecommendation)
  ));
}

export function mapAssessmentTopicResult(topic = {}) {
  const total = Number(topic.totalCount ?? topic.total_count ?? 0);
  const correct = Number(topic.correctCount ?? topic.correct_count ?? 0);
  const percentage = Number(topic.percentage ?? topic.masteryPercentage ?? 0);
  return {
    topicCode: topic.topicCode || topic.topic_code || "",
    topicLabel: topic.topicLabel || topic.topic_label || topic.topicCode || topic.topic_code || "",
    correctCount: Number.isFinite(correct) ? correct : 0,
    totalCount: Number.isFinite(total) ? total : 0,
    percentage: Number.isFinite(percentage) ? percentage : 0,
    resultLevel: topic.resultLevel || topic.currentLevel || null,
    sourceType: topic.sourceType || "initial_assessment",
  };
}

export function buildAssessmentResultSummary(topic = {}) {
  const result = mapAssessmentTopicResult(topic);
  if (!result.totalCount) return "progress.assessmentResults.noQuestionCount";
  return "progress.assessmentResults.correctOutOfTotal";
}

export function normalizeActivityComposition(value) {
  const segments = Array.isArray(value?.segments)
    ? value.segments
      .filter(segment => ACTIVITY_COMPOSITION_SEGMENT_IDS.includes(segment?.id))
      .map(segment => ({
        id: segment.id,
        label: segment.label || segment.id,
        count: Number.isFinite(Number(segment.count)) ? Number(segment.count) : 0,
        sharePercentage: Number.isFinite(Number(segment.sharePercentage))
          ? Math.max(0, Math.min(100, Number(segment.sharePercentage)))
          : 0,
        displayValue: segment.displayValue || "",
        source: segment.source || null,
        available: segment.available !== false,
      }))
      .filter(segment => segment.count > 0)
    : [];

  return {
    totalRecordedActivities: Number.isFinite(Number(value?.totalRecordedActivities))
      ? Math.max(0, Number(value.totalRecordedActivities))
      : segments.reduce((sum, segment) => sum + segment.count, 0),
    segments,
    disclaimer: value?.disclaimer || "",
    generatedAt: value?.generatedAt || null,
  };
}

export function normalizeRecentLearningActivity(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter(item => item?.type && item?.occurredAt)
    .map(item => ({
      type: item.type,
      label: item.label || item.type,
      topicCode: item.topicCode || null,
      scenarioSlug: item.scenarioSlug || null,
      occurredAt: item.occurredAt,
      source: item.source || null,
    }))
    .slice(0, 5);
}

export function normalizeLearningPathProgress(value = {}) {
  const assessment = normalizeComponent(value?.assessment, 25);
  const scenarios = normalizeComponent(value?.scenarios, 75);
  const engagement = normalizeComponent(value?.engagement, 15);
  const rawPoints = Math.max(0, numberOrZero(value?.rawPoints));
  const displayCap = Math.max(1, numberOrZero(value?.displayCap || 100));
  const displayedPercent = clamp(
    Number.isFinite(Number(value?.displayedPercent))
      ? Math.round(Number(value.displayedPercent))
      : Math.round(Math.min(rawPoints, displayCap)),
    0,
    100
  );

  return {
    modelVersion: value?.modelVersion || "phase4a5-v1",
    assessment: {
      ...assessment,
      scoreRatio: clamp(numberOrZero(value?.assessment?.scoreRatio), 0, 1),
      correctAnswers: Math.max(0, numberOrZero(value?.assessment?.correctAnswers)),
      totalQuestions: Math.max(0, numberOrZero(value?.assessment?.totalQuestions)),
    },
    scenarios: {
      ...scenarios,
      completedUnique: Math.max(0, numberOrZero(value?.scenarios?.completedUnique)),
      totalEligible: Math.max(0, numberOrZero(value?.scenarios?.totalEligible)),
      completionRatio: clamp(numberOrZero(value?.scenarios?.completionRatio), 0, 1),
    },
    engagement: {
      ...engagement,
      completedRecommendations: Math.max(0, numberOrZero(value?.engagement?.completedRecommendations)),
      pointsPerCompletedRecommendation: Math.max(0, numberOrZero(value?.engagement?.pointsPerCompletedRecommendation || 5)),
    },
    rawPoints,
    displayedPercent,
    displayCap,
    semantics: {
      type: value?.semantics?.type || "learning_path_progress",
      notMastery: value?.semantics?.notMastery !== false,
      notAbilityScore: value?.semantics?.notAbilityScore !== false,
    },
  };
}

export function buildLearningPathSegments(progress = {}) {
  const normalized = normalizeLearningPathProgress(progress);
  const components = [
    { id: "assessment", value: normalized.assessment.earnedPoints },
    { id: "scenarios", value: normalized.scenarios.earnedPoints },
    { id: "engagement", value: normalized.engagement.earnedPoints },
  ];
  let used = 0;
  const filled = components.map(component => {
    const visibleValue = Math.max(0, Math.min(component.value, normalized.displayCap - used));
    used += visibleValue;
    return {
      id: component.id,
      value: component.value,
      visibleValue,
      width: normalized.displayCap > 0 ? (visibleValue / normalized.displayCap) * 100 : 0,
    };
  }).filter(segment => segment.visibleValue > 0);

  const remaining = Math.max(0, normalized.displayCap - used);
  return [
    ...filled,
    ...(remaining > 0 ? [{
      id: "remaining",
      value: remaining,
      visibleValue: remaining,
      width: normalized.displayCap > 0 ? (remaining / normalized.displayCap) * 100 : 0,
    }] : []),
  ];
}

export function formatLearningPathPoints(value) {
  const number = numberOrZero(value);
  return Number.isInteger(number) ? String(number) : number.toFixed(1);
}

import {
  buildDashboardHeaderStats,
  buildResourceHeaderStats,
  countLearningTopicsFromResources,
  getAchievementDefinitions,
  getLearningInterestStateKey,
} from "./productSemantics";
import enLocale from "../i18n/locales/en.json";
import msLocale from "../i18n/locales/ms.json";
import zhLocale from "../i18n/locales/zh-CN.json";

const resources = [
  { id: 1, categoryCode: "Scams", status: "published" },
  { id: 2, categoryCode: "Scams", status: "published" },
  { id: 3, categoryCode: "Safety", status: "published" },
  { id: 4, categoryCode: "All", status: "published" },
  { id: 5, categoryCode: "Privacy", status: "draft" },
  { id: 6, categoryCode: "Passwords", status: "archived" },
];

test("learning topic count excludes All, duplicate, draft and archived categories", () => {
  expect(countLearningTopicsFromResources(resources)).toBe(2);
});

test("dashboard header uses dynamic learning topics and does not force guide or assessment metrics", () => {
  const stats = buildDashboardHeaderStats(resources);
  expect(stats).toEqual([
    { value: "2", labelKey: "dashboard.stats.learningTopics" },
    { value: "3", labelKey: "dashboard.stats.languages" },
    { value: "AI", labelKey: "dashboard.stats.powered" },
  ]);
  expect(JSON.stringify(stats)).not.toMatch(/9|publishedGuides|assessment/i);
});

test("resource header uses dynamic topic and neutral guide counts", () => {
  const stats = buildResourceHeaderStats(resources);
  expect(stats).toEqual([
    { value: "2", labelKey: "resources.stats.learningTopics" },
    { value: "3", labelKey: "resources.stats.guides" },
    { value: "", labelKey: "resources.stats.freeAccess", singleLine: true },
    { value: "MY", labelKey: "resources.stats.malaysiaFocused" },
  ]);
});

test("learning interests expose explicit selected state rather than completion", () => {
  expect(getLearningInterestStateKey(true)).toBe("progress.learningInterests.selected");
  expect(getLearningInterestStateKey(false)).toBe("progress.learningInterests.notSelected");
});

test("learner achievements avoid measured baseline and technical preview rewards", () => {
  const achievements = getAchievementDefinitions({
    hasJoined: true,
    hasHelpTopics: true,
    hasMultipleLanguages: true,
    hasAssessmentBaseline: true,
  });
  expect(achievements.map(achievement => achievement.labelKey)).toEqual([
    "progress.achievements.joined",
    "progress.achievements.resourceExplorer",
    "progress.achievements.setGoals",
    "progress.achievements.multilingual",
    "progress.achievements.assessmentCompleted",
  ]);
  expect(achievements.some(achievement => /chatPreview|measuredBaseline|exploredResources/.test(achievement.labelKey))).toBe(false);
});

test("product semantic locale keys exist in English, Malay and Simplified Chinese", () => {
  for (const locale of [enLocale, msLocale, zhLocale]) {
    expect(locale.dashboard.stats.learningTopics).toBeTruthy();
    expect(locale.resources.stats.learningTopics).toBeTruthy();
    expect(locale.resources.stats.guides).toBeTruthy();
    expect(locale.resources.stats.freeAccess).toBeTruthy();
    expect(locale.progress.sectionNav.recommendation).toBeTruthy();
    expect(locale.progress.sectionNav.learningActivity).toBeTruthy();
    expect(locale.progress.sectionNav.badges).toBeTruthy();
    expect(locale.progress.learningInterests.title).toBeTruthy();
    expect(locale.progress.learningInterests.selected).toBeTruthy();
    expect(locale.progress.learningInterests.notSelected).toBeTruthy();
    expect(locale.progress.achievements.title).toBeTruthy();
    expect(locale.progress.achievements.assessmentCompleted).toBeTruthy();
    expect(locale.progress.achievements.resourceExplorer).toBeTruthy();
  }
  expect(enLocale.dashboard.stats.topics).toBeUndefined();
  expect(enLocale.resources.stats.topicsCovered).toBeUndefined();
  expect(enLocale.resources.stats.freeToRead).toBeUndefined();
  expect(enLocale.progress.badges).toBeUndefined();
});

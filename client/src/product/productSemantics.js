function isVisibleResource(resource = {}) {
  if (resource.status && resource.status !== "published") return false;
  return resource.categoryCode !== "All";
}

export function countLearningTopicsFromResources(resources = []) {
  return new Set(
    resources
      .filter(isVisibleResource)
      .map(resource => resource.categoryCode)
      .filter(categoryCode => categoryCode && categoryCode !== "All")
  ).size;
}

export function countVisibleGuides(resources = []) {
  return resources.filter(isVisibleResource).length;
}

export function buildDashboardHeaderStats(resources = []) {
  return [
    {
      value: String(countLearningTopicsFromResources(resources)),
      labelKey: "dashboard.stats.learningTopics",
    },
    { value: "3", labelKey: "dashboard.stats.languages" },
    { value: "AI", labelKey: "dashboard.stats.powered" },
  ];
}

export function buildResourceHeaderStats(resources = []) {
  return [
    {
      value: String(countLearningTopicsFromResources(resources)),
      labelKey: "resources.stats.learningTopics",
    },
    {
      value: String(countVisibleGuides(resources)),
      labelKey: "resources.stats.guides",
    },
    { value: "", labelKey: "resources.stats.freeAccess", singleLine: true },
    { value: "MY", labelKey: "resources.stats.malaysiaFocused" },
  ];
}

export function getLearningInterestStateKey(selected) {
  return selected
    ? "progress.learningInterests.selected"
    : "progress.learningInterests.notSelected";
}

export function getAchievementDefinitions({
  hasJoined = true,
  hasHelpTopics = false,
  hasMultipleLanguages = false,
  hasAssessmentBaseline = false,
} = {}) {
  return [
    { icon: "🛡", labelKey: "progress.achievements.joined", earned: hasJoined },
    { icon: "📚", labelKey: "progress.achievements.resourceExplorer", earned: hasHelpTopics },
    { icon: "🎯", labelKey: "progress.achievements.setGoals", earned: hasHelpTopics },
    { icon: "🌐", labelKey: "progress.achievements.multilingual", earned: Boolean(hasMultipleLanguages) },
    { icon: "🏆", labelKey: "progress.achievements.assessmentCompleted", earned: Boolean(hasAssessmentBaseline) },
  ];
}

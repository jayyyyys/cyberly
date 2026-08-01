const MODEL_VERSION = 'phase4a5-v1';
const ASSESSMENT_MAXIMUM_POINTS = 25;
const SCENARIO_MAXIMUM_POINTS = 75;
const ENGAGEMENT_MAXIMUM_POINTS = 15;
const POINTS_PER_COMPLETED_RECOMMENDATION = 5;
const DISPLAY_CAP = 100;

function numberOrZero(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function round(value, decimals = 4) {
  const factor = 10 ** decimals;
  return Math.round(numberOrZero(value) * factor) / factor;
}

function statusForAssessment(totalQuestions) {
  return totalQuestions > 0 ? 'completed' : 'not_completed';
}

function statusForScenarios(totalEligible, completedUnique) {
  if (totalEligible <= 0) return 'no_eligible_scenarios';
  return completedUnique > 0 ? 'in_progress' : 'not_started';
}

function statusForEngagement(completedRecommendations) {
  return completedRecommendations > 0 ? 'completed' : 'none_completed';
}

function buildLearningPathProgressFromMetrics(metrics = {}) {
  const correctAnswers = Math.max(0, numberOrZero(metrics.correctAnswers));
  const totalQuestions = Math.max(0, numberOrZero(metrics.totalQuestions));
  const assessmentRatio = totalQuestions > 0
    ? clamp(correctAnswers / totalQuestions, 0, 1)
    : 0;
  const assessmentContribution = round(assessmentRatio * ASSESSMENT_MAXIMUM_POINTS);

  const totalEligible = Math.max(0, numberOrZero(metrics.totalEligibleScenarios));
  const completedUnique = Math.max(0, numberOrZero(metrics.completedUniqueScenarios));
  const scenarioRatio = totalEligible > 0
    ? clamp(completedUnique / totalEligible, 0, 1)
    : 0;
  const scenarioContribution = round(scenarioRatio * SCENARIO_MAXIMUM_POINTS);

  const completedRecommendations = Math.max(0, numberOrZero(metrics.completedRecommendations));
  const engagementContribution = Math.min(
    ENGAGEMENT_MAXIMUM_POINTS,
    completedRecommendations * POINTS_PER_COMPLETED_RECOMMENDATION
  );

  const rawPoints = round(assessmentContribution + scenarioContribution + engagementContribution);
  const displayedPercent = Math.round(Math.min(rawPoints, DISPLAY_CAP));

  return {
    modelVersion: MODEL_VERSION,
    assessment: {
      earnedPoints: assessmentContribution,
      maximumPoints: ASSESSMENT_MAXIMUM_POINTS,
      scoreRatio: round(assessmentRatio),
      correctAnswers,
      totalQuestions,
      status: statusForAssessment(totalQuestions),
    },
    scenarios: {
      earnedPoints: scenarioContribution,
      maximumPoints: SCENARIO_MAXIMUM_POINTS,
      completedUnique,
      totalEligible,
      completionRatio: round(scenarioRatio),
      status: statusForScenarios(totalEligible, completedUnique),
    },
    engagement: {
      earnedPoints: engagementContribution,
      maximumPoints: ENGAGEMENT_MAXIMUM_POINTS,
      completedRecommendations,
      pointsPerCompletedRecommendation: POINTS_PER_COMPLETED_RECOMMENDATION,
      status: statusForEngagement(completedRecommendations),
    },
    rawPoints,
    displayedPercent,
    displayCap: DISPLAY_CAP,
    semantics: {
      type: 'learning_path_progress',
      notMastery: true,
      notAbilityScore: true,
    },
  };
}

async function buildLearningPathProgress(repository, userId) {
  const [
    assessmentAttempt,
    totalEligibleScenarios,
    completedUniqueScenarios,
    completedRecommendations,
  ] = await Promise.all([
    repository.findLearningPathAssessmentAttempt(userId),
    repository.countEligiblePublishedScenarios(),
    repository.countUniqueCompletedEligibleScenarios(userId),
    repository.countCompletedRecommendations(userId),
  ]);

  return buildLearningPathProgressFromMetrics({
    correctAnswers: assessmentAttempt?.total_score,
    totalQuestions: assessmentAttempt?.maximum_score,
    totalEligibleScenarios,
    completedUniqueScenarios,
    completedRecommendations,
  });
}

module.exports = {
  ASSESSMENT_MAXIMUM_POINTS,
  DISPLAY_CAP,
  ENGAGEMENT_MAXIMUM_POINTS,
  MODEL_VERSION,
  POINTS_PER_COMPLETED_RECOMMENDATION,
  SCENARIO_MAXIMUM_POINTS,
  buildLearningPathProgress,
  buildLearningPathProgressFromMetrics,
};

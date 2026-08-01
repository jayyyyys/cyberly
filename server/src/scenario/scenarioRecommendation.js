const DIFFICULTY_ORDER = ['beginner', 'developing', 'intermediate', 'advanced'];

const TOPIC_ORDER = [
  'phishing_and_scams',
  'password_and_account_security',
  'privacy_and_personal_information',
  'misinformation_and_deepfakes',
];

const REVIEW_RESULT_LEVELS = new Set(['needs_review', 'developing']);

function firstDefined(...values) {
  return values.find(value => value !== undefined && value !== null && value !== '');
}

function getTopicCode(scenario = {}) {
  return firstDefined(scenario.topicCode, scenario.topic_code);
}

function getScenarioId(scenario = {}) {
  return Number(firstDefined(scenario.id, scenario.scenarioId, scenario.scenario_id) || 0);
}

function getLatestAttempt(scenario = {}) {
  return scenario.latestAttempt || {
    id: firstDefined(scenario.latest_attempt_id, scenario.attemptId),
    status: firstDefined(scenario.latest_attempt_status, scenario.status),
    resultLevel: firstDefined(scenario.latest_result_level, scenario.resultLevel, scenario.result_level),
    percentage: firstDefined(scenario.latest_percentage, scenario.percentage),
  };
}

function isCompletedScenario(scenario = {}) {
  if (scenario.completed === true) return true;
  if (Number(scenario.completed_count || 0) > 0) return true;
  return getLatestAttempt(scenario)?.status === 'completed';
}

function getResultLevel(scenario = {}) {
  return firstDefined(
    scenario.resultLevel,
    scenario.result_level,
    scenario.latest_result_level,
    getLatestAttempt(scenario)?.resultLevel,
    getLatestAttempt(scenario)?.result_level
  ) || null;
}

function difficultyIndex(value) {
  const index = DIFFICULTY_ORDER.indexOf(value);
  return index >= 0 ? index : 0;
}

function topicIndex(value) {
  const index = TOPIC_ORDER.indexOf(value);
  return index >= 0 ? index : TOPIC_ORDER.length;
}

function difficultyDistance(value, target) {
  const scenarioIndex = difficultyIndex(value);
  const targetIndex = difficultyIndex(target || 'beginner');
  return scenarioIndex <= targetIndex
    ? targetIndex - scenarioIndex
    : scenarioIndex - targetIndex + 10;
}

function recommendationGroup(scenario, topicCode) {
  const completed = isCompletedScenario(scenario);
  const topicMatches = topicCode && getTopicCode(scenario) === topicCode;
  const resultLevel = getResultLevel(scenario);
  const reviewableCompleted = completed && REVIEW_RESULT_LEVELS.has(resultLevel);

  if (!completed && topicMatches) return 0;
  if (!completed) return 1;
  if (reviewableCompleted && topicMatches) return 2;
  if (reviewableCompleted) return 3;
  if (completed && topicMatches) return 4;
  return 5;
}

function withRecommendationMetadata(scenario, group) {
  const completed = isCompletedScenario(scenario);
  return {
    ...scenario,
    recommendationMode: completed ? 'review' : 'practice',
    recommendationReasonCode: group <= 1
      ? 'incomplete_candidate'
      : (group <= 3 ? 'review_candidate' : 'completed_fallback'),
  };
}

function selectScenarioCandidates({
  scenarios = [],
  topicCode = null,
  recommendedLevel = null,
  limit = 1,
} = {}) {
  return [...(scenarios || [])]
    .filter(scenario => TOPIC_ORDER.includes(getTopicCode(scenario)))
    .map(scenario => ({
      scenario,
      group: recommendationGroup(scenario, topicCode),
    }))
    .sort((a, b) => {
      if (a.group !== b.group) return a.group - b.group;
      const aDistance = difficultyDistance(a.scenario.difficulty, recommendedLevel);
      const bDistance = difficultyDistance(b.scenario.difficulty, recommendedLevel);
      if (aDistance !== bDistance) return aDistance - bDistance;
      const topicCompare = topicIndex(getTopicCode(a.scenario)) - topicIndex(getTopicCode(b.scenario));
      if (topicCompare !== 0) return topicCompare;
      return getScenarioId(a.scenario) - getScenarioId(b.scenario);
    })
    .slice(0, Math.max(0, Number(limit) || 1))
    .map(item => withRecommendationMetadata(item.scenario, item.group));
}

module.exports = {
  DIFFICULTY_ORDER,
  isCompletedScenario,
  selectScenarioCandidates,
};

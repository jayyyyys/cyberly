const { TOPIC_LABELS, TOPIC_PRIORITY } = require('../progress/progress.rules');

const ADAPTIVE_TOPICS = TOPIC_PRIORITY.map(topicId => ({
  topicId,
  topicLabel: TOPIC_LABELS[topicId] || topicId,
}));

const FRESHNESS_DAYS = {
  recent: 14,
  older: 45,
};

const SUMMARY_LIMITS = {
  modelSummaryCharacters: 1800,
  strengths: 2,
  supportPriorities: 2,
  nextSteps: 3,
};

const SUPPORT_NEEDS = {
  reinforceFoundation: 'reinforce_foundation',
  guidedPractice: 'guided_practice',
  continuePractice: 'continue_practice',
  readyForChallenge: 'ready_for_challenge',
  insufficientData: 'insufficient_data',
};

module.exports = {
  ADAPTIVE_TOPICS,
  FRESHNESS_DAYS,
  SUMMARY_LIMITS,
  SUPPORT_NEEDS,
};

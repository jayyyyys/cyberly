const LEARNER_EXPLANATIONS = {
  ASSESSMENT_INCOMPLETE: 'Assessment data is not available yet.',
  ASSESSMENT_BEGINNER: 'Assessment evidence suggests this topic may benefit from foundation review.',
  ASSESSMENT_DEVELOPING: 'Assessment evidence suggests this topic may benefit from more practice.',
  ASSESSMENT_STRONG: 'Assessment evidence suggests this topic is currently a stronger area.',
  LOW_MASTERY: 'Progress records suggest this topic may benefit from guided practice.',
  MODERATE_MASTERY: 'Progress records suggest this topic is developing.',
  STRONG_MASTERY: 'Progress records suggest this topic is a stronger area.',
  NO_RECENT_ACTIVITY: 'There has not been recent recorded practice for this topic.',
  RECENT_PRACTICE: 'There is recent recorded practice for this topic.',
  SCENARIO_NEEDS_REVIEW: 'A recent scenario suggests this topic may benefit from careful review.',
  SCENARIO_DEVELOPING: 'Scenario evidence suggests more practice could help.',
  SCENARIO_PROFICIENT: 'Scenario evidence suggests steady progress.',
  SCENARIO_STRONG: 'Scenario evidence suggests strong performance.',
  ACTIVE_RECOMMENDATION: 'The current recommendation points to this topic.',
  CONFLICTING_SIGNALS: 'Available records are mixed, so the recommendation should be cautious.',
  INSUFFICIENT_DATA: 'There is not enough completed learning activity for a strong signal.',
  PROFILE_LEARNING_STYLE: 'The learner has a stated learning-style preference.',
  PROFILE_HELP_TOPIC: 'The learner has selected related help topics.',
};

function reason(code, source) {
  return {
    code,
    source,
    learnerExplanation: LEARNER_EXPLANATIONS[code] || 'Available learning records provide this signal.',
  };
}

module.exports = {
  LEARNER_EXPLANATIONS,
  reason,
};

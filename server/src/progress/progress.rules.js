const TOPIC_PRIORITY = [
  'phishing_and_scams',
  'password_and_account_security',
  'privacy_and_personal_information',
  'misinformation_and_deepfakes',
];

const TOPIC_LABELS = {
  phishing_and_scams: 'phishing and scams',
  password_and_account_security: 'password and account security',
  privacy_and_personal_information: 'privacy and personal information',
  misinformation_and_deepfakes: 'misinformation and deepfakes',
};

function getLevelForPercentage(percentage) {
  if (percentage >= 85) return 'advanced';
  if (percentage >= 70) return 'intermediate';
  if (percentage >= 40) return 'developing';
  return 'beginner';
}

function getReasonCodeForPercentage(percentage) {
  if (percentage >= 85) return 'high_mastery_challenge';
  if (percentage >= 70) return 'continue_progress';
  if (percentage >= 40) return 'developing_topic';
  return 'weak_topic';
}

function reasonTextFor(topicCode, level, reasonCode) {
  if (reasonCode === 'assessment_pending') {
    return 'Complete the initial cyber wellness assessment to unlock measured progress and recommendations.';
  }

  const topic = TOPIC_LABELS[topicCode] || topicCode;
  if (reasonCode === 'high_mastery_challenge') {
    return `You already show strong ${topic} knowledge, so an ${level}-level challenge is recommended next.`;
  }
  return `Your ${topic} score was the lowest, so ${level}-level reading and practice is recommended next.`;
}

function selectRecommendation(topicScores = []) {
  if (!topicScores.length) {
    return {
      recommendationType: 'next_topic',
      topicCode: null,
      recommendedLevel: null,
      reasonCode: 'assessment_pending',
      reasonText: reasonTextFor(null, null, 'assessment_pending'),
      sourceType: 'assessment_pending',
      sourceReferenceId: null,
    };
  }

  const byTopic = new Map(topicScores.map(score => [score.topicCode, score]));
  const sorted = TOPIC_PRIORITY
    .map(topicCode => byTopic.get(topicCode))
    .filter(Boolean)
    .sort((a, b) => {
      if (a.percentage !== b.percentage) return a.percentage - b.percentage;
      return TOPIC_PRIORITY.indexOf(a.topicCode) - TOPIC_PRIORITY.indexOf(b.topicCode);
    });

  const selected = sorted[0];
  const recommendedLevel = getLevelForPercentage(selected.percentage);
  const reasonCode = getReasonCodeForPercentage(selected.percentage);

  return {
    recommendationType: reasonCode === 'weak_topic' ? 'review_topic' : 'next_topic',
    topicCode: selected.topicCode,
    recommendedLevel,
    reasonCode,
    reasonText: reasonTextFor(selected.topicCode, recommendedLevel, reasonCode),
    sourceType: 'initial_assessment',
    sourceReferenceId: selected.sourceReferenceId || null,
  };
}

module.exports = {
  TOPIC_LABELS,
  TOPIC_PRIORITY,
  getLevelForPercentage,
  getReasonCodeForPercentage,
  reasonTextFor,
  selectRecommendation,
};

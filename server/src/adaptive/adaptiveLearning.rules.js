const { normalizeLocale } = require('../i18n/locale');
const {
  ADAPTIVE_TOPICS,
  FRESHNESS_DAYS,
  SUMMARY_LIMITS,
  SUPPORT_NEEDS,
} = require('./adaptiveLearning.constants');
const { reason } = require('./adaptiveLearning.explanations');

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function parseJsonArray(value) {
  if (Array.isArray(value)) return value.map(item => String(item)).filter(Boolean);
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(item => String(item)).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function daysBetween(now, value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / (24 * 60 * 60 * 1000)));
}

function freshness(now, value) {
  const days = daysBetween(now, value);
  if (days === null) return 'unknown';
  if (days <= FRESHNESS_DAYS.recent) return 'recent';
  if (days <= FRESHNESS_DAYS.older) return 'older';
  return 'stale';
}

function levelFromPercentage(percentage) {
  const value = numberOrNull(percentage);
  if (value === null) return 'unknown';
  if (value >= 85) return 'advanced';
  if (value >= 70) return 'intermediate';
  if (value >= 40) return 'developing';
  return 'beginner';
}

function masteryBand(percentage) {
  const value = numberOrNull(percentage);
  if (value === null) return 'unknown';
  if (value >= 85) return 'strong';
  if (value >= 70) return 'steady';
  if (value >= 40) return 'developing';
  return 'foundation';
}

function scenarioBand(percentage, resultLevel) {
  const normalized = String(resultLevel || '').toLowerCase();
  if (['needs_review', 'developing', 'proficient', 'strong'].includes(normalized)) return normalized;
  const value = numberOrNull(percentage);
  if (value === null) return 'unknown';
  if (value >= 85) return 'strong';
  if (value >= 70) return 'proficient';
  if (value >= 40) return 'developing';
  return 'needs_review';
}

function average(values) {
  const safe = values.map(numberOrNull).filter(value => value !== null);
  if (!safe.length) return null;
  return Math.round(safe.reduce((sum, value) => sum + value, 0) / safe.length);
}

function latestDate(values) {
  const dates = values
    .filter(Boolean)
    .map(value => new Date(value))
    .filter(date => !Number.isNaN(date.getTime()))
    .sort((a, b) => b.getTime() - a.getTime());
  return dates[0] ? dates[0].toISOString() : null;
}

function mapByTopic(rows = [], field) {
  const map = new Map();
  for (const row of rows) {
    if (!row?.topic_code) continue;
    map.set(row.topic_code, numberOrNull(row[field]));
  }
  return map;
}

function scenariosByTopic(rows = []) {
  const buckets = new Map();
  for (const row of rows) {
    if (!row?.topic_code) continue;
    const current = buckets.get(row.topic_code) || [];
    current.push(row);
    buckets.set(row.topic_code, current);
  }
  return buckets;
}

function profileCompleteness(profile) {
  if (!profile) return 'minimal';
  const fields = [
    profile.education_level,
    profile.preferred_language,
    profile.familiarity_level,
    profile.learning_style,
  ].filter(Boolean).length;
  const helpTopics = parseJsonArray(profile.help_topics).length;
  if (fields >= 4 && helpTopics > 0) return 'complete';
  if (fields >= 2 || helpTopics > 0) return 'partial';
  return 'minimal';
}

function detectUnsupportedTopics(data = {}) {
  const allowed = new Set(ADAPTIVE_TOPICS.map(topic => topic.topicId));
  const values = [
    ...(data.assessmentTopicScores || []).map(row => row.topic_code),
    ...(data.topicProgress || []).map(row => row.topic_code),
    ...(data.scenarios || []).map(row => row.topic_code),
    data.recommendation?.topic_code,
  ].filter(Boolean);
  return values.some(topic => !allowed.has(topic));
}

function confidenceFor({ hasAssessment, hasProgress, hasScenario, hasRecommendation, signalConflict, recentActivity }) {
  if (!hasAssessment && !hasProgress && !hasScenario && !hasRecommendation) return 'unknown';
  if (signalConflict || recentActivity === 'stale') {
    return (hasAssessment && (hasProgress || hasScenario)) ? 'medium' : 'low';
  }
  const count = [hasAssessment, hasProgress, hasScenario, hasRecommendation].filter(Boolean).length;
  if (count >= 3 && recentActivity !== 'unknown') return 'high';
  if (count >= 2) return 'medium';
  return 'low';
}

function supportNeedFor({ assessmentLevel, mastery, scenario, hasAnySignal, hasRecommendation, conflict }) {
  if (!hasAnySignal) return SUPPORT_NEEDS.insufficientData;
  if (conflict) return SUPPORT_NEEDS.guidedPractice;
  if (assessmentLevel === 'beginner' || mastery === 'foundation' || scenario === 'needs_review') {
    return SUPPORT_NEEDS.reinforceFoundation;
  }
  if (assessmentLevel === 'developing' || mastery === 'developing' || scenario === 'developing' || hasRecommendation) {
    return SUPPORT_NEEDS.guidedPractice;
  }
  if (assessmentLevel === 'advanced' && mastery === 'strong' && ['strong', 'unknown'].includes(scenario)) {
    return SUPPORT_NEEDS.readyForChallenge;
  }
  if (mastery === 'strong' && scenario === 'strong') return SUPPORT_NEEDS.readyForChallenge;
  return SUPPORT_NEEDS.continuePractice;
}

function hasConflict(values) {
  const numeric = values.map(numberOrNull).filter(value => value !== null);
  if (numeric.length < 2) return false;
  return Math.max(...numeric) - Math.min(...numeric) >= 35;
}

function buildReasons({ assessmentLevel, mastery, scenario, recentActivity, hasRecommendation, conflict, hasAnySignal }) {
  const reasons = [];
  if (!hasAnySignal) reasons.push(reason('INSUFFICIENT_DATA', 'available_learning_records'));
  if (assessmentLevel === 'unknown') reasons.push(reason('ASSESSMENT_INCOMPLETE', 'assessment_summary'));
  if (assessmentLevel === 'beginner') reasons.push(reason('ASSESSMENT_BEGINNER', 'assessment_summary'));
  if (assessmentLevel === 'developing') reasons.push(reason('ASSESSMENT_DEVELOPING', 'assessment_summary'));
  if (['intermediate', 'advanced'].includes(assessmentLevel)) reasons.push(reason('ASSESSMENT_STRONG', 'assessment_summary'));
  if (mastery === 'foundation') reasons.push(reason('LOW_MASTERY', 'topic_progress_summary'));
  if (mastery === 'developing') reasons.push(reason('MODERATE_MASTERY', 'topic_progress_summary'));
  if (['steady', 'strong'].includes(mastery)) reasons.push(reason('STRONG_MASTERY', 'topic_progress_summary'));
  if (recentActivity === 'stale' || recentActivity === 'unknown') reasons.push(reason('NO_RECENT_ACTIVITY', 'learning_activity_summary'));
  if (recentActivity === 'recent') reasons.push(reason('RECENT_PRACTICE', 'learning_activity_summary'));
  if (scenario === 'needs_review') reasons.push(reason('SCENARIO_NEEDS_REVIEW', 'scenario_outcome_summary'));
  if (scenario === 'developing') reasons.push(reason('SCENARIO_DEVELOPING', 'scenario_outcome_summary'));
  if (scenario === 'proficient') reasons.push(reason('SCENARIO_PROFICIENT', 'scenario_outcome_summary'));
  if (scenario === 'strong') reasons.push(reason('SCENARIO_STRONG', 'scenario_outcome_summary'));
  if (hasRecommendation) reasons.push(reason('ACTIVE_RECOMMENDATION', 'current_recommendation'));
  if (conflict) reasons.push(reason('CONFLICTING_SIGNALS', 'combined_learning_evidence'));
  return reasons.slice(0, 6);
}

function scoreSupportPriority(topic) {
  const supportWeight = {
    reinforce_foundation: 0,
    guided_practice: 1,
    continue_practice: 2,
    insufficient_data: 3,
    ready_for_challenge: 4,
  };
  const confidenceWeight = { high: 0, medium: 1, low: 2, unknown: 3 };
  return (supportWeight[topic.supportNeed] ?? 5) * 10 + (confidenceWeight[topic.confidence] ?? 4);
}

function scoreStrength(topic) {
  const supportWeight = {
    ready_for_challenge: 0,
    continue_practice: 1,
    guided_practice: 4,
    reinforce_foundation: 5,
    insufficient_data: 6,
  };
  return (supportWeight[topic.supportNeed] ?? 6) * 10;
}

function buildRecommendedNextSteps({ context, profile }) {
  const steps = [];
  if (!context.signalQuality.assessmentAvailable) {
    steps.push({
      type: 'complete_initial_assessment',
      topicId: null,
      reason: 'Complete the initial assessment so future suggestions can use stronger evidence.',
      targetId: 'assessment',
      learnerActionRequired: true,
    });
  }

  for (const topic of context.supportPriorities) {
    if (steps.length >= SUMMARY_LIMITS.nextSteps) break;
    steps.push({
      type: topic.supportNeed === SUPPORT_NEEDS.reinforceFoundation ? 'review_resource' : 'attempt_scenario',
      topicId: topic.topicId,
      reason: `Based on available learning records, ${topic.topicLabel} may benefit from ${topic.supportNeed === SUPPORT_NEEDS.reinforceFoundation ? 'foundation review' : 'guided practice'}.`,
      targetId: null,
      learnerActionRequired: true,
    });
  }

  if (steps.length < SUMMARY_LIMITS.nextSteps && profile && profileCompleteness(profile) !== 'complete') {
    steps.push({
      type: 'update_learning_preferences',
      topicId: null,
      reason: 'Updating learning preferences can help CyberGuard choose clearer explanation formats.',
      targetId: 'profile',
      learnerActionRequired: true,
    });
  }

  if (!steps.length) {
    steps.push({
      type: 'continue_current_path',
      topicId: null,
      reason: 'Continue with the current recommended learning path.',
      targetId: null,
      learnerActionRequired: true,
    });
  }

  return steps.slice(0, SUMMARY_LIMITS.nextSteps);
}

function responseGuidance(profile, signalQuality) {
  const learningStyle = String(profile?.learning_style || '').trim();
  const helpTopics = parseJsonArray(profile?.help_topics);
  const preferredFormats = [];
  if (learningStyle) preferredFormats.push(learningStyle);
  if (helpTopics.length) preferredFormats.push('practical_examples');
  if (!preferredFormats.length) preferredFormats.push('clear_steps');

  return {
    explanationDepth: signalQuality.overall === 'low' ? 'standard' : 'step_by_step',
    tone: 'supportive',
    exampleStyle: helpTopics.length ? 'practical scenario examples' : 'simple examples',
    pacing: signalQuality.overall === 'low' ? 'one concept at a time' : 'normal',
    preferredFormats: Array.from(new Set(preferredFormats)).slice(0, 3),
    avoidAssumptions: [
      'Do not infer intelligence, personality, mental health, disability, or protected attributes.',
      'Do not present topic support needs as permanent ability.',
      'Acknowledge limited data when evidence quality is low.',
    ],
  };
}

function overallSignalQuality({ assessmentAvailable, progressAvailable, scenarioHistoryAvailable, recommendationDataAvailable }) {
  const count = [assessmentAvailable, progressAvailable, scenarioHistoryAvailable, recommendationDataAvailable].filter(Boolean).length;
  if (assessmentAvailable && progressAvailable && scenarioHistoryAvailable) return 'high';
  if (count >= 2) return 'medium';
  return 'low';
}

function buildAdaptiveContext({ learnerId, locale = 'en', data = {}, now = new Date() }) {
  const generatedAt = now.toISOString();
  const normalizedLocale = normalizeLocale(locale || data.profile?.preferred_language || 'en');
  const assessmentByTopic = mapByTopic(data.assessmentTopicScores || [], 'percentage');
  const progressByTopic = mapByTopic(data.topicProgress || [], 'mastery_percentage');
  const scenarioBuckets = scenariosByTopic(data.scenarios || []);
  const recommendationTopic = data.recommendation?.topic_code || null;
  const warnings = [];
  if (detectUnsupportedTopics(data)) warnings.push('unsupported_topic_values_omitted');

  const topicSignals = ADAPTIVE_TOPICS.map(topic => {
    const topicScenarios = scenarioBuckets.get(topic.topicId) || [];
    const scenarioPercent = average(topicScenarios.map(item => item.percentage));
    const latestScenarioDate = latestDate(topicScenarios.map(item => item.completed_at));
    const assessmentScore = assessmentByTopic.get(topic.topicId) ?? null;
    const masteryScore = progressByTopic.get(topic.topicId) ?? null;
    const assessmentLevel = levelFromPercentage(assessmentScore);
    const mastery = masteryBand(masteryScore);
    const scenario = scenarioBand(scenarioPercent, topicScenarios[0]?.result_level);
    const recentActivity = freshness(now, latestScenarioDate || data.assessment?.completed_at);
    const hasAssessment = assessmentScore !== null;
    const hasProgress = masteryScore !== null;
    const hasScenario = scenarioPercent !== null;
    const hasRecommendation = recommendationTopic === topic.topicId;
    const hasAnySignal = hasAssessment || hasProgress || hasScenario || hasRecommendation;
    const conflict = hasConflict([assessmentScore, masteryScore, scenarioPercent]);
    const supportNeed = supportNeedFor({
      assessmentLevel,
      mastery,
      scenario,
      hasAnySignal,
      hasRecommendation,
      conflict,
    });

    return {
      topicId: topic.topicId,
      topicLabel: topic.topicLabel,
      assessmentLevel,
      masteryScore,
      masteryBand: mastery,
      scenarioPerformance: scenario,
      recentActivity,
      recommendationPriority: hasRecommendation ? 'active' : 'none',
      confidence: confidenceFor({
        hasAssessment,
        hasProgress,
        hasScenario,
        hasRecommendation,
        signalConflict: conflict,
        recentActivity,
      }),
      supportNeed,
      reasons: buildReasons({
        assessmentLevel,
        mastery,
        scenario,
        recentActivity,
        hasRecommendation,
        conflict,
        hasAnySignal,
      }),
    };
  });

  const signalQuality = {
    overall: overallSignalQuality({
      assessmentAvailable: Boolean(data.assessment),
      progressAvailable: Boolean((data.topicProgress || []).length),
      scenarioHistoryAvailable: Boolean((data.scenarios || []).length),
      recommendationDataAvailable: Boolean(data.recommendation),
    }),
    assessmentAvailable: Boolean(data.assessment),
    progressAvailable: Boolean((data.topicProgress || []).length),
    scenarioHistoryAvailable: Boolean((data.scenarios || []).length),
    recommendationDataAvailable: Boolean(data.recommendation),
    profileCompleteness: profileCompleteness(data.profile),
    warnings,
  };

  const context = {
    learnerId,
    generatedAt,
    locale: normalizedLocale,
    educationLevel: data.profile?.education_level || null,
    learningStyle: data.profile?.learning_style || null,
    preferredHelpTopics: parseJsonArray(data.profile?.help_topics),
    signalQuality,
    topicSignals,
    strengths: topicSignals
      .filter(topic => topic.supportNeed === SUPPORT_NEEDS.readyForChallenge || (topic.masteryBand === 'strong' && topic.confidence !== 'unknown'))
      .sort((a, b) => scoreStrength(a) - scoreStrength(b))
      .slice(0, SUMMARY_LIMITS.strengths)
      .map(topic => ({ topicId: topic.topicId, topicLabel: topic.topicLabel, confidence: topic.confidence, reasons: topic.reasons.slice(0, 2) })),
    supportPriorities: topicSignals
      .filter(topic => [SUPPORT_NEEDS.reinforceFoundation, SUPPORT_NEEDS.guidedPractice].includes(topic.supportNeed))
      .sort((a, b) => scoreSupportPriority(a) - scoreSupportPriority(b))
      .slice(0, SUMMARY_LIMITS.supportPriorities)
      .map(topic => ({ topicId: topic.topicId, topicLabel: topic.topicLabel, supportNeed: topic.supportNeed, confidence: topic.confidence, reasons: topic.reasons.slice(0, 3) })),
    responseGuidance: null,
    safetyBoundary: {
      readOnly: true,
      noAutomaticProgressChange: true,
      learnerControlsNextAction: true,
    },
  };
  context.responseGuidance = responseGuidance(data.profile, signalQuality);
  context.recommendedNextSteps = buildRecommendedNextSteps({ context, profile: data.profile });
  return context;
}

module.exports = {
  buildAdaptiveContext,
  freshness,
  levelFromPercentage,
  masteryBand,
  parseJsonArray,
  scenarioBand,
};

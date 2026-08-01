const assert = require('node:assert/strict');

const {
  ADAPTIVE_TOPICS,
  buildAdaptiveContext,
  buildAdaptiveModelSummary,
  createAdaptiveLearningService,
  shouldUseAdaptiveLearning,
} = require('../src/adaptive/adaptiveLearning.service');

const FIXED_NOW = new Date('2026-07-18T08:00:00.000Z');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function baseData(overrides = {}) {
  return {
    profile: {
      education_level: 'form_3',
      preferred_language: 'en',
      familiarity_level: 'some',
      help_topics: JSON.stringify(['passwords', 'privacy']),
      learning_style: 'checklist',
    },
    assessment: {
      id: 11,
      percentage: 72,
      measured_level: 'intermediate',
      completed_at: '2026-07-10T08:00:00.000Z',
    },
    assessmentTopicScores: [
      { topic_code: 'phishing_and_scams', percentage: 82 },
      { topic_code: 'password_and_account_security', percentage: 38 },
      { topic_code: 'privacy_and_personal_information', percentage: 74 },
      { topic_code: 'misinformation_and_deepfakes', percentage: 61 },
    ],
    topicProgress: [
      { topic_code: 'phishing_and_scams', mastery_percentage: 86, current_level: 'advanced', activity_count: 4 },
      { topic_code: 'password_and_account_security', mastery_percentage: 35, current_level: 'beginner', activity_count: 2 },
      { topic_code: 'privacy_and_personal_information', mastery_percentage: 70, current_level: 'intermediate', activity_count: 2 },
      { topic_code: 'misinformation_and_deepfakes', mastery_percentage: 58, current_level: 'developing', activity_count: 1 },
    ],
    scenarios: [
      { topic_code: 'phishing_and_scams', percentage: 88, result_level: 'strong', completed_at: '2026-07-16T08:00:00.000Z' },
      { topic_code: 'password_and_account_security', percentage: 42, result_level: 'developing', completed_at: '2026-07-17T08:00:00.000Z' },
      { topic_code: 'privacy_and_personal_information', percentage: 30, result_level: 'needs_review', completed_at: '2026-07-12T08:00:00.000Z' },
    ],
    recommendation: {
      topic_code: 'password_and_account_security',
      recommended_level: 'beginner',
      reason_code: 'weak_topic',
    },
    ...overrides,
  };
}

function assertNoSensitiveFields(value) {
  const text = JSON.stringify(value);
  for (const forbidden of [
    'email',
    'password_hash',
    'session',
    'rawAssessmentAnswers',
    'rawScenarioDecisions',
    'selected_option_key',
    'admin',
    'OPENAI_API_KEY',
    'GEMINI_API_KEY',
    'ILMU_API_KEY',
    'execute_sql',
    'mentalState',
    'disabilityStatus',
    'high-risk user',
  ]) {
    assert.equal(text.includes(forbidden), false, `adaptive output should not include ${forbidden}`);
  }
}

async function runPureRuleTests() {
  const context = buildAdaptiveContext({
    learnerId: 42,
    locale: 'en',
    data: baseData(),
    now: FIXED_NOW,
  });

  assert.equal(context.learnerId, 42);
  assert.equal(context.locale, 'en');
  assert.equal(context.educationLevel, 'form_3');
  assert.equal(context.learningStyle, 'checklist');
  assert.deepEqual(context.preferredHelpTopics, ['passwords', 'privacy']);
  assert.equal(context.safetyBoundary.readOnly, true);
  assert.equal(context.safetyBoundary.noAutomaticProgressChange, true);
  assert.equal(context.safetyBoundary.learnerControlsNextAction, true);
  assert.equal(context.signalQuality.assessmentAvailable, true);
  assert.equal(context.signalQuality.progressAvailable, true);
  assert.equal(context.signalQuality.scenarioHistoryAvailable, true);
  assert.equal(context.signalQuality.recommendationDataAvailable, true);
  assert.equal(context.signalQuality.profileCompleteness, 'complete');
  assert.ok(['high', 'medium'].includes(context.signalQuality.overall));
  assert.equal(context.topicSignals.length, ADAPTIVE_TOPICS.length);

  const phishing = context.topicSignals.find(topic => topic.topicId === 'phishing_and_scams');
  assert.equal(phishing.masteryBand, 'strong');
  assert.equal(phishing.scenarioPerformance, 'strong');
  assert.equal(phishing.supportNeed, 'ready_for_challenge');
  assert.equal(context.strengths[0].topicId, 'phishing_and_scams');

  const password = context.topicSignals.find(topic => topic.topicId === 'password_and_account_security');
  assert.equal(password.assessmentLevel, 'beginner');
  assert.equal(password.masteryBand, 'foundation');
  assert.equal(password.scenarioPerformance, 'developing');
  assert.equal(password.recommendationPriority, 'active');
  assert.equal(password.supportNeed, 'reinforce_foundation');
  assert.ok(password.reasons.some(reason => reason.code === 'ACTIVE_RECOMMENDATION'));
  assert.equal(context.supportPriorities[0].topicId, 'password_and_account_security');

  const privacy = context.topicSignals.find(topic => topic.topicId === 'privacy_and_personal_information');
  assert.equal(privacy.confidence, 'medium');
  assert.equal(privacy.supportNeed, 'guided_practice');
  assert.ok(privacy.reasons.some(reason => reason.code === 'CONFLICTING_SIGNALS'));

  assert.ok(context.recommendedNextSteps.length <= 3);
  assert.ok(context.recommendedNextSteps.every(step => step.learnerActionRequired === true));
  assert.equal(context.responseGuidance.tone, 'supportive');
  assert.ok(context.responseGuidance.preferredFormats.includes('checklist'));
  assertNoSensitiveFields(context);

  const repeated = buildAdaptiveContext({
    learnerId: 42,
    locale: 'en',
    data: clone(baseData()),
    now: FIXED_NOW,
  });
  assert.deepEqual(repeated, context);

  const summary = buildAdaptiveModelSummary(context);
  assert.ok(summary.includes('Adaptive Learning Summary'));
  assert.ok(summary.includes('Evidence quality'));
  assert.ok(summary.length <= 1800);
  assertNoSensitiveFields(summary);
}

async function runMissingAndStaleTests() {
  const missing = buildAdaptiveContext({
    learnerId: 7,
    locale: 'ms',
    data: {
      profile: { preferred_language: 'ms' },
      assessment: null,
      assessmentTopicScores: [],
      topicProgress: [],
      scenarios: [],
      recommendation: null,
    },
    now: FIXED_NOW,
  });
  assert.equal(missing.locale, 'ms');
  assert.equal(missing.signalQuality.overall, 'low');
  assert.equal(missing.signalQuality.assessmentAvailable, false);
  assert.equal(missing.signalQuality.profileCompleteness, 'minimal');
  assert.ok(missing.topicSignals.every(topic => topic.supportNeed === 'insufficient_data'));
  assert.equal(missing.recommendedNextSteps[0].type, 'complete_initial_assessment');

  const stale = buildAdaptiveContext({
    learnerId: 9,
    locale: 'zh-CN',
    data: baseData({
      scenarios: [
        { topic_code: 'phishing_and_scams', percentage: 90, result_level: 'strong', completed_at: '2026-04-01T08:00:00.000Z' },
      ],
    }),
    now: FIXED_NOW,
  });
  const phishing = stale.topicSignals.find(topic => topic.topicId === 'phishing_and_scams');
  assert.equal(phishing.recentActivity, 'stale');
  assert.ok(phishing.reasons.some(reason => reason.code === 'NO_RECENT_ACTIVITY'));

  const unknownTopic = buildAdaptiveContext({
    learnerId: 12,
    locale: 'en',
    data: baseData({
      assessmentTopicScores: [{ topic_code: 'unknown_topic', percentage: 5 }],
      topicProgress: [{ topic_code: 'unknown_topic', mastery_percentage: 5 }],
      scenarios: [{ topic_code: 'unknown_topic', percentage: 5, completed_at: '2026-07-17T08:00:00.000Z' }],
    }),
    now: FIXED_NOW,
  });
  assert.equal(unknownTopic.topicSignals.length, ADAPTIVE_TOPICS.length);
  assert.equal(unknownTopic.signalQuality.warnings.includes('unsupported_topic_values_omitted'), true);
}

async function runServiceTests() {
  const calls = [];
  const writes = [];
  const repository = {
    async loadLearnerContextData(userId) {
      calls.push(userId);
      return baseData();
    },
    async updateProgress() {
      writes.push('updateProgress');
    },
  };
  const service = createAdaptiveLearningService({ repository, now: () => FIXED_NOW });
  await assert.rejects(
    () => service.getAdaptiveContext({ userId: null, locale: 'en' }),
    error => error.code === 'ADAPTIVE_AUTH_REQUIRED'
  );
  const context = await service.getAdaptiveContext({ userId: 55, locale: 'en' });
  assert.equal(calls.length, 1);
  assert.deepEqual(calls, [55]);
  assert.deepEqual(writes, []);
  assert.equal(context.learnerId, 55);

  assert.equal(shouldUseAdaptiveLearning('What should I study next?'), true);
  assert.equal(shouldUseAdaptiveLearning('Which topic should I improve?'), true);
  assert.equal(shouldUseAdaptiveLearning('Am I improving?'), true);
  assert.equal(shouldUseAdaptiveLearning('Recommend a scenario for me.'), true);
  assert.equal(shouldUseAdaptiveLearning('What is phishing?'), false);
  assert.equal(shouldUseAdaptiveLearning('How can I steal someone password?'), false);
}

async function run() {
  await runPureRuleTests();
  await runMissingAndStaleTests();
  await runServiceTests();
  console.log('Adaptive Learning Intelligence verification passed.');
}

run().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});

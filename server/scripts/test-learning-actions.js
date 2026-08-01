const assert = require('node:assert/strict');
const { buildLearningActions } = require('../src/ai/ai.learningActions');

const resources = [
  { id: 1, slug: 'phishing', category_code: 'Scams', title: 'Phishing' },
  { id: 2, slug: 'password-security', category_code: 'Passwords', title: 'Password Security' },
];

const scenarios = [
  { id: 10, slug: 'phishing-check', topic_code: 'phishing_and_scams', completed_count: 0, title: 'Spot a Phishing Message' },
  { id: 11, slug: 'password-check', topic_code: 'password_and_account_security', completed_count: 0, title: 'Secure Your Password' },
  { id: 12, slug: 'phishing-done', topic_code: 'phishing_and_scams', completed_count: 1, title: 'Completed Phishing Practice' },
];

const learnerContext = {
  currentRecommendation: {
    topicCode: 'password_and_account_security',
  },
  primaryFocus: {
    topicCode: 'password_and_account_security',
  },
  learnerLevel: {
    confidence: 'Medium',
  },
};

function actionTypes(actions) {
  return actions.map(action => action.type);
}

function run() {
  let actions = buildLearningActions({
    learnerContext,
    resources,
    scenarios,
    query: 'Give me a 15-minute phishing practice plan.',
    learningRoute: {
      steps: [
        {
          type: 'resource',
          title: 'Phishing',
          reason: 'Start with a reviewed lesson.',
          internalTarget: { page: 'resources', resourceSlug: 'phishing', resourceId: 1 },
        },
        {
          type: 'scenario',
          title: 'Spot a Phishing Message',
          reason: 'Practise safely.',
          completed: false,
          internalTarget: { page: 'scenarios', scenarioSlug: 'phishing-check', scenarioId: 10 },
        },
        {
          type: 'progress',
          title: 'Review Progress',
          reason: 'Check progress.',
          internalTarget: { page: 'progress', sectionId: 'progress-recommendation' },
        },
      ],
    },
  });
  assert.deepEqual(actionTypes(actions), ['resource', 'scenario', 'progress']);
  assert.equal(actions.length, 3);
  assert.equal(actions[0].target.resourceSlug, 'phishing');
  assert.equal(actions[1].target.scenarioSlug, 'phishing-check');
  assert.equal(actions[2].target.page, 'progress');

  actions = buildLearningActions({
    learnerContext,
    resources,
    scenarios,
    query: 'What is phishing?',
    ragSources: [
      {
        title: 'Phishing',
        internalTarget: { page: 'resources', resourceSlug: 'phishing', resourceId: 1 },
      },
    ],
  });
  assert.deepEqual(actionTypes(actions), ['scenario', 'progress', 'resources']);
  assert.equal(actions[0].target.scenarioSlug, 'phishing-check');
  assert.notEqual(actions[0].type, 'resource');
  assert.equal(actions.length <= 3, true);

  actions = buildLearningActions({
    learnerContext,
    resources,
    scenarios,
    query: 'What should I study next?',
    ragSources: [
      {
        title: 'Phishing',
        internalTarget: { page: 'resources', resourceSlug: 'phishing', resourceId: 1 },
      },
    ],
  });
  assert.equal(actions[0].type, 'scenario');
  assert.equal(actions[0].target.scenarioSlug, 'password-check');
  assert.equal(actions[1].type, 'progress');
  assert.equal(actions.some(action => action.target?.scenarioSlug === 'phishing-done'), false);

  actions = buildLearningActions({
    learnerContext: {
      currentRecommendation: { topicCode: 'phishing_and_scams' },
      learnerLevel: { confidence: 'Medium' },
    },
    resources,
    scenarios: scenarios.map(scenario => (
      scenario.topic_code === 'phishing_and_scams'
        ? { ...scenario, completed_count: 1 }
        : scenario
    )),
    query: 'I completed it, what should I do next?',
  });
  assert.equal(actions.some(action => action.target?.scenarioSlug === 'phishing-check'), false);
  assert.deepEqual(actionTypes(actions), ['scenario', 'progress', 'resource']);
  assert.equal(actions[0].target.scenarioSlug, 'password-check');
  assert.equal(actions.length <= 3, true);

  console.log('Learning action selection verification passed.');
}

run();

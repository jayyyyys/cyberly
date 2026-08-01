const MAX_ACTIONS = 3;
const { isCompletedScenario, selectScenarioCandidates } = require('../scenario/scenarioRecommendation');

const TOPIC_RESOURCE_CATEGORIES = {
  phishing_and_scams: ['Scams'],
  password_and_account_security: ['Passwords'],
  privacy_and_personal_information: ['Privacy'],
  misinformation_and_deepfakes: ['Misinformation', 'AI & Technology'],
};

const LABEL_KEYS = {
  resource: 'chat.actions.startResource',
  scenario: 'chat.actions.startScenario',
  progress: 'chat.actions.viewProgress',
  assessment: 'chat.actions.startAssessment',
  resources: 'chat.actions.openResources',
  scenarios: 'chat.actions.openScenarios',
};

const CATEGORY_TOPIC_CODES = Object.entries(TOPIC_RESOURCE_CATEGORIES).reduce((acc, [topicCode, categories]) => {
  categories.forEach(category => {
    acc[category] = topicCode;
  });
  return acc;
}, {});

function firstDefined(...values) {
  return values.find(value => value !== undefined && value !== null && value !== '');
}

function candidateTopic(learnerContext = {}) {
  return firstDefined(
    learnerContext.currentRecommendation?.topicCode,
    learnerContext.primaryFocus?.topicCode
  ) || null;
}

function normalizeText(value = '') {
  return String(value || '').trim().toLowerCase();
}

function classifyQueryIntent(query = '') {
  const text = normalizeText(query);
  if (!text) return 'general';
  if (
    /\b(completed|finished|done)\b.{0,40}\b(next|now|after|do)\b/i.test(text) ||
    /完成.{0,12}(然后|下一|接下来|之后)/.test(text) ||
    /(sudah|telah).{0,30}(selesai|habis).{0,30}(selepas|seterus|apa)/i.test(text)
  ) {
    return 'after_completion';
  }
  if (
    /\b(what should i|what do i|what can i).{0,30}\b(learn|study|do).{0,20}\b(next|now)\b/i.test(text) ||
    /应该.{0,12}(学|学习|做).{0,12}(什么|哪)/.test(text) ||
    /(patut|perlu).{0,30}(belajar|buat).{0,20}(dahulu|selepas|seterus|apa)/i.test(text)
  ) {
    return 'next_step';
  }
  if (
    /\b(what is|what are|explain|define|tell me about)\b/i.test(text) ||
    /什么是|解釋|解释/.test(text) ||
    /\b(apakah|apa itu|terangkan|jelaskan)\b/i.test(text)
  ) {
    return 'explanation';
  }
  return 'general';
}

function inferTopicFromText(value = '') {
  const text = normalizeText(value);
  if (/phishing|scam|penipuan|pancingan|网络钓鱼|網絡釣魚|诈骗|詐騙/.test(text)) return 'phishing_and_scams';
  if (/password|kata laluan|密码|密碼|otp|2fa|mfa|two[- ]factor|dua faktor/.test(text)) return 'password_and_account_security';
  if (/privacy|personal data|privasi|data peribadi|隐私|私隐|个人资料|個人資料/.test(text)) return 'privacy_and_personal_information';
  if (/misinformation|fake news|deepfake|maklumat palsu|berita palsu|虚假|假新闻|深度伪造/.test(text)) return 'misinformation_and_deepfakes';
  return null;
}

function topicFromRagSources(ragSources = [], resources = []) {
  for (const source of ragSources || []) {
    const target = source?.internalTarget || {};
    const match = resources.find(resource => (
      (target.resourceSlug && resource.slug === target.resourceSlug) ||
      (target.resourceId && Number(resource.id) === Number(target.resourceId))
    ));
    if (match?.category_code && CATEGORY_TOPIC_CODES[match.category_code]) {
      return CATEGORY_TOPIC_CODES[match.category_code];
    }
    const inferred = inferTopicFromText(`${source?.title || ''} ${source?.snippet || ''}`);
    if (inferred) return inferred;
  }
  return null;
}

function queryTopic(query, ragSources, resources) {
  return topicFromRagSources(ragSources, resources) || inferTopicFromText(query);
}

function pickResource(resources, topicCode) {
  const categories = TOPIC_RESOURCE_CATEGORIES[topicCode] || [];
  for (const category of categories) {
    const match = resources.find(resource => resource.category_code === category);
    if (match) return match;
  }
  return null;
}

function pickScenario(scenarios, topicCode, recommendedLevel = null) {
  const [scenario] = selectScenarioCandidates({
    scenarios,
    topicCode,
    recommendedLevel,
    limit: 1,
  });
  if (!scenario || isCompletedScenario(scenario)) return null;
  return scenario;
}

function sanitizeTitle(value) {
  if (!value) return null;
  const text = String(value).trim();
  return text ? text.slice(0, 255) : null;
}

function createResourceAction(resource) {
  if (!resource) {
    return {
      type: 'resources',
      labelKey: LABEL_KEYS.resources,
      title: null,
      description: 'Explore cybersecurity lessons at your own pace.',
      target: { page: 'resources' },
    };
  }

  return {
    type: 'resource',
    labelKey: LABEL_KEYS.resource,
    title: sanitizeTitle(resource.title),
    description: 'A short lesson for your recommended focus topic.',
    target: {
      page: 'resources',
      resourceId: Number(resource.id),
      resourceSlug: resource.slug,
    },
  };
}

function createScenarioAction(scenario) {
  if (!scenario) {
    return {
      type: 'scenarios',
      labelKey: LABEL_KEYS.scenarios,
      title: null,
      description: 'Practise with safe Cyberly scenarios.',
      target: { page: 'scenarios' },
    };
  }

  return {
    type: 'scenario',
    labelKey: LABEL_KEYS.scenario,
    title: sanitizeTitle(scenario.title),
    description: 'Practise this topic in a safe scenario.',
    target: {
      page: 'scenarios',
      scenarioId: Number(scenario.id),
      scenarioSlug: scenario.slug,
    },
  };
}

function createProgressAction(hasRecommendation) {
  return {
    type: 'progress',
    labelKey: LABEL_KEYS.progress,
    title: null,
    description: hasRecommendation
      ? 'Review your current recommendation and progress.'
      : 'Review your current learning progress.',
    target: {
      page: 'progress',
      sectionId: hasRecommendation ? 'progress-recommendation' : 'progress-snapshot',
    },
  };
}

function createAssessmentAction() {
  return {
    type: 'assessment',
    labelKey: LABEL_KEYS.assessment,
    title: null,
    description: 'Complete the assessment to unlock measured recommendations.',
    target: { page: 'assessment' },
  };
}

function createActionFromRouteStep(step) {
  if (!step?.internalTarget?.page) return null;
  if (step.type === 'resource' && step.internalTarget.page === 'resources') {
    return {
      type: 'resource',
      labelKey: LABEL_KEYS.resource,
      title: sanitizeTitle(step.title),
      description: step.reason || 'Open this reviewed Cyberly lesson.',
      target: step.internalTarget,
    };
  }
  if (step.type === 'scenario' && step.internalTarget.page === 'scenarios') {
    return {
      type: 'scenario',
      labelKey: LABEL_KEYS.scenario,
      title: sanitizeTitle(step.title),
      description: step.reason || 'Practise with this safe Cyberly scenario.',
      target: step.internalTarget,
    };
  }
  if (step.type === 'progress' && step.internalTarget.page === 'progress') {
    return {
      type: 'progress',
      labelKey: LABEL_KEYS.progress,
      title: sanitizeTitle(step.title),
      description: step.reason || 'Review your progress.',
      target: step.internalTarget,
    };
  }
  if (step.type === 'assessment' && step.internalTarget.page === 'assessment') {
    return {
      type: 'assessment',
      labelKey: LABEL_KEYS.assessment,
      title: sanitizeTitle(step.title),
      description: step.reason || 'Complete the assessment.',
      target: step.internalTarget,
    };
  }
  return null;
}

function dedupeAndCap(actions) {
  const seen = new Set();
  const result = [];
  for (const action of actions) {
    const key = `${action.type}:${JSON.stringify(action.target)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ ...action, displayOrder: result.length + 1 });
    if (result.length >= MAX_ACTIONS) break;
  }
  return result;
}

function hasEvidence(learnerContext = {}) {
  return Boolean(
    learnerContext.currentRecommendation ||
    learnerContext.primaryFocus ||
    learnerContext.secondaryFocus?.length ||
    learnerContext.learnerLevel?.confidence !== 'Low'
  );
}

function buildLearningActions({ learnerContext = {}, resources = [], scenarios = [], query = '', ragSources = [], learningRoute = null } = {}) {
  if (learningRoute?.steps?.length) {
    const routeActions = learningRoute.steps
      .map(createActionFromRouteStep)
      .filter(Boolean);
    if (routeActions.length) return dedupeAndCap(routeActions);
  }

  const intent = classifyQueryIntent(query);
  const topicOverride = intent === 'explanation' ? queryTopic(query, ragSources, resources) : null;
  const topicCode = topicOverride || candidateTopic(learnerContext);
  const hasRecommendation = Boolean(learnerContext.currentRecommendation);
  const recommendedLevel = firstDefined(
    learnerContext.currentRecommendation?.recommendedLevel,
    learnerContext.currentRecommendation?.level,
    learnerContext.learnerLevel?.recommendedLevel
  );

  if (intent === 'explanation' && topicCode) {
    return dedupeAndCap([
      createScenarioAction(pickScenario(scenarios, topicCode, recommendedLevel)),
      createProgressAction(hasRecommendation),
      createResourceAction(null),
    ]);
  }

  if ((intent === 'next_step' || intent === 'after_completion') && topicCode) {
    return dedupeAndCap([
      createScenarioAction(pickScenario(scenarios, topicCode, recommendedLevel)),
      createProgressAction(hasRecommendation),
      createResourceAction(pickResource(resources, topicCode)),
    ]);
  }

  if (topicCode) {
    return dedupeAndCap([
      createResourceAction(pickResource(resources, topicCode)),
      createScenarioAction(pickScenario(scenarios, topicCode, recommendedLevel)),
      createProgressAction(hasRecommendation),
    ]);
  }

  return dedupeAndCap([
    hasEvidence(learnerContext) ? createProgressAction(false) : createAssessmentAction(),
    createResourceAction(null),
    createScenarioAction(null),
  ]);
}

module.exports = {
  TOPIC_RESOURCE_CATEGORIES,
  buildLearningActions,
  classifyQueryIntent,
  createActionFromRouteStep,
};

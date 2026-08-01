const { normalizeLocale } = require('../i18n/locale');
const { createAiRepository } = require('../ai/ai.repository');
const { buildLearnerContext } = require('../ai/ai.learnerContext');
const { TOPIC_RESOURCE_CATEGORIES } = require('../ai/ai.learningActions');
const {
  mapLearnerContext,
  mapRecommendation,
  mapResourceResult,
  mapRouteStep,
  mapScenarioResult,
} = require('./agent.mapper');

const CATEGORY_TOPIC_CODES = Object.entries(TOPIC_RESOURCE_CATEGORIES).reduce((acc, [topicCode, categories]) => {
  categories.forEach(category => {
    acc[category] = topicCode;
  });
  return acc;
}, {});

function topicFromCategory(categoryCode) {
  return CATEGORY_TOPIC_CODES[categoryCode] || null;
}

function categoryFromTopic(topicCode) {
  return TOPIC_RESOURCE_CATEGORIES[topicCode]?.[0] || null;
}

function createAgentTools({ pool, ragService }) {
  const aiRepository = createAiRepository(pool);

  async function getLearnerContext({ userId, input, locale }) {
    const resolvedLocale = normalizeLocale(input.locale || locale);
    const context = buildLearnerContext({
      locale: resolvedLocale,
      data: await aiRepository.loadLearnerContextData(userId),
    });
    return mapLearnerContext(context);
  }

  async function getCurrentRecommendation({ userId, input, locale }) {
    const resolvedLocale = normalizeLocale(input.locale || locale);
    const context = await getLearnerContext({ userId, input: { locale: resolvedLocale }, locale: resolvedLocale });
    return mapRecommendation(context.currentRecommendation);
  }

  async function searchLearningResources({ input, locale }) {
    if (!ragService) return { items: [] };
    const resolvedLocale = normalizeLocale(input.locale || locale);
    const chunks = await ragService.retrieveReviewedChunks({
      query: input.query,
      locale: resolvedLocale,
      topicCode: input.topicCode || topicFromCategory(input.categoryCode),
      categoryCode: input.categoryCode,
      limit: input.limit,
    });
    const items = chunks.map(mapResourceResult).filter(Boolean);
    return { items };
  }

  async function getRelatedScenarios({ userId, input, locale }) {
    const resolvedLocale = normalizeLocale(input.locale || locale);
    const topicCode = input.topicCode || topicFromCategory(input.categoryCode);
    const { scenarios } = await aiRepository.loadLearningActionData(userId, resolvedLocale);
    const items = scenarios
      .filter(scenario => !topicCode || scenario.topic_code === topicCode)
      .map(mapScenarioResult)
      .filter(Boolean)
      .filter(scenario => !input.excludeCompleted || scenario.completed === false)
      .slice(0, input.limit);
    return { items };
  }

  async function getCompletedScenarios({ userId, input, locale }) {
    const resolvedLocale = normalizeLocale(input.locale || locale);
    const topicCode = input.topicCode || topicFromCategory(input.categoryCode);
    const { scenarios } = await aiRepository.loadLearningActionData(userId, resolvedLocale);
    const completed = scenarios
      .filter(scenario => !topicCode || scenario.topic_code === topicCode)
      .map(mapScenarioResult)
      .filter(Boolean)
      .filter(scenario => scenario.completed === true);
    return {
      completedCount: completed.length,
      items: completed.slice(0, 8).map(item => ({
        title: item.title,
        topicCode: item.topicCode,
        difficulty: item.difficulty,
        internalTarget: item.internalTarget,
      })),
    };
  }

  async function buildLearningRoute({ userId, input, locale }) {
    const resolvedLocale = normalizeLocale(input.locale || locale);
    const learnerContext = await getLearnerContext({ userId, input: { locale: resolvedLocale }, locale: resolvedLocale });
    const topicCode = input.topicCode || topicFromCategory(input.categoryCode) || learnerContext.currentRecommendation?.topicCode || learnerContext.primaryFocus?.topicCode || null;
    const resources = await searchLearningResources({
      userId,
      input: {
        query: input.goal,
        locale: resolvedLocale,
        topicCode,
        categoryCode: input.categoryCode || categoryFromTopic(topicCode),
        limit: 2,
      },
      locale: resolvedLocale,
    });
    const scenarios = await getRelatedScenarios({
      userId,
      input: {
        topicCode,
        categoryCode: input.categoryCode,
        locale: resolvedLocale,
        excludeCompleted: true,
        limit: 2,
      },
      locale: resolvedLocale,
    });

    const steps = [];
    let resource = resources.items[0];
    if (!resource && topicCode) {
      const { resources: publishedResources } = await aiRepository.loadLearningActionData(userId, resolvedLocale);
      const categoryCode = input.categoryCode || categoryFromTopic(topicCode);
      const match = publishedResources.find(item => item.category_code === categoryCode);
      resource = match ? {
        title: match.title,
        summary: match.summary,
        categoryCode: match.category_code,
        internalTarget: {
          page: 'resources',
          resourceId: Number(match.id),
          resourceSlug: match.slug,
        },
      } : null;
    }
    const scenario = scenarios.items[0];
    if (resource) {
      steps.push({
        type: 'resource',
        title: resource.title,
        reason: 'Start with a reviewed Cyberly lesson for this goal.',
        internalTarget: resource.internalTarget,
      });
    }
    if (scenario) {
      steps.push({
        type: 'scenario',
        title: scenario.title,
        reason: 'Practise the topic in a safe scenario.',
        completed: false,
        internalTarget: scenario.internalTarget,
      });
    }
    if (!resource && !scenario) {
      steps.push({
        type: 'assessment',
        title: 'Complete the assessment',
        reason: 'Use the assessment to unlock a clearer starting point.',
        internalTarget: { page: 'assessment' },
      });
    }
    steps.push({
      type: 'progress',
      title: 'Review your progress',
      reason: 'Check what changed and choose the next step.',
      internalTarget: { page: 'progress', sectionId: 'progress-recommendation' },
    });

    return {
      title: topicCode ? 'CyberGuard learning route' : 'CyberGuard starter route',
      summary: input.timeBudgetMinutes
        ? `A safe ${input.timeBudgetMinutes}-minute route based on available Cyberly content.`
        : 'A safe route based on available Cyberly content.',
      locale: resolvedLocale,
      topicCode,
      timeBudgetMinutes: input.timeBudgetMinutes || 15,
      steps: steps.map(mapRouteStep).filter(Boolean).slice(0, 4),
      safetyNote: 'This route is read-only and does not start activities or change progress automatically.',
      requiresConfirmation: false,
    };
  }

  return {
    build_learning_route: buildLearningRoute,
    get_completed_scenarios: getCompletedScenarios,
    get_current_recommendation: getCurrentRecommendation,
    get_learner_context: getLearnerContext,
    get_related_scenarios: getRelatedScenarios,
    search_learning_resources: searchLearningResources,
  };
}

module.exports = {
  createAgentTools,
};

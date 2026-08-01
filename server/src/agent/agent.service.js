const { normalizeLocale } = require('../i18n/locale');
const { createAgentTools } = require('./agent.tools');
const { getToolDefinition, listToolMetadata } = require('./agent.registry');

function createAgentService({ pool, ragService }) {
  const tools = createAgentTools({ pool, ragService });

  async function executeTool({ toolName, input = {}, userId, locale = 'en' }) {
    if (!userId) throw new Error('Authenticated user is required for agent tools.');
    const definition = getToolDefinition(toolName);
    const validatedInput = definition.validateInput(input || {});
    const implementation = tools[definition.name];
    if (!implementation) throw new Error(`Agent tool implementation missing: ${definition.name}`);
    const output = await implementation({
      userId,
      input: validatedInput,
      locale: normalizeLocale(validatedInput.locale || locale),
    });
    return {
      toolName: definition.name,
      readOnly: true,
      output,
    };
  }

  async function buildAgentLearningRoute({ userId, goal, locale = 'en', topicCode, categoryCode, timeBudgetMinutes }) {
    const result = await executeTool({
      toolName: 'build_learning_route',
      input: { goal, locale, topicCode, categoryCode, timeBudgetMinutes },
      userId,
      locale,
    });
    return result.output;
  }

  return {
    buildAgentLearningRoute,
    executeTool,
    listTools: listToolMetadata,
  };
}

module.exports = {
  createAgentService,
};

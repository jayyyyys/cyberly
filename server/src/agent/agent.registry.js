const { assertNoClientUserId, isAllowedToolName, isProhibitedToolName } = require('./agent.policy');

function assertString(input, key, { required = false, max = 400 } = {}) {
  const value = input[key];
  if ((value === undefined || value === null || value === '') && !required) return undefined;
  const text = String(value || '').trim();
  if (required && !text) throw new Error(`${key} is required.`);
  if (text.length > max) throw new Error(`${key} is too long.`);
  return text;
}

function assertBoolean(input, key) {
  if (input[key] === undefined) return undefined;
  return input[key] === true;
}

function assertLimit(input, key, fallback = 4, max = 8) {
  if (input[key] === undefined || input[key] === null) return fallback;
  const value = Number(input[key]);
  if (!Number.isInteger(value) || value < 1 || value > max) throw new Error(`${key} must be between 1 and ${max}.`);
  return value;
}

function normalizeCommonInput(input = {}) {
  assertNoClientUserId(input);
  return { ...input };
}

const TOOL_DEFINITIONS = [
  {
    name: 'get_learner_context',
    description: 'Return a compact safe learning summary for the authenticated learner.',
    readOnly: true,
    modelVisible: true,
    userVisible: false,
    riskLevel: 'low',
    validateInput(input = {}) {
      const safe = normalizeCommonInput(input);
      return { locale: assertString(safe, 'locale', { max: 10 }) };
    },
  },
  {
    name: 'get_current_recommendation',
    description: 'Return the current safe learning recommendation summary.',
    readOnly: true,
    modelVisible: true,
    userVisible: true,
    riskLevel: 'low',
    validateInput(input = {}) {
      const safe = normalizeCommonInput(input);
      return { locale: assertString(safe, 'locale', { max: 10 }) };
    },
  },
  {
    name: 'search_learning_resources',
    description: 'Search reviewed RAG-ready Cyberly Resource content.',
    readOnly: true,
    modelVisible: true,
    userVisible: true,
    riskLevel: 'low',
    validateInput(input = {}) {
      const safe = normalizeCommonInput(input);
      const query = assertString(safe, 'query', { required: true, max: 400 });
      return {
        query,
        locale: assertString(safe, 'locale', { max: 10 }),
        topicCode: assertString(safe, 'topicCode', { max: 80 }),
        categoryCode: assertString(safe, 'categoryCode', { max: 80 }),
        limit: assertLimit(safe, 'limit', 4, 8),
      };
    },
  },
  {
    name: 'get_related_scenarios',
    description: 'Return published scenarios related to a topic or category.',
    readOnly: true,
    modelVisible: true,
    userVisible: true,
    riskLevel: 'low',
    validateInput(input = {}) {
      const safe = normalizeCommonInput(input);
      return {
        topicCode: assertString(safe, 'topicCode', { max: 80 }),
        categoryCode: assertString(safe, 'categoryCode', { max: 80 }),
        locale: assertString(safe, 'locale', { max: 10 }),
        excludeCompleted: assertBoolean(safe, 'excludeCompleted') === true,
        limit: assertLimit(safe, 'limit', 4, 8),
      };
    },
  },
  {
    name: 'get_completed_scenarios',
    description: 'Return safe summaries of completed scenarios for the authenticated learner.',
    readOnly: true,
    modelVisible: true,
    userVisible: false,
    riskLevel: 'low',
    validateInput(input = {}) {
      const safe = normalizeCommonInput(input);
      return {
        locale: assertString(safe, 'locale', { max: 10 }),
        topicCode: assertString(safe, 'topicCode', { max: 80 }),
        categoryCode: assertString(safe, 'categoryCode', { max: 80 }),
      };
    },
  },
  {
    name: 'build_learning_route',
    description: 'Build a deterministic read-only learning route suggestion.',
    readOnly: true,
    modelVisible: true,
    userVisible: true,
    riskLevel: 'medium',
    validateInput(input = {}) {
      const safe = normalizeCommonInput(input);
      return {
        goal: assertString(safe, 'goal', { required: true, max: 300 }),
        topicCode: assertString(safe, 'topicCode', { max: 80 }),
        categoryCode: assertString(safe, 'categoryCode', { max: 80 }),
        locale: assertString(safe, 'locale', { max: 10 }),
        timeBudgetMinutes: safe.timeBudgetMinutes === undefined
          ? null
          : Math.min(Math.max(Number(safe.timeBudgetMinutes) || 15, 5), 60),
      };
    },
  },
];

const DEFINITIONS_BY_NAME = new Map(TOOL_DEFINITIONS.map(tool => [tool.name, tool]));

function getToolDefinition(toolName) {
  if (isProhibitedToolName(toolName)) {
    throw new Error(`Agent tool ${toolName} is prohibited.`);
  }
  if (!isAllowedToolName(toolName) || !DEFINITIONS_BY_NAME.has(toolName)) {
    throw new Error(`Unknown agent tool: ${toolName}`);
  }
  return DEFINITIONS_BY_NAME.get(toolName);
}

function listToolMetadata() {
  return TOOL_DEFINITIONS.map(tool => ({
    name: tool.name,
    description: tool.description,
    readOnly: tool.readOnly,
    modelVisible: tool.modelVisible,
    userVisible: tool.userVisible,
    riskLevel: tool.riskLevel,
  }));
}

module.exports = {
  getToolDefinition,
  listToolMetadata,
};

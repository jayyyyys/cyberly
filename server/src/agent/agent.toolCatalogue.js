const { normalizeLocale } = require('../i18n/locale');
const { AgenticError } = require('./agenticError');
const { PROHIBITED_TOOL_NAMES } = require('./agent.policy');

const LOCALES = new Set(['en', 'ms', 'zh-CN']);
const TOPIC_CODES = new Set([
  'phishing_and_scams',
  'password_and_account_security',
  'privacy_and_personal_information',
  'misinformation_and_deepfakes',
]);
const CATEGORY_CODES = new Set([
  'Beginner',
  'Scams',
  'Passwords',
  'Privacy',
  'Safety',
  'Misinformation',
  'AI & Technology',
]);

const SQL_LIKE = /\b(select\s+.+\s+from|insert\s+into|update\s+\w+\s+set|delete\s+from|drop\s+table|alter\s+table|union\s+select)\b|--|\/\*|\*\//i;
const POLLUTION_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

function schema(properties, required = []) {
  return {
    type: 'object',
    additionalProperties: false,
    properties,
    required,
  };
}

const TOOL_DEFINITIONS = [
  {
    name: 'get_learner_profile',
    description: 'Return safe learner preferences and level summary for the authenticated learner.',
    inputSchema: schema({
      locale: { type: 'string', enum: Array.from(LOCALES) },
    }),
    outputSchema: schema({}),
    riskLevel: 'low',
    mode: 'read_only',
    allowedRoles: ['user'],
    timeoutMs: 1500,
    oldToolName: 'get_learner_context',
  },
  {
    name: 'get_learning_progress',
    description: 'Return summarized learning progress signals for the authenticated learner.',
    inputSchema: schema({
      locale: { type: 'string', enum: Array.from(LOCALES) },
      topicCode: { type: 'string', enum: Array.from(TOPIC_CODES) },
    }),
    outputSchema: schema({}),
    riskLevel: 'low',
    mode: 'read_only',
    allowedRoles: ['user'],
    timeoutMs: 1500,
    oldToolName: 'get_learner_context',
  },
  {
    name: 'get_current_recommendations',
    description: 'Return the current safe learning recommendation without marking it viewed or completed.',
    inputSchema: schema({
      locale: { type: 'string', enum: Array.from(LOCALES) },
    }),
    outputSchema: schema({}),
    riskLevel: 'low',
    mode: 'read_only',
    allowedRoles: ['user'],
    timeoutMs: 1500,
    oldToolName: 'get_current_recommendation',
  },
  {
    name: 'search_published_resources',
    description: 'Search published reviewed learner-visible Cyberly resources.',
    inputSchema: schema({
      query: { type: 'string', minLength: 1, maxLength: 240 },
      locale: { type: 'string', enum: Array.from(LOCALES) },
      topicCode: { type: 'string', enum: Array.from(TOPIC_CODES) },
      categoryCode: { type: 'string', enum: Array.from(CATEGORY_CODES) },
      limit: { type: 'integer', minimum: 1, maximum: 5 },
    }, ['query']),
    outputSchema: schema({}),
    riskLevel: 'low',
    mode: 'read_only',
    allowedRoles: ['user'],
    timeoutMs: 2000,
    oldToolName: 'search_learning_resources',
  },
  {
    name: 'list_recommended_scenarios',
    description: 'List published learner-visible scenarios related to a topic without starting an attempt.',
    inputSchema: schema({
      locale: { type: 'string', enum: Array.from(LOCALES) },
      topicCode: { type: 'string', enum: Array.from(TOPIC_CODES) },
      categoryCode: { type: 'string', enum: Array.from(CATEGORY_CODES) },
      excludeCompleted: { type: 'boolean' },
      limit: { type: 'integer', minimum: 1, maximum: 5 },
    }),
    outputSchema: schema({}),
    riskLevel: 'low',
    mode: 'read_only',
    allowedRoles: ['user'],
    timeoutMs: 2000,
    oldToolName: 'get_related_scenarios',
  },
];

const BY_NAME = new Map(TOOL_DEFINITIONS.map(tool => [tool.name, tool]));

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function fail(code, message) {
  throw new AgenticError(code, message);
}

function parseArguments(value) {
  if (value === undefined || value === null || value === '') return {};
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      fail('AGENT_INVALID_ARGUMENTS', 'Tool arguments must be valid JSON.');
    }
  }
  if (typeof value !== 'object' || Array.isArray(value)) {
    fail('AGENT_INVALID_ARGUMENTS', 'Tool arguments must be an object.');
  }
  return value;
}

function assertNoUnsafeKeys(input = {}) {
  for (const key of Object.keys(input)) {
    if (POLLUTION_KEYS.has(key)) fail('AGENT_INVALID_ARGUMENTS', 'Unsafe tool argument key.');
  }
  if (Object.hasOwn(input, 'userId')) fail('AGENT_INVALID_ARGUMENTS', 'Tool arguments cannot include userId.');
}

function assertKnownFields(input, definition) {
  const allowed = new Set(Object.keys(definition.inputSchema.properties || {}));
  const unknown = Object.keys(input).filter(key => !allowed.has(key));
  if (unknown.length) fail('AGENT_INVALID_ARGUMENTS', 'Unknown tool argument fields are not allowed.');
}

function normalizeOptionalLocale(value, fallback = 'en') {
  if (value === undefined || value === null || value === '') return normalizeLocale(fallback);
  const locale = normalizeLocale(value);
  if (!LOCALES.has(locale)) fail('AGENT_INVALID_LOCALE', 'Unsupported tool locale.');
  return locale;
}

function normalizeOptionalEnum(input, key, allowed) {
  if (input[key] === undefined || input[key] === null || input[key] === '') return undefined;
  const value = String(input[key]).trim();
  if (!allowed.has(value)) fail('AGENT_INVALID_ARGUMENTS', `${key} is not supported.`);
  return value;
}

function normalizeLimit(input, fallback = 4) {
  if (input.limit === undefined || input.limit === null || input.limit === '') return fallback;
  const value = Number(input.limit);
  if (!Number.isInteger(value) || value < 1 || value > 5) {
    fail('AGENT_INVALID_ARGUMENTS', 'limit must be between 1 and 5.');
  }
  return value;
}

function normalizeQuery(input) {
  const query = String(input.query || '').replace(/\s+/g, ' ').trim();
  if (!query) fail('AGENT_INVALID_ARGUMENTS', 'query is required.');
  if (query.length > 240) fail('AGENT_INVALID_ARGUMENTS', 'query is too long.');
  if (SQL_LIKE.test(query)) fail('AGENT_INVALID_ARGUMENTS', 'query contains unsupported filter syntax.');
  return query;
}

function compact(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
}

function getControlledToolDefinition(toolName) {
  const name = String(toolName || '').trim();
  if (PROHIBITED_TOOL_NAMES.has(name)) fail('AGENT_TOOL_REJECTED', 'The requested tool is prohibited.');
  const definition = BY_NAME.get(name);
  if (!definition) fail('AGENT_TOOL_REJECTED', 'The requested tool is not allowlisted.');
  return definition;
}

function validateToolArguments(toolName, rawArguments = {}, requestedLocale = 'en') {
  const definition = getControlledToolDefinition(toolName);
  const input = parseArguments(rawArguments);
  assertNoUnsafeKeys(input);
  assertKnownFields(input, definition);

  const locale = normalizeOptionalLocale(input.locale, requestedLocale);
  if (definition.name === 'search_published_resources') {
    return compact({
      query: normalizeQuery(input),
      locale,
      topicCode: normalizeOptionalEnum(input, 'topicCode', TOPIC_CODES),
      categoryCode: normalizeOptionalEnum(input, 'categoryCode', CATEGORY_CODES),
      limit: normalizeLimit(input, 4),
    });
  }
  if (definition.name === 'list_recommended_scenarios') {
    return compact({
      locale,
      topicCode: normalizeOptionalEnum(input, 'topicCode', TOPIC_CODES),
      categoryCode: normalizeOptionalEnum(input, 'categoryCode', CATEGORY_CODES),
      excludeCompleted: input.excludeCompleted === undefined ? true : input.excludeCompleted === true,
      limit: normalizeLimit(input, 4),
    });
  }
  if (definition.name === 'get_learning_progress') {
    return compact({
      locale,
      topicCode: normalizeOptionalEnum(input, 'topicCode', TOPIC_CODES),
    });
  }
  return { locale };
}

function publicTool(tool) {
  return {
    name: tool.name,
    description: tool.description,
    inputSchema: clone(tool.inputSchema),
    outputSchema: clone(tool.outputSchema),
    riskLevel: tool.riskLevel,
    mode: tool.mode,
    readOnly: tool.mode === 'read_only',
    allowedRoles: [...tool.allowedRoles],
    timeoutMs: tool.timeoutMs,
  };
}

function listControlledToolMetadata() {
  return TOOL_DEFINITIONS.map(tool => {
    const item = publicTool(tool);
    delete item.inputSchema;
    delete item.outputSchema;
    delete item.timeoutMs;
    return item;
  });
}

function listControlledToolDeclarations() {
  return TOOL_DEFINITIONS.map(tool => ({
    name: tool.name,
    description: tool.description,
    inputSchema: clone(tool.inputSchema),
    riskLevel: tool.riskLevel,
    mode: tool.mode,
    allowedRoles: [...tool.allowedRoles],
  }));
}

function createControlledToolHandlers({ agentService } = {}) {
  if (!agentService) return {};
  async function runOldTool(toolName, input, context) {
    const result = await agentService.executeTool({
      toolName,
      input,
      userId: context.userId,
      locale: input.locale || context.requestedLocale,
    });
    return result.output;
  }
  return {
    get_learner_profile: async ({ input, context }) => runOldTool('get_learner_context', input, context),
    get_learning_progress: async ({ input, context }) => {
      const output = await runOldTool('get_learner_context', input, context);
      return {
        learnerLevel: output.learnerLevel || null,
        confidence: output.confidence || null,
        primaryFocus: output.primaryFocus || null,
        secondaryFocus: output.secondaryFocus || [],
        currentRecommendation: output.currentRecommendation || null,
      };
    },
    get_current_recommendations: async ({ input, context }) => runOldTool('get_current_recommendation', input, context),
    search_published_resources: async ({ input, context }) => runOldTool('search_learning_resources', input, context),
    list_recommended_scenarios: async ({ input, context }) => runOldTool('get_related_scenarios', input, context),
  };
}

module.exports = {
  createControlledToolHandlers,
  getControlledToolDefinition,
  listControlledToolDeclarations,
  listControlledToolMetadata,
  validateToolArguments,
};

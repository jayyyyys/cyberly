const DEFAULT_PROVIDER = 'openai';
const DEFAULT_MODEL = 'gpt-5.4-mini';
const DEFAULT_TIMEOUT_MS = 20000;
const DEFAULT_MAX_OUTPUT_TOKENS = 800;
const DEFAULT_CONTEXT_MESSAGE_LIMIT = 12;
const DEFAULT_CONTEXT_CHARACTER_LIMIT = 8000;
const DEFAULT_PER_USER_MINUTE_LIMIT = 6;
const DEFAULT_PER_USER_DAILY_LIMIT = 60;
const DEFAULT_GENERATION_STALE_MS = 60000;

const MODEL_PRICING_PER_MILLION = {
  'gpt-5.4-mini': { input: 0.75, output: 4.5 },
};

function numberFromEnv(value, fallback, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function createAiConfig(env = process.env) {
  const provider = String(env.AI_PROVIDER_CYBERGUARD || env.AI_DEFAULT_PROVIDER || env.AI_PROVIDER || DEFAULT_PROVIDER).trim().toLowerCase() || DEFAULT_PROVIDER;
  const model = String(env.AI_DEFAULT_MODEL || env.AI_MODEL || env.OPENAI_MODEL || DEFAULT_MODEL).trim() || DEFAULT_MODEL;
  const pricing = MODEL_PRICING_PER_MILLION[model] || MODEL_PRICING_PER_MILLION[DEFAULT_MODEL];

  return {
    provider,
    model,
    defaultProvider: String(env.AI_DEFAULT_PROVIDER || env.AI_PROVIDER || DEFAULT_PROVIDER).trim().toLowerCase() || DEFAULT_PROVIDER,
    openAiApiKey: String(env.OPENAI_API_KEY || '').trim(),
    timeoutMs: numberFromEnv(env.AI_TIMEOUT_MS, DEFAULT_TIMEOUT_MS, { min: 100, max: 120000 }),
    maxOutputTokens: numberFromEnv(env.AI_MAX_OUTPUT_TOKENS, DEFAULT_MAX_OUTPUT_TOKENS, { min: 1, max: 4096 }),
    contextMessageLimit: numberFromEnv(env.AI_CONTEXT_MESSAGE_LIMIT, DEFAULT_CONTEXT_MESSAGE_LIMIT, { min: 1, max: 50 }),
    contextCharacterLimit: numberFromEnv(env.AI_CONTEXT_CHARACTER_LIMIT, DEFAULT_CONTEXT_CHARACTER_LIMIT, { min: 500, max: 50000 }),
    perUserMinuteLimit: numberFromEnv(env.AI_PER_USER_MINUTE_LIMIT, DEFAULT_PER_USER_MINUTE_LIMIT, { min: 1, max: 1000 }),
    perUserDailyLimit: numberFromEnv(env.AI_PER_USER_DAILY_LIMIT, DEFAULT_PER_USER_DAILY_LIMIT, { min: 1, max: 10000 }),
    generationStaleMs: numberFromEnv(env.AI_GENERATION_STALE_MS, DEFAULT_GENERATION_STALE_MS, { min: 1000, max: 30 * 60 * 1000 }),
    dailyBudgetUsd: env.AI_DAILY_BUDGET_USD === undefined || env.AI_DAILY_BUDGET_USD === ''
      ? null
      : numberFromEnv(env.AI_DAILY_BUDGET_USD, null, { min: 0 }),
    pricing,
    testMockMode: env.NODE_ENV === 'test' ? String(env.AI_TEST_MOCK_OPENAI || '').trim() : '',
  };
}

function estimateCostUsd({ inputTokens = 0, outputTokens = 0 }, config) {
  const pricing = config.pricing || MODEL_PRICING_PER_MILLION[DEFAULT_MODEL];
  const cost = (Number(inputTokens || 0) / 1000000 * pricing.input) +
    (Number(outputTokens || 0) / 1000000 * pricing.output);
  return Number(cost.toFixed(8));
}

module.exports = {
  createAiConfig,
  estimateCostUsd,
};

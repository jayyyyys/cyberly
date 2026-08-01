const { createProviderRegistry } = require('./providers/aiProvider.registry');

function createAiProvider(config) {
  const registry = createProviderRegistry({
    env: {
      ...process.env,
      AI_DEFAULT_PROVIDER: config.provider || process.env.AI_DEFAULT_PROVIDER || process.env.AI_PROVIDER,
      AI_PROVIDER_CYBERGUARD: config.provider || process.env.AI_PROVIDER_CYBERGUARD || process.env.AI_PROVIDER,
      OPENAI_MODEL: config.model || process.env.OPENAI_MODEL,
      GEMINI_MODEL: process.env.GEMINI_MODEL,
      ILMU_MODEL: process.env.ILMU_MODEL,
      AI_MODEL: config.model || process.env.AI_MODEL,
      OPENAI_API_KEY: config.openAiApiKey || process.env.OPENAI_API_KEY,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      ILMU_API_KEY: process.env.ILMU_API_KEY,
      ILMU_BASE_URL: process.env.ILMU_BASE_URL,
      AI_PROVIDER_RUNTIME_DISABLED: process.env.AI_PROVIDER_RUNTIME_DISABLED,
      AI_TIMEOUT_MS: String(config.timeoutMs || process.env.AI_TIMEOUT_MS || ''),
      AI_MAX_OUTPUT_TOKENS: String(config.maxOutputTokens || process.env.AI_MAX_OUTPUT_TOKENS || ''),
      AI_TEST_MOCK_OPENAI: config.testMockMode || process.env.AI_TEST_MOCK_OPENAI || '',
      AI_TEST_MOCK_PROVIDER: config.testMockMode || process.env.AI_TEST_MOCK_PROVIDER || process.env.AI_TEST_MOCK_OPENAI || '',
      NODE_ENV: process.env.NODE_ENV,
    },
  });

  function selectedProvider() {
    return registry.resolveForPurpose('cyberguard_chat');
  }

  return {
    get id() {
      return selectedProvider().id;
    },
    get model() {
      return selectedProvider().model;
    },
    get configured() {
      return selectedProvider().configured;
    },
    get capabilities() {
      return selectedProvider().capabilities;
    },
    generateReply(request) {
      return selectedProvider().generateReply
        ? selectedProvider().generateReply(request)
        : selectedProvider().generate(request).then(result => ({
          providerRequestId: result.providerRequestId || null,
          content: result.text || '',
          inputTokens: result.usage?.inputTokens || 0,
          outputTokens: result.usage?.outputTokens || 0,
          latencyMs: result.latencyMs,
        }));
    },
    registry,
  };
}

module.exports = {
  createAiProvider,
};

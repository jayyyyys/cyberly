const { createProviderError, normalizeProviderError, PROVIDER_ERROR_CODES } = require('./aiProvider.errors');
const { normalizeReturnedToolCalls, toOpenAiTools } = require('./aiProvider.tools');

function trimBaseUrl(baseUrl) {
  return String(baseUrl || 'https://api.ilmu.ai/v1').trim().replace(/\/+$/, '');
}

function buildChatMessages(request = {}) {
  const messages = [];
  const system = request.systemInstruction || request.systemPrompt;
  if (system) messages.push({ role: 'system', content: String(system) });
  for (const message of request.messages || []) {
    messages.push({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: String(message.content || ''),
    });
  }
  return messages;
}

function usageFromChatCompletion(response) {
  const usage = response?.usage || {};
  const inputTokens = usage.prompt_tokens || usage.input_tokens || 0;
  const outputTokens = usage.completion_tokens || usage.output_tokens || 0;
  return {
    inputTokens,
    outputTokens,
    totalTokens: usage.total_tokens || inputTokens + outputTokens,
  };
}

function extractToolCalls(choice) {
  return (choice?.message?.tool_calls || []).map(call => ({
    id: call.id,
    name: call.function?.name,
    args: (() => {
      try { return JSON.parse(call.function?.arguments || '{}'); } catch { return {}; }
    })(),
  }));
}

function createIlmuProvider(config = {}) {
  const apiKey = String(config.apiKey || '').trim();
  const baseUrl = trimBaseUrl(config.baseUrl);
  const model = String(config.model || '').trim();
  const fetchImpl = config.fetchImpl || global.fetch;
  const capabilities = {
    chat: true,
    structuredOutput: false,
    toolCalling: true,
    streaming: false,
    usageReporting: true,
  };

  async function generate(request = {}) {
    if (!apiKey && !(config.testMockMode || config.mockMode)) {
      throw createProviderError(PROVIDER_ERROR_CODES.AI_PROVIDER_NOT_CONFIGURED, 'ILMU provider is not configured.', 503);
    }
    if (config.testMockMode || config.mockMode) {
      return {
        provider: 'ilmu',
        model,
        text: 'OK',
        toolCalls: [],
        usage: { inputTokens: 4, outputTokens: 1, totalTokens: 5 },
        latencyMs: 1,
        finishReason: 'stop',
        providerRequestId: 'mock-ilmu',
      };
    }
    if (typeof fetchImpl !== 'function') {
      throw createProviderError(PROVIDER_ERROR_CODES.AI_PROVIDER_UNAVAILABLE, 'Fetch is not available for ILMU provider.', 503);
    }

    const startedAt = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs || 20000);
    try {
      const response = await fetchImpl(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: buildChatMessages(request),
          max_tokens: request.maxOutputTokens || config.maxOutputTokens,
          temperature: request.temperature,
          tools: request.tools?.length ? toOpenAiTools(request.tools) : undefined,
          tool_choice: request.toolChoice,
        }),
        signal: controller.signal,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw createProviderError(
          response.status === 401 || response.status === 403
            ? PROVIDER_ERROR_CODES.AI_AUTH_FAILED
            : response.status === 429
              ? PROVIDER_ERROR_CODES.AI_RATE_LIMITED
              : PROVIDER_ERROR_CODES.AI_REQUEST_FAILED,
          data.error?.message || 'ILMU provider request failed.',
          response.status
        );
      }
      const choice = data.choices?.[0];
      const usage = usageFromChatCompletion(data);
      const text = choice?.message?.content || '';
      return {
        provider: 'ilmu',
        model,
        text,
        toolCalls: normalizeReturnedToolCalls('ilmu', extractToolCalls(choice)),
        usage,
        latencyMs: Date.now() - startedAt,
        finishReason: choice?.finish_reason || null,
        providerRequestId: data.id || response.headers?.get?.('x-request-id') || null,
        rawMetadata: { status: response.status },
      };
    } catch (error) {
      throw normalizeProviderError(error);
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    id: 'ilmu',
    model,
    configured: Boolean(apiKey),
    capabilities,
    generate,
  };
}

module.exports = {
  buildChatMessages,
  createIlmuProvider,
  trimBaseUrl,
};

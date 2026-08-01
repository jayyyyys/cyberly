const { createProviderError, normalizeProviderError, PROVIDER_ERROR_CODES } = require('./aiProvider.errors');
const { normalizeReturnedToolCalls, toGeminiTools } = require('./aiProvider.tools');

function loadGoogleGenAI() {
  try {
    return require('@google/genai');
  } catch {
    return null;
  }
}

function buildGeminiContents(messages = []) {
  return messages.map(message => ({
    role: message.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: String(message.content || '') }],
  }));
}

function usageFromGemini(response) {
  const usage = response?.usageMetadata || {};
  const inputTokens = usage.promptTokenCount || 0;
  const outputTokens = usage.candidatesTokenCount || 0;
  return {
    inputTokens,
    outputTokens,
    totalTokens: usage.totalTokenCount || inputTokens + outputTokens,
  };
}

function extractFunctionCalls(response) {
  const parts = response?.candidates?.flatMap(candidate => candidate.content?.parts || []) || [];
  return parts
    .filter(part => part.functionCall)
    .map((part, index) => ({
      id: `gemini-call-${index + 1}`,
      name: part.functionCall.name,
      args: part.functionCall.args || {},
    }));
}

function createGeminiProvider(config = {}) {
  const apiKey = String(config.apiKey || '').trim();
  const model = String(config.model || '').trim();
  const capabilities = {
    chat: true,
    structuredOutput: true,
    toolCalling: true,
    streaming: false,
    usageReporting: true,
  };

  async function generate(request = {}) {
    if (!apiKey && !(config.testMockMode || config.mockMode)) {
      throw createProviderError(PROVIDER_ERROR_CODES.AI_PROVIDER_NOT_CONFIGURED, 'Gemini provider is not configured.', 503);
    }
    if (config.testMockMode || config.mockMode) {
      return {
        provider: 'gemini',
        model,
        text: 'OK',
        toolCalls: [],
        usage: { inputTokens: 4, outputTokens: 1, totalTokens: 5 },
        latencyMs: 1,
        finishReason: 'STOP',
        providerRequestId: null,
      };
    }

    const mod = loadGoogleGenAI();
    const GoogleGenAI = mod?.GoogleGenAI || mod?.GoogleGenerativeAI || mod?.default;
    if (!GoogleGenAI) {
      throw createProviderError(PROVIDER_ERROR_CODES.AI_PROVIDER_UNAVAILABLE, 'Gemini SDK is not installed.', 503);
    }

    const startedAt = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs || 20000);
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model,
        contents: buildGeminiContents(request.messages),
        config: {
          systemInstruction: request.systemInstruction || request.systemPrompt || undefined,
          temperature: request.temperature,
          maxOutputTokens: request.maxOutputTokens || config.maxOutputTokens,
          tools: request.tools?.length ? toGeminiTools(request.tools) : undefined,
          responseMimeType: request.responseFormat?.type === 'json_object' ? 'application/json' : undefined,
        },
      }, { signal: controller.signal });
      const usage = usageFromGemini(response);
      const text = response.text || response.response?.text?.() || '';
      return {
        provider: 'gemini',
        model,
        text,
        toolCalls: normalizeReturnedToolCalls('gemini', extractFunctionCalls(response)),
        usage,
        latencyMs: Date.now() - startedAt,
        finishReason: response.candidates?.[0]?.finishReason || null,
        providerRequestId: response.responseId || null,
        rawMetadata: { candidateCount: response.candidates?.length || 0 },
      };
    } catch (error) {
      throw normalizeProviderError(error);
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    id: 'gemini',
    model,
    configured: Boolean(apiKey),
    capabilities,
    generate,
  };
}

module.exports = {
  buildGeminiContents,
  createGeminiProvider,
};

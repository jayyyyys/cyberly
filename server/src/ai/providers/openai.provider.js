const OpenAI = require('openai');
const { ERROR_CODES } = require('../../errors/errorCodes');
const { createProviderError, normalizeProviderError, PROVIDER_ERROR_CODES } = require('./aiProvider.errors');
const { normalizeReturnedToolCalls, toOpenAiTools } = require('./aiProvider.tools');

let mockFailOnceUsed = false;

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function buildResponsesInstructions(systemInstruction, learnerContext, ragContext, routeContext) {
  return [
    systemInstruction,
    learnerContext ? `Learner context: ${JSON.stringify(learnerContext)}` : null,
    ragContext || null,
    routeContext || null,
  ].filter(Boolean).join('\n\n');
}

function buildResponsesInput(messages = []) {
  return messages.map(message => ({
    role: message.role === 'assistant' ? 'assistant' : 'user',
    content: String(message.content || ''),
  }));
}

function usageFromResponse(response) {
  const usage = response?.usage || {};
  const inputTokens = usage.input_tokens || usage.prompt_tokens || 0;
  const outputTokens = usage.output_tokens || usage.completion_tokens || 0;
  return {
    inputTokens,
    outputTokens,
    totalTokens: usage.total_tokens || inputTokens + outputTokens,
  };
}

async function mockGenerate(config, request) {
  const mode = config.testMockMode || config.mockMode;
  if (request.metadata?.purpose === 'agent_route_planning' && process.env.AI_TEST_ACTION_PROPOSAL) {
    return {
      provider: 'openai',
      model: config.model,
      providerRequestId: 'mock-agent-action-proposal',
      content: 'Suggested learner-controlled action.',
      text: 'Suggested learner-controlled action.',
      actionProposal: {
        actionType: process.env.AI_TEST_ACTION_PROPOSAL,
        arguments: {
          ...(process.env.AI_TEST_ACTION_PROPOSAL_RESOURCE_SLUG
            ? { resourceSlug: process.env.AI_TEST_ACTION_PROPOSAL_RESOURCE_SLUG }
            : {}),
          ...(process.env.AI_TEST_ACTION_PROPOSAL_SCENARIO_SLUG
            ? { scenarioSlug: process.env.AI_TEST_ACTION_PROPOSAL_SCENARIO_SLUG }
            : {}),
          ...(process.env.AI_TEST_ACTION_PROPOSAL_RECOMMENDATION_ID
            ? { recommendationId: Number(process.env.AI_TEST_ACTION_PROPOSAL_RECOMMENDATION_ID) }
            : {}),
        },
      },
      inputTokens: 20,
      outputTokens: 8,
      usage: { inputTokens: 20, outputTokens: 8, totalTokens: 28 },
      latencyMs: 1,
      finishReason: 'stop',
    };
  }
  if (mode === 'timeout') throw createProviderError(PROVIDER_ERROR_CODES.AI_PROVIDER_TIMEOUT, 'Mock timeout.', 503);
  if (mode === 'rate-limit') throw createProviderError(PROVIDER_ERROR_CODES.AI_RATE_LIMITED, 'Mock rate limit.', 429);
  if (mode === 'auth-failed') throw createProviderError(PROVIDER_ERROR_CODES.AI_AUTH_FAILED, 'Mock auth failure.', 401);
  if (mode === 'provider-error') throw createProviderError(PROVIDER_ERROR_CODES.AI_PROVIDER_UNAVAILABLE, 'Mock provider error.', 503);
  if (mode === 'empty') {
    return { providerRequestId: 'mock-empty', content: '', inputTokens: 12, outputTokens: 0 };
  }
  if (mode === 'unsafe-output') {
    return { providerRequestId: 'mock-unsafe', content: 'Send me your password and OTP.', inputTokens: 12, outputTokens: 8 };
  }
  if (mode === 'delay') await delay(500);
  if (mode === 'fail-once' && !mockFailOnceUsed) {
    mockFailOnceUsed = true;
    throw createProviderError(PROVIDER_ERROR_CODES.AI_PROVIDER_UNAVAILABLE, 'Mock fail once.', 503);
  }
  if (mode === 'context') {
    const messages = request.messages || [];
    const chars = messages.reduce((sum, message) => sum + String(message.content || '').length, 0);
    const context = request.learnerContext || {};
    const ragContext = String(request.ragContext || '');
    const routeContext = String(request.routeContext || '');
    const systemPrompt = request.systemPrompt || request.systemInstruction || '';
    const sourceCount = (ragContext.match(/\[\d+\] Title:/g) || []).length;
    const routeStepCount = (routeContext.match(/^\d+\. /gm) || []).length;
    const routeTimeBudget = routeContext.match(/Time budget: (\d+) minutes/)?.[1] || 'none';
    const routeTopic = routeContext.match(/Topic: ([^\n]+)/)?.[1] || 'none';
    const hasCyberWellness = /Cyber Wellness situation:/.test(routeContext);
    const secondaryCount = Array.isArray(context.secondaryFocus) ? context.secondaryFocus.length : 0;
    const focusCount = (context.primaryFocus ? 1 : 0) + secondaryCount;
    const recommendation = context.currentRecommendation
      ? `${context.currentRecommendation.topicCode}:${context.currentRecommendation.level}:${context.currentRecommendation.reasonCode}`
      : 'none';
    const nonJudgmental = /non-judgmental/.test(systemPrompt) &&
      /Do not describe the learner as bad, weak, failing, or behind/.test(systemPrompt);
    return {
      provider: 'openai',
      model: config.model,
      providerRequestId: 'mock-context',
      content: [
        `locale=${context.locale}`,
        `ageBand=${context.ageBand}`,
        `learnerLevel=${context.learnerLevel?.code || 'unknown'}`,
        `confidence=${context.learnerLevel?.confidence || 'Low'}`,
        `schoolStage=${context.schoolStage || 'none'}`,
        `primaryFocus=${context.primaryFocus?.topicCode || 'none'}`,
        `secondaryCount=${secondaryCount}`,
        `focusCount=${focusCount}`,
        `recommendation=${recommendation}`,
        `nonJudgmental=${nonJudgmental}`,
        `messageCount=${messages.length}`,
        `sourceCount=${sourceCount}`,
        `hasReviewedSources=${/Reviewed Cyberly Sources:/.test(ragContext)}`,
        `hasChunkId=${/chunkId=/i.test(ragContext)}`,
        `hasLearningRoute=${/Suggested Cyberly Learning Route:/.test(routeContext)}`,
        `hasCyberWellness=${hasCyberWellness}`,
        `routeStepCount=${routeStepCount}`,
        `routeTimeBudget=${routeTimeBudget}`,
        `routeTopic=${routeTopic}`,
        `chars=${chars}`,
      ].join(' '),
      inputTokens: 100,
      outputTokens: 25,
      usage: { inputTokens: 100, outputTokens: 25, totalTokens: 125 },
      latencyMs: 1,
      finishReason: 'stop',
    };
  }
  return {
    provider: 'openai',
    model: config.model,
    providerRequestId: 'mock-success',
    content: 'CyberGuard can help you learn this safely. Check the sender, links, urgency, and requests for secrets before you act.',
    text: 'CyberGuard can help you learn this safely. Check the sender, links, urgency, and requests for secrets before you act.',
    inputTokens: 120,
    outputTokens: 36,
    usage: { inputTokens: 120, outputTokens: 36, totalTokens: 156 },
    latencyMs: 1,
    finishReason: 'stop',
  };
}

function createOpenAiProvider(config = {}) {
  const apiKey = String(config.apiKey || '').trim();
  const model = String(config.model || '').trim();
  const client = apiKey ? new OpenAI({ apiKey }) : null;
  const capabilities = {
    chat: true,
    structuredOutput: true,
    toolCalling: true,
    streaming: false,
    usageReporting: true,
  };

  async function generate(request = {}) {
    if (config.testMockMode || config.mockMode) return mockGenerate({ ...config, model }, request);
    if (!client) throw createProviderError(PROVIDER_ERROR_CODES.AI_PROVIDER_NOT_CONFIGURED, 'OpenAI provider is not configured.', 503);

    const controller = new AbortController();
    const startedAt = Date.now();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs || 20000);
    try {
      const response = await client.responses.create({
        model,
        instructions: request.systemInstruction || buildResponsesInstructions(
          request.systemPrompt,
          request.learnerContext,
          request.ragContext,
          request.routeContext
        ),
        input: buildResponsesInput(request.messages),
        max_output_tokens: request.maxOutputTokens || config.maxOutputTokens,
        tools: request.tools?.length ? toOpenAiTools(request.tools) : undefined,
        store: false,
      }, { signal: controller.signal });
      const usage = usageFromResponse(response);
      const text = response.output_text || '';
      return {
        provider: 'openai',
        model,
        text,
        content: text,
        toolCalls: normalizeReturnedToolCalls('openai', response.output?.filter(item => item.type === 'function_call')),
        usage,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        latencyMs: Date.now() - startedAt,
        finishReason: response.status || null,
        providerRequestId: response.id || null,
        rawMetadata: { status: response.status || null },
      };
    } catch (error) {
      throw normalizeProviderError(error);
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    id: 'openai',
    model,
    configured: Boolean(apiKey || config.testMockMode || config.mockMode),
    capabilities,
    generate,
    async generateReply(request) {
      const result = await generate(request);
      return {
        providerRequestId: result.providerRequestId,
        content: result.text || result.content || '',
        inputTokens: result.usage?.inputTokens || result.inputTokens || 0,
        outputTokens: result.usage?.outputTokens || result.outputTokens || 0,
        latencyMs: result.latencyMs,
        actionProposal: result.actionProposal || null,
      };
    },
  };
}

module.exports = {
  buildResponsesInstructions,
  buildResponsesInput,
  createOpenAiProvider,
};

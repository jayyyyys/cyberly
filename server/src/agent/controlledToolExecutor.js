const { AgenticError, isAgenticError } = require('./agenticError');
const {
  createControlledToolHandlers,
  getControlledToolDefinition,
  validateToolArguments,
} = require('./agent.toolCatalogue');

const DEFAULT_TIMEOUT_MS = 2500;
const MAX_STRING_LENGTH = 1000;
const MAX_ARRAY_LENGTH = 8;
const BLOCKED_KEYS = new Set([
  'password_hash',
  'passwordHash',
  'email',
  'session',
  'sessionId',
  'apiKey',
  'prompt',
  'rawAssessmentAnswers',
  'rawScenarioDecisions',
  'sql',
  'userId',
]);

function timeoutPromise(ms) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new AgenticError('AGENT_TOOL_TIMEOUT', 'Agent tool timed out.')), ms);
  });
}

function clampText(value) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= MAX_STRING_LENGTH) return text;
  return `${text.slice(0, MAX_STRING_LENGTH - 3).trim()}...`;
}

function sanitize(value, depth = 0) {
  if (depth > 5) return null;
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return clampText(value);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.slice(0, MAX_ARRAY_LENGTH).map(item => sanitize(item, depth + 1));
  if (typeof value === 'object') {
    const output = {};
    for (const [key, item] of Object.entries(value)) {
      if (BLOCKED_KEYS.has(key)) continue;
      output[key] = sanitize(item, depth + 1);
    }
    return output;
  }
  return null;
}

function normalizeFailure(error) {
  if (isAgenticError(error)) return error.code;
  return 'AGENT_TOOL_FAILED';
}

function createControlledToolExecutor({ agentService, handlers, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const toolHandlers = handlers || createControlledToolHandlers({ agentService });

  async function executeToolCall({ toolCall = {}, context = {} } = {}) {
    const startedAt = Date.now();
    let definition;
    let input;
    try {
      if (!context.userId) throw new AgenticError('AGENT_AUTH_REQUIRED', 'Authenticated learner is required.');
      definition = getControlledToolDefinition(toolCall.toolName);
      if (definition.mode !== 'read_only') throw new AgenticError('AGENT_TOOL_REJECTED', 'Only read-only tools may execute.');
      if (!definition.allowedRoles.includes(context.role || 'user')) {
        throw new AgenticError('AGENT_ROLE_DENIED', 'Caller role is not allowed for this tool.');
      }
      if (context.accountStatus && context.accountStatus !== 'active') {
        throw new AgenticError('AGENT_AUTH_REQUIRED', 'Account is not active.');
      }
      input = validateToolArguments(definition.name, toolCall.arguments || {}, context.requestedLocale || 'en');
      const handler = toolHandlers[definition.name];
      if (!handler) throw new AgenticError('AGENT_TOOL_REJECTED', 'Tool handler is unavailable.');

      const data = await Promise.race([
        handler({
          input,
          context: {
            userId: context.userId,
            role: context.role || 'user',
            requestedLocale: context.requestedLocale || input.locale || 'en',
            requestId: context.requestId || null,
          },
        }),
        timeoutPromise(Math.min(Number(definition.timeoutMs || timeoutMs), timeoutMs)),
      ]);
      return {
        callId: String(toolCall.callId || 'agent-tool-call-1'),
        toolName: definition.name,
        status: 'success',
        data: sanitize(data),
        safeErrorCode: null,
        latencyMs: Date.now() - startedAt,
      };
    } catch (error) {
      return {
        callId: String(toolCall.callId || 'agent-tool-call-1'),
        toolName: definition?.name || String(toolCall.toolName || 'unknown'),
        status: normalizeFailure(error) === 'AGENT_TOOL_FAILED' || normalizeFailure(error) === 'AGENT_TOOL_TIMEOUT' ? 'failed' : 'rejected',
        data: null,
        safeErrorCode: normalizeFailure(error),
        latencyMs: Date.now() - startedAt,
      };
    }
  }

  return {
    executeToolCall,
  };
}

module.exports = {
  createControlledToolExecutor,
  sanitizeToolOutput: sanitize,
};

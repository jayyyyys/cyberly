const { ERROR_CODES } = require('../../errors/errorCodes');

const PROVIDER_ERROR_CODES = {
  AI_PROVIDER_NOT_CONFIGURED: 'AI_PROVIDER_NOT_CONFIGURED',
  AI_PROVIDER_UNAVAILABLE: ERROR_CODES.AI_PROVIDER_UNAVAILABLE,
  AI_PROVIDER_TIMEOUT: 'AI_PROVIDER_TIMEOUT',
  AI_RATE_LIMITED: ERROR_CODES.AI_RATE_LIMITED,
  AI_AUTH_FAILED: 'AI_AUTH_FAILED',
  AI_INVALID_RESPONSE: ERROR_CODES.AI_INVALID_RESPONSE,
  AI_CONTEXT_LIMIT: 'AI_CONTEXT_LIMIT',
  AI_TOOL_CALL_INVALID: 'AI_TOOL_CALL_INVALID',
  AI_REQUEST_FAILED: 'AI_REQUEST_FAILED',
};

function createProviderError(code, message, status = 503, details = {}) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  error.details = details;
  return error;
}

function normalizeProviderError(error) {
  if (!error) {
    return createProviderError(PROVIDER_ERROR_CODES.AI_REQUEST_FAILED, 'AI provider request failed.', 503);
  }
  if (error.code && Object.values(PROVIDER_ERROR_CODES).includes(error.code)) return error;
  if (error.name === 'AbortError' || error.code === ERROR_CODES.AI_TIMEOUT || error.code === PROVIDER_ERROR_CODES.AI_PROVIDER_TIMEOUT) {
    return createProviderError(PROVIDER_ERROR_CODES.AI_PROVIDER_TIMEOUT, 'AI provider request timed out.', 503);
  }

  const status = Number(error.status || error.response?.status || 0);
  const message = String(error.message || error.response?.data?.error?.message || '');
  let googleStatus = '';
  try {
    googleStatus = String(JSON.parse(message)?.error?.status || '');
  } catch {}
  if (status === 401 || status === 403) {
    return createProviderError(PROVIDER_ERROR_CODES.AI_AUTH_FAILED, 'AI provider authentication failed.', status);
  }
  if (/UNAUTHENTICATED|PERMISSION_DENIED/i.test(googleStatus)) {
    return createProviderError(PROVIDER_ERROR_CODES.AI_AUTH_FAILED, 'AI provider authentication failed.', status || 403);
  }
  if (status === 400 && (/api[_\s-]?key|API_KEY_INVALID|invalid.*key/i.test(message) || /INVALID_ARGUMENT/i.test(googleStatus) && /key/i.test(message))) {
    return createProviderError(PROVIDER_ERROR_CODES.AI_AUTH_FAILED, 'AI provider authentication failed.', status);
  }
  if (status === 429) {
    return createProviderError(PROVIDER_ERROR_CODES.AI_RATE_LIMITED, 'AI provider rate limit reached.', 429);
  }
  if (/RESOURCE_EXHAUSTED/i.test(googleStatus)) {
    return createProviderError(PROVIDER_ERROR_CODES.AI_RATE_LIMITED, 'AI provider rate limit reached.', 429);
  }
  if (/FAILED_PRECONDITION|BILLING|REGION/i.test(`${googleStatus} ${message}`)) {
    return createProviderError(PROVIDER_ERROR_CODES.AI_PROVIDER_UNAVAILABLE, 'AI provider is unavailable.', status || 503);
  }
  if (status === 400 && /context|token|length|too long/i.test(message)) {
    return createProviderError(PROVIDER_ERROR_CODES.AI_CONTEXT_LIMIT, 'AI provider context limit was reached.', 400);
  }
  if (status >= 500) {
    return createProviderError(PROVIDER_ERROR_CODES.AI_PROVIDER_UNAVAILABLE, 'AI provider is unavailable.', 503);
  }
  return createProviderError(PROVIDER_ERROR_CODES.AI_REQUEST_FAILED, 'AI provider request failed.', status || 503);
}

function publicProviderError(error) {
  const normalized = normalizeProviderError(error);
  return {
    code: normalized.code,
    status: normalized.status || 503,
    message: normalized.message,
  };
}

module.exports = {
  PROVIDER_ERROR_CODES,
  createProviderError,
  normalizeProviderError,
  publicProviderError,
};

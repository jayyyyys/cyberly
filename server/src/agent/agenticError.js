class AgenticError extends Error {
  constructor(code, message, details = {}) {
    super(message || code);
    this.name = 'AgenticError';
    this.code = code;
    this.details = details;
  }
}

function isAgenticError(error) {
  return error instanceof AgenticError || Boolean(error?.code && String(error.code).startsWith('AGENT_'));
}

module.exports = {
  AgenticError,
  isAgenticError,
};

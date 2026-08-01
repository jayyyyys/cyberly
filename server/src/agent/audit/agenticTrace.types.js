const AGENTIC_TRACE_SAFE_SHAPE = Object.freeze({
  traceId: 'string',
  requestId: 'string',
  conversationId: 'number|null',
  messageId: 'number|null',
  assistantMessageId: 'number|null',
  learnerRef: 'learner:<id>|null',
  safeStatus: 'started|completed|completed_with_fallback|safety_blocked|failed_safely',
  requestClassification: 'safe booleans only',
  provider: 'provider/model/status/requestIdAvailable/finishReason/latencyMs only',
  adaptive: 'used/status/signalQuality/fallbackReason only',
  planning: 'used/provider/model/decision/fallbackReason/safeErrorCode/latencyMs only',
  toolExecution: 'toolName/status/safeErrorCode/latencyMs/readOnly only',
  actionProposal: 'proposalId/source/actionType/status/mode/riskLevel/requiresConfirmation/trustedTarget only',
  limits: 'counts and configured limits only',
  outcome: 'status/safeErrorCode/fallbackReason/persistence booleans only',
  performance: 'latency summaries only',
  timeline: 'event/status/safeErrorCode only',
});

module.exports = {
  AGENTIC_TRACE_SAFE_SHAPE,
};

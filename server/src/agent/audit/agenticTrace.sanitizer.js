const { DEFAULT_LIMITS, PROPOSAL_STATUSES, TRACE_STATUSES } = require('./agenticTrace.constants');

const MAX_REASON = 80;
const MAX_STATUS = 40;
const MAX_MODEL = 80;
const MAX_TOOL = 80;

function bool(value) {
  return value === true;
}

function positiveInt(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : fallback;
}

function safeString(value, max = 120) {
  if (value === undefined || value === null) return null;
  const text = String(value).replace(/\s+/g, ' ').trim();
  return text ? text.slice(0, max) : null;
}

function enumValue(value, allowed, fallback) {
  const normalized = safeString(value, MAX_STATUS);
  return allowed.has(normalized) ? normalized : fallback;
}

function safeRef(prefix, id) {
  const number = Number(id);
  return Number.isInteger(number) && number > 0 ? `${prefix}:${number}` : null;
}

function statusFromPayload(payload = {}) {
  return enumValue(
    payload.safeStatus || payload.status,
    new Set(Object.values(TRACE_STATUSES)),
    TRACE_STATUSES.STARTED
  );
}

function sanitizeRequestClassification(input = {}) {
  return {
    safetyChecked: bool(input.safetyChecked),
    safetyBlocked: bool(input.safetyBlocked),
    routePlanningIntent: bool(input.routePlanningIntent),
    controlledAgenticEligible: bool(input.controlledAgenticEligible),
    adaptiveRequested: bool(input.adaptiveRequested),
  };
}

function sanitizeProvider(input = {}) {
  return {
    provider: safeString(input.provider, 32),
    model: safeString(input.model, MAX_MODEL),
    status: safeString(input.status, MAX_STATUS),
    requestIdAvailable: Boolean(input.requestIdAvailable || input.providerRequestId),
    finishReason: safeString(input.finishReason, 60),
    latencyMs: input.latencyMs === undefined ? null : positiveInt(input.latencyMs),
  };
}

function sanitizeAdaptive(input = {}) {
  return {
    used: bool(input.used),
    status: safeString(input.status, MAX_STATUS),
    signalQuality: safeString(input.signalQuality, MAX_STATUS),
    fallbackReason: safeString(input.fallbackReason, MAX_REASON),
  };
}

function sanitizePlanning(input = {}) {
  return {
    used: bool(input.used),
    provider: safeString(input.provider, 32),
    model: safeString(input.model, MAX_MODEL),
    decision: safeString(input.decision, 60),
    fallbackReason: safeString(input.fallbackReason, MAX_REASON),
    safeErrorCode: safeString(input.safeErrorCode, 80),
    latencyMs: input.latencyMs === undefined ? null : positiveInt(input.latencyMs),
  };
}

function sanitizeToolExecution(input = {}) {
  return {
    toolName: safeString(input.toolName, MAX_TOOL),
    status: safeString(input.status, MAX_STATUS),
    safeErrorCode: safeString(input.safeErrorCode, 80),
    latencyMs: input.latencyMs === undefined ? null : positiveInt(input.latencyMs),
    readOnly: input.readOnly !== false,
  };
}

function sanitizeActionProposal(input = {}) {
  return {
    proposalId: safeString(input.proposalId, 80),
    source: safeString(input.source || input.proposalSource, 80),
    actionType: safeString(input.actionType, 80),
    status: enumValue(input.status, new Set(Object.values(PROPOSAL_STATUSES)), PROPOSAL_STATUSES.NONE),
    mode: safeString(input.mode, 40),
    riskLevel: safeString(input.riskLevel, 40),
    requiresConfirmation: bool(input.requiresConfirmation),
    trustedTarget: input.trustedTarget === false ? false : Boolean(input.trustedTarget || input.proposalId),
  };
}

function sanitizeLimits(input = {}) {
  return {
    maxModelCalls: positiveInt(input.maxModelCalls, DEFAULT_LIMITS.maxModelCalls),
    maxToolExecutions: positiveInt(input.maxToolExecutions, DEFAULT_LIMITS.maxToolExecutions),
    maxProposalsPerResponse: positiveInt(input.maxProposalsPerResponse, DEFAULT_LIMITS.maxProposalsPerResponse),
    modelRequestCount: positiveInt(input.modelRequestCount, 0),
    toolExecutionCount: positiveInt(input.toolExecutionCount, 0),
  };
}

function sanitizeOutcome(input = {}) {
  return {
    status: safeString(input.status, MAX_STATUS),
    safeErrorCode: safeString(input.safeErrorCode, 80),
    fallbackReason: safeString(input.fallbackReason, MAX_REASON),
    answerPersisted: bool(input.answerPersisted),
    sourcesPersisted: bool(input.sourcesPersisted),
    actionCardsPersisted: bool(input.actionCardsPersisted),
  };
}

function sanitizeWellness(input = {}) {
  return {
    wellnessClassified: bool(input.wellnessClassified || input.classified),
    wellnessDomain: safeString(input.wellnessDomain || input.domain, 80),
    wellnessConfidence: safeString(input.wellnessConfidence || input.confidence, 20),
    wellnessGuidanceType: safeString(input.wellnessGuidanceType || input.guidanceType, 80),
    wellnessStepCount: positiveInt(input.wellnessStepCount || input.stepCount, 0),
  };
}

function sanitizeScope(input = {}) {
  return {
    classification: safeString(input.classification || input.type, 40),
    allowed: bool(input.allowed),
    reasonCode: safeString(input.reasonCode, 80),
    redirectUsed: bool(input.redirectUsed),
  };
}

function sanitizePerformance(input = {}) {
  return {
    totalLatencyMs: input.totalLatencyMs === undefined ? null : positiveInt(input.totalLatencyMs),
    providerLatencyMs: input.providerLatencyMs === undefined ? null : positiveInt(input.providerLatencyMs),
    plannerLatencyMs: input.plannerLatencyMs === undefined ? null : positiveInt(input.plannerLatencyMs),
    toolLatencyMs: input.toolLatencyMs === undefined ? null : positiveInt(input.toolLatencyMs),
  };
}

function sanitizeTimeline(items = []) {
  if (!Array.isArray(items)) return [];
  return items.slice(0, 20).map(item => ({
    at: safeString(item?.at, 40),
    event: safeString(item?.event, 80),
    status: safeString(item?.status, MAX_STATUS),
    safeErrorCode: safeString(item?.safeErrorCode, 80),
  })).filter(item => item.event);
}

function sanitizeTracePayload(value = {}) {
  const status = statusFromPayload(value);
  return {
    traceId: safeString(value.traceId, 80),
    requestId: safeString(value.requestId, 120),
    conversationId: positiveInt(value.conversationId, 0) || null,
    messageId: positiveInt(value.messageId, 0) || null,
    assistantMessageId: positiveInt(value.assistantMessageId, 0) || null,
    learnerRef: safeRef('learner', value.learnerId || value.userId || value.learner?.id),
    safeStatus: status,
    requestClassification: sanitizeRequestClassification(value.requestClassification),
    provider: sanitizeProvider(value.provider),
    adaptive: sanitizeAdaptive(value.adaptive),
    planning: sanitizePlanning(value.planning),
    toolExecution: sanitizeToolExecution(value.toolExecution),
    actionProposal: sanitizeActionProposal(value.actionProposal),
    wellness: sanitizeWellness(value.wellness),
    scope: sanitizeScope(value.scope),
    limits: sanitizeLimits(value.limits),
    outcome: sanitizeOutcome(value.outcome),
    performance: sanitizePerformance(value.performance),
    timeline: sanitizeTimeline(value.timeline),
  };
}

function mergeTracePayload(existing = {}, next = {}) {
  const merged = { ...existing, ...next };
  for (const key of [
    'requestClassification',
    'provider',
    'adaptive',
    'planning',
    'toolExecution',
    'actionProposal',
    'wellness',
    'scope',
    'limits',
    'outcome',
    'performance',
  ]) {
    merged[key] = { ...(existing[key] || {}), ...(next[key] || {}) };
  }
  merged.timeline = [
    ...(Array.isArray(existing.timeline) ? existing.timeline : []),
    ...(Array.isArray(next.timeline) ? next.timeline : []),
  ];
  return sanitizeTracePayload(merged);
}

module.exports = {
  mergeTracePayload,
  sanitizeTracePayload,
};

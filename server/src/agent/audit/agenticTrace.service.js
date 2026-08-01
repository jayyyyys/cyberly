const crypto = require('node:crypto');
const { DEFAULT_LIMITS, PROPOSAL_STATUSES, TRACE_STATUSES } = require('./agenticTrace.constants');
const { mergeTracePayload, sanitizeTracePayload } = require('./agenticTrace.sanitizer');
const { mapTraceDetail, mapTraceSummary } = require('./agenticTrace.mapper');

function nowIso() {
  return new Date().toISOString();
}

function createTraceId() {
  return `agt_${crypto.randomUUID()}`;
}

function safeLog(event, error) {
  console.warn('Agentic trace event failed:', {
    event,
    safeErrorCode: error?.code || 'AGENTIC_TRACE_FAILED',
  });
}

function normalizeLimit(value) {
  const number = Number(value || 20);
  if (!Number.isInteger(number) || number < 1) return 20;
  return Math.min(number, 50);
}

function normalizeOffset(value) {
  const number = Number(value || 0);
  return Number.isInteger(number) && number >= 0 ? number : 0;
}

function createAgenticTraceService(repository) {
  async function startTrace(input = {}) {
    const trace = sanitizeTracePayload({
      traceId: input.traceId || createTraceId(),
      requestId: input.requestId || `agentic-${Date.now().toString(36)}`,
      conversationId: input.conversationId,
      messageId: input.messageId,
      learnerId: input.learnerId || input.userId,
      safeStatus: TRACE_STATUSES.STARTED,
      requestClassification: input.requestClassification,
      limits: {
        ...DEFAULT_LIMITS,
        ...(input.limits || {}),
      },
      timeline: [{ at: nowIso(), event: 'trace_started', status: TRACE_STATUSES.STARTED }],
    });
    try {
      const row = await repository.insertTrace({
        ...trace,
        learnerId: input.learnerId || input.userId,
      });
      return row?.trace || trace;
    } catch (error) {
      safeLog('start', error);
      return trace;
    }
  }

  async function updateTrace(traceId, patch = {}, status = null) {
    if (!traceId) return null;
    try {
      const existing = await repository.findByTraceId(traceId);
      if (!existing) return null;
      const merged = mergeTracePayload(existing.trace, {
        ...patch,
        traceId,
        requestId: existing.requestId,
        safeStatus: status || patch.safeStatus || existing.safeStatus,
      });
      return await repository.updateTrace(traceId, merged, merged.safeStatus);
    } catch (error) {
      safeLog('update', error);
      return null;
    }
  }

  function timeline(event, status, safeErrorCode = null) {
    return [{ at: nowIso(), event, status, safeErrorCode }];
  }

  async function markSafetyBlocked(traceId, safeErrorCode) {
    return updateTrace(traceId, {
      requestClassification: { safetyChecked: true, safetyBlocked: true },
      outcome: { status: TRACE_STATUSES.SAFETY_BLOCKED, safeErrorCode },
      timeline: timeline('safety_blocked', TRACE_STATUSES.SAFETY_BLOCKED, safeErrorCode),
    }, TRACE_STATUSES.SAFETY_BLOCKED);
  }

  async function markCompleted(traceId, patch = {}) {
    const hasFallback = Boolean(
      patch.outcome?.fallbackReason ||
      patch.planning?.fallbackReason ||
      patch.adaptive?.fallbackReason
    );
    const status = hasFallback ? TRACE_STATUSES.COMPLETED_WITH_FALLBACK : TRACE_STATUSES.COMPLETED;
    return updateTrace(traceId, {
      ...patch,
      outcome: { ...(patch.outcome || {}), status },
      timeline: timeline('trace_completed', status),
    }, status);
  }

  async function markFailedSafely(traceId, safeErrorCode, fallbackReason = null) {
    return updateTrace(traceId, {
      outcome: { status: TRACE_STATUSES.FAILED_SAFELY, safeErrorCode, fallbackReason },
      timeline: timeline('trace_failed_safely', TRACE_STATUSES.FAILED_SAFELY, safeErrorCode),
    }, TRACE_STATUSES.FAILED_SAFELY);
  }

  async function recordProposalCreated(traceId, proposal = {}) {
    return updateTrace(traceId, {
      actionProposal: {
        proposalId: proposal.proposalId,
        source: proposal.proposalSource,
        actionType: proposal.actionType,
        status: PROPOSAL_STATUSES.PENDING,
        mode: proposal.mode,
        riskLevel: proposal.riskLevel,
        requiresConfirmation: proposal.requiresConfirmation,
        trustedTarget: true,
      },
      timeline: timeline('proposal_created', PROPOSAL_STATUSES.PENDING),
    });
  }

  async function recordProposalStatus(traceId, proposal = {}, status, safeErrorCode = null) {
    return updateTrace(traceId, {
      actionProposal: {
        proposalId: proposal.proposalId,
        source: proposal.proposalSource,
        actionType: proposal.actionType,
        status,
        mode: proposal.mode,
        riskLevel: proposal.riskLevel,
        requiresConfirmation: proposal.requiresConfirmation,
        trustedTarget: true,
      },
      timeline: timeline(`proposal_${status}`, status, safeErrorCode),
    });
  }

  async function listTraces(query = {}) {
    const limit = normalizeLimit(query.limit);
    const offset = normalizeOffset(query.offset);
    const result = await repository.listTraces({
      limit,
      offset,
      status: query.status || '',
      proposalStatus: query.proposalStatus || '',
      from: query.from || '',
      to: query.to || '',
    });
    return {
      items: result.items.map(mapTraceSummary),
      pagination: {
        limit,
        offset,
        total: result.total,
        hasMore: offset + limit < result.total,
      },
    };
  }

  async function getTrace(traceId) {
    const row = await repository.findByTraceId(traceId);
    return row ? mapTraceDetail(row) : null;
  }

  return {
    getTrace,
    listTraces,
    markCompleted,
    markFailedSafely,
    markSafetyBlocked,
    recordProposalCreated,
    recordProposalStatus,
    startTrace,
    updateTrace,
  };
}

module.exports = {
  createAgenticTraceService,
};

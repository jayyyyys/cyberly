const { localeFromRequest, normalizeLocale } = require('../../i18n/locale');
const { createProposalId, createToken, normalizeProposalBody } = require('./actionValidation');
const { createActionCatalogue } = require('./actionCatalogue');
const { actionError } = require('./actionErrors');
const {
  DEFERRED_ACTION_TYPES,
  ENABLED_ACTION_TYPES,
  PROHIBITED_ACTION_TYPES,
} = require('./actionPolicy');

const DEFAULT_PROPOSAL_TTL_SECONDS = 180;

function nowIso() {
  return new Date().toISOString();
}

function expiresAtIso(ttlSeconds) {
  return new Date(Date.now() + ttlSeconds * 1000).toISOString();
}

function safeSessionId(req) {
  return req.sessionID || req.session?.id || '';
}

function buildContextFromRequest(req) {
  return {
    userId: req.session?.userId,
    role: req.session?.role,
    sessionId: safeSessionId(req),
    requestedLocale: localeFromRequest(req),
  };
}

function assertAuthenticatedLearner(context) {
  if (!context.userId) throw actionError(401, 'AUTH_REQUIRED', 'Authentication required.');
  if (context.role !== 'user') throw actionError(403, 'ACTION_OWNERSHIP_DENIED', 'Learner action is not available.');
}

function mapProposal(proposal, { includeToken = true } = {}) {
  return {
    proposalId: proposal.proposalId,
    actionType: proposal.actionType,
    title: proposal.title,
    explanation: proposal.explanation,
    consequence: proposal.consequence,
    mode: proposal.mode,
    riskLevel: proposal.riskLevel,
    target: proposal.target,
    requiresConfirmation: proposal.requiresConfirmation,
    status: proposal.status,
    createdAt: proposal.createdAt,
    expiresAt: proposal.expiresAt,
    ...(includeToken && proposal.status === 'pending' ? { confirmationToken: proposal.confirmationToken } : {}),
  };
}

function mapResult(proposal) {
  return {
    proposal: mapProposal(proposal, { includeToken: false }),
    result: proposal.result || null,
  };
}

function createInMemoryProposalStore() {
  const proposals = new Map();

  function get(proposalId) {
    return proposals.get(proposalId) || null;
  }

  function set(proposal) {
    proposals.set(proposal.proposalId, proposal);
    return proposal;
  }

  function clear() {
    proposals.clear();
  }

  return {
    clear,
    get,
    set,
  };
}

function createActionProposalService({ pool, store = createInMemoryProposalStore(), ttlSeconds = DEFAULT_PROPOSAL_TTL_SECONDS, agenticTraceService = null } = {}) {
  if (!pool) throw new Error('pool is required');
  const catalogue = createActionCatalogue(pool);

  function assertProposalOwned(proposal, context) {
    if (!proposal) throw actionError(404, 'ACTION_PROPOSAL_INVALID', 'Action proposal was not found.');
    if (proposal.userId !== context.userId || proposal.sessionId !== context.sessionId) {
      throw actionError(403, 'ACTION_OWNERSHIP_DENIED', 'Action proposal is not available.');
    }
  }

  async function recordProposalStatus(proposal, status, safeErrorCode = null) {
    if (!agenticTraceService || !proposal?.traceId) return;
    await agenticTraceService.recordProposalStatus(proposal.traceId, proposal, status, safeErrorCode).catch(() => {});
  }

  async function assertPending(proposal) {
    if (proposal.status === 'completed') return;
    if (proposal.status === 'cancelled') throw actionError(409, 'ACTION_PROPOSAL_CANCELLED', 'Action proposal was cancelled.');
    if (proposal.status === 'expired' || Date.parse(proposal.expiresAt) <= Date.now()) {
      proposal.status = 'expired';
      await recordProposalStatus(proposal, 'expired', 'ACTION_PROPOSAL_EXPIRED');
      throw actionError(410, 'ACTION_PROPOSAL_EXPIRED', 'Action proposal is no longer available.');
    }
    if (proposal.status !== 'pending' && proposal.status !== 'processing') {
      throw actionError(409, 'ACTION_PROPOSAL_INVALID', 'Action proposal is not pending.');
    }
  }

  async function createProposal({ context, body, proposalSource = 'deterministic_action_card', traceId = null, requestId = null } = {}) {
    assertAuthenticatedLearner(context);
    const normalized = normalizeProposalBody(body, context.requestedLocale);
    const preview = await catalogue.preview(normalized.actionType, {
      context,
      locale: normalizeLocale(normalized.locale),
      parameters: normalized.parameters,
    });
    const createdAt = nowIso();
    let resolvedTraceId = traceId;
    if (!resolvedTraceId && agenticTraceService) {
      const trace = await agenticTraceService.startTrace({
        requestId: requestId || `proposal-${createdAt}`,
        userId: context.userId,
        requestClassification: {
          safetyChecked: true,
          safetyBlocked: false,
          controlledAgenticEligible: false,
        },
        limits: {
          maxModelCalls: 0,
          maxToolExecutions: 0,
          maxProposalsPerResponse: 1,
        },
      });
      resolvedTraceId = trace?.traceId || null;
    }
    const proposal = {
      proposalId: createProposalId(),
      confirmationToken: createToken(),
      userId: context.userId,
      sessionId: context.sessionId,
      actionType: normalized.actionType,
      parameters: preview.parameters,
      title: preview.title,
      explanation: preview.explanation,
      consequence: preview.consequence,
      mode: preview.mode,
      riskLevel: preview.riskLevel,
      target: preview.target,
      requiresConfirmation: preview.requiresConfirmation,
      status: 'pending',
      createdAt,
      expiresAt: expiresAtIso(preview.expirySeconds || ttlSeconds),
      result: null,
      executingPromise: null,
      locale: normalizeLocale(normalized.locale),
      proposalSource,
      traceId: resolvedTraceId,
    };
    store.set(proposal);
    if (agenticTraceService && proposal.traceId) {
      await agenticTraceService.recordProposalCreated(proposal.traceId, proposal).catch(() => {});
    }
    return { proposal: mapProposal(proposal) };
  }

  async function createProposalFromRequest(req) {
    return createProposal({
      context: buildContextFromRequest(req),
      body: req.body,
      proposalSource: 'deterministic_action_card',
    });
  }

  async function createProposalFromCanonical({ context, actionProposal, proposalSource = 'model_suggested_action' } = {}) {
    return createProposal({
      context,
      body: { actionProposal },
      proposalSource,
      traceId: context?.traceId || null,
      requestId: context?.requestId || null,
    });
  }

  async function confirmProposalFromRequest(req) {
    const context = buildContextFromRequest(req);
    assertAuthenticatedLearner(context);
    const proposal = store.get(req.params.proposalId);
    assertProposalOwned(proposal, context);
    await assertPending(proposal);
    if (proposal.status === 'completed') return mapResult(proposal);
    if (proposal.confirmationToken !== String(req.body?.confirmationToken || '')) {
      throw actionError(403, 'ACTION_CONFIRMATION_REQUIRED', 'Action confirmation token is invalid.');
    }
    if (proposal.executingPromise) return proposal.executingPromise;

    proposal.status = 'processing';
    proposal.executingPromise = (async () => {
      try {
        const result = await catalogue.execute(proposal.actionType, {
          context,
          locale: proposal.locale,
          parameters: proposal.parameters,
        });
        proposal.status = 'completed';
        proposal.result = result;
        proposal.completedAt = nowIso();
        await recordProposalStatus(proposal, 'completed');
        return mapResult(proposal);
      } catch (error) {
        proposal.status = 'pending';
        await recordProposalStatus(proposal, 'failed', error.code || 'ACTION_PROPOSAL_FAILED');
        throw error;
      } finally {
        proposal.executingPromise = null;
      }
    })();
    return proposal.executingPromise;
  }

  async function cancelProposalFromRequest(req) {
    const context = buildContextFromRequest(req);
    assertAuthenticatedLearner(context);
    const proposal = store.get(req.params.proposalId);
    assertProposalOwned(proposal, context);
    if (proposal.status === 'completed') return mapResult(proposal);
    if (proposal.status === 'expired' || Date.parse(proposal.expiresAt) <= Date.now()) {
      proposal.status = 'expired';
      await recordProposalStatus(proposal, 'expired', 'ACTION_PROPOSAL_EXPIRED');
      throw actionError(410, 'ACTION_PROPOSAL_EXPIRED', 'Action proposal is no longer available.');
    }
    proposal.status = 'cancelled';
    proposal.cancelledAt = nowIso();
    await recordProposalStatus(proposal, 'cancelled');
    return mapResult(proposal);
  }

  function getRuntimeStatus() {
    return {
      status: 'enabled',
      executionAuthority: 'learner_confirmation',
      automaticExecution: false,
      maximumProposalsPerResponse: 1,
      writeToolsExposedToModel: 0,
      confirmationRevalidation: true,
      replayProtection: true,
      learnerMayCancel: true,
      enabledActions: ENABLED_ACTION_TYPES,
      deferredActions: DEFERRED_ACTION_TYPES,
      prohibitedActions: PROHIBITED_ACTION_TYPES,
      catalogue: catalogue.listSafeMetadata(),
      storage: 'in_memory_short_lived',
    };
  }

  return {
    cancelProposalFromRequest,
    confirmProposalFromRequest,
    createProposalFromCanonical,
    createProposalFromRequest,
    getRuntimeStatus,
    store,
  };
}

module.exports = {
  DEFAULT_PROPOSAL_TTL_SECONDS,
  createActionProposalService,
  createInMemoryProposalStore,
};

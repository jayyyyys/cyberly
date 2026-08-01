const TRACE_STATUSES = Object.freeze({
  STARTED: 'started',
  COMPLETED: 'completed',
  COMPLETED_WITH_FALLBACK: 'completed_with_fallback',
  SAFETY_BLOCKED: 'safety_blocked',
  FAILED_SAFELY: 'failed_safely',
});

const PROPOSAL_STATUSES = Object.freeze({
  NONE: 'none',
  PENDING: 'pending',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
  REJECTED: 'rejected',
  FAILED: 'failed',
});

const DEFAULT_LIMITS = Object.freeze({
  maxModelCalls: 2,
  maxToolExecutions: 1,
  maxProposalsPerResponse: 1,
});

module.exports = {
  DEFAULT_LIMITS,
  PROPOSAL_STATUSES,
  TRACE_STATUSES,
};

function mapTraceSummary(row) {
  const trace = row?.trace || {};
  return {
    traceId: row.traceId,
    requestId: row.requestId,
    conversationId: row.conversationId,
    messageId: row.messageId,
    learnerRef: row.learnerRef,
    safeStatus: row.safeStatus,
    requestClassification: trace.requestClassification || {},
    provider: trace.provider || {},
    adaptive: trace.adaptive || {},
    planning: trace.planning || {},
    toolExecution: trace.toolExecution || {},
    actionProposal: trace.actionProposal || {},
    wellness: trace.wellness || {},
    scope: trace.scope || {},
    limits: trace.limits || {},
    outcome: trace.outcome || {},
    performance: trace.performance || {},
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    completedAt: row.completedAt,
  };
}

function mapTraceDetail(row) {
  return {
    ...mapTraceSummary(row),
    timeline: row.trace?.timeline || [],
  };
}

module.exports = {
  mapTraceDetail,
  mapTraceSummary,
};

const { sanitizeTracePayload } = require('./agenticTrace.sanitizer');

function parseJson(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function mapRow(row) {
  if (!row) return null;
  const trace = sanitizeTracePayload({
    ...parseJson(row.trace_json),
    traceId: row.trace_id,
    requestId: row.request_id,
    conversationId: row.conversation_id,
    messageId: row.message_id,
    learnerId: row.learner_id,
    safeStatus: row.safe_status,
  });
  return {
    id: row.id,
    traceId: row.trace_id,
    requestId: row.request_id,
    conversationId: row.conversation_id || null,
    messageId: row.message_id || null,
    learnerRef: trace.learnerRef,
    safeStatus: row.safe_status,
    trace,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
    completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null,
  };
}

function createAgenticTraceRepository(pool) {
  async function insertTrace(payload) {
    const safe = sanitizeTracePayload(payload);
    await pool.query(
      `INSERT INTO agentic_execution_traces
         (trace_id, request_id, conversation_id, message_id, learner_id, safe_status, trace_json, completed_at)
       VALUES (?, ?, ?, ?, ?, ?, CAST(? AS JSON), ?)`,
      [
        safe.traceId,
        safe.requestId,
        safe.conversationId,
        safe.messageId,
        payload.learnerId || payload.userId || payload.learner?.id || null,
        safe.safeStatus,
        JSON.stringify(safe),
        ['completed', 'completed_with_fallback', 'safety_blocked', 'failed_safely'].includes(safe.safeStatus) ? new Date() : null,
      ]
    );
    return findByTraceId(safe.traceId);
  }

  async function findByTraceId(traceId) {
    const [rows] = await pool.query(
      `SELECT *
       FROM agentic_execution_traces
       WHERE trace_id = ?
       LIMIT 1`,
      [traceId]
    );
    return mapRow(rows[0]);
  }

  async function updateTrace(traceId, payload, safeStatus) {
    const safe = sanitizeTracePayload({ ...payload, traceId, safeStatus: safeStatus || payload.safeStatus });
    await pool.query(
      `UPDATE agentic_execution_traces
       SET safe_status = ?,
           conversation_id = COALESCE(?, conversation_id),
           message_id = COALESCE(?, message_id),
           trace_json = CAST(? AS JSON),
           completed_at = CASE
             WHEN ? IN ('completed', 'completed_with_fallback', 'safety_blocked', 'failed_safely') THEN COALESCE(completed_at, CURRENT_TIMESTAMP)
             ELSE completed_at
           END
       WHERE trace_id = ?`,
      [
        safe.safeStatus,
        safe.conversationId,
        safe.messageId,
        JSON.stringify(safe),
        safe.safeStatus,
        traceId,
      ]
    );
    return findByTraceId(traceId);
  }

  async function listTraces({ limit = 20, offset = 0, status = '', proposalStatus = '', from = '', to = '' } = {}) {
    const where = [];
    const params = [];
    if (status) {
      where.push('safe_status = ?');
      params.push(status);
    }
    if (proposalStatus) {
      where.push("JSON_UNQUOTE(JSON_EXTRACT(trace_json, '$.actionProposal.status')) = ?");
      params.push(proposalStatus);
    }
    if (from) {
      where.push('created_at >= ?');
      params.push(from);
    }
    if (to) {
      where.push('created_at <= ?');
      params.push(to);
    }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [[countRow]] = await pool.query(
      `SELECT COUNT(*) AS count FROM agentic_execution_traces ${clause}`,
      params
    );
    const [rows] = await pool.query(
      `SELECT *
       FROM agentic_execution_traces
       ${clause}
       ORDER BY created_at DESC, id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    return {
      items: rows.map(mapRow).filter(Boolean),
      total: Number(countRow?.count || 0),
    };
  }

  return {
    findByTraceId,
    insertTrace,
    listTraces,
    updateTrace,
  };
}

module.exports = {
  createAgenticTraceRepository,
  mapAgenticTraceRow: mapRow,
};

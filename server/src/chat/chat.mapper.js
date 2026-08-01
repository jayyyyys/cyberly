const { ERROR_CODES } = require('../errors/errorCodes');

function toIso(value) {
  if (!value) return null;
  return new Date(value).toISOString();
}

function mapConversation(row) {
  if (!row) return null;

  return {
    id: row.id,
    title: row.title,
    locale: row.locale,
    messageCount: Number(row.message_count || 0),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    lastMessageAt: toIso(row.last_message_at),
  };
}

function mapMessage(row) {
  if (!row) return null;

  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role,
    content: row.content,
    locale: row.locale || null,
    replyToMessageId: row.reply_to_message_id || null,
    createdAt: toIso(row.created_at),
  };
}

function mapGenerationState(row, options = {}) {
  if (!row) return null;

  const staleMs = Number(options.staleMs || 60000);
  const now = Number(options.now || Date.now());
  const updatedAtMs = row.updated_at ? new Date(row.updated_at).getTime() : 0;
  const isPotentiallyStale = ['pending', 'in_progress'].includes(row.status);
  const stale = isPotentiallyStale && updatedAtMs && now - updatedAtMs > staleMs;
  const completedWithoutAssistant = row.status === 'completed' &&
    (!row.assistant_message_id || Number(row.assistant_exists || 0) !== 1);

  let status = row.status;
  let errorCode = row.error_code || null;

  if (stale) {
    status = 'failed';
    errorCode = ERROR_CODES.AI_TIMEOUT;
  } else if (completedWithoutAssistant) {
    status = 'failed';
    errorCode = ERROR_CODES.AI_ASSISTANT_PERSISTENCE_FAILED;
  }

  return {
    userMessageId: row.user_message_id,
    assistantMessageId: row.assistant_message_id || null,
    status,
    errorCode,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    completedAt: toIso(row.completed_at),
  };
}

const ALLOWED_TARGET_FIELDS = new Set([
  'page',
  'resourceId',
  'resourceSlug',
  'scenarioId',
  'scenarioSlug',
  'sectionId',
]);

const ALLOWED_TARGET_PAGES = new Set(['resources', 'scenarios', 'progress', 'assessment']);
const ALLOWED_SOURCE_TARGET_PAGES = new Set(['resources']);

function parseTarget(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function safeTarget(value) {
  const parsed = parseTarget(value);
  if (!parsed || typeof parsed !== 'object') return null;
  if (!ALLOWED_TARGET_PAGES.has(parsed.page)) return null;

  const target = {};
  for (const [key, item] of Object.entries(parsed)) {
    if (!ALLOWED_TARGET_FIELDS.has(key)) continue;
    target[key] = item;
  }
  return target.page ? target : null;
}

function safeSourceTarget(value) {
  const parsed = parseTarget(value);
  if (!parsed || typeof parsed !== 'object') return null;
  if (!ALLOWED_SOURCE_TARGET_PAGES.has(parsed.page)) return null;

  const target = { page: parsed.page };
  if (parsed.resourceSlug) target.resourceSlug = String(parsed.resourceSlug);
  if (parsed.resourceId !== undefined && parsed.resourceId !== null) {
    const resourceId = Number(parsed.resourceId);
    if (Number.isInteger(resourceId) && resourceId > 0) target.resourceId = resourceId;
  }
  return target;
}

function mapAction(row) {
  if (!row) return null;
  const target = safeTarget(row.target_json);
  if (!target) return null;

  return {
    id: row.id,
    type: row.action_type,
    labelKey: row.label_key,
    title: row.title || null,
    description: row.description || null,
    target,
    displayOrder: Number(row.display_order || 0),
  };
}

function mapSource(row) {
  if (!row) return null;
  return {
    id: row.id,
    messageId: row.message_id,
    title: row.source_title,
    sourceLabel: row.source_label || null,
    sourceOrganisation: row.source_organisation || null,
    sourceUrl: row.source_url || null,
    locale: row.source_locale || null,
    snippet: row.snippet || null,
    internalTarget: safeSourceTarget(row.internal_target_json),
    citationOrder: Number(row.citation_order || 0),
  };
}

module.exports = {
  mapAction,
  mapGenerationState,
  mapConversation,
  mapMessage,
  mapSource,
};

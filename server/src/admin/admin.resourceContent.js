const { SUPPORTED_LOCALES } = require('../i18n/locale');
const { evaluateResourceRagEligibility, toBoolean } = require('../resource/resource.governance');
const { parseContent } = require('../resource/resource.mapper');

const SUPPORTED_LOCALE_SET = new Set(SUPPORTED_LOCALES);
const ALLOWED_CONTENT_FIELDS = new Set(['locale', 'title', 'summary', 'body', 'expectedUpdatedAt']);
const TITLE_MAX_LENGTH = 180;
const SUMMARY_MAX_LENGTH = 500;
const BODY_MAX_LENGTH = 24000;

function httpError(status, code, message, extra = {}) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  Object.assign(error, extra);
  return error;
}

function formatTimestamp(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function contentItemToText(item) {
  if (typeof item === 'string') return item;
  if (!item || typeof item !== 'object') return '';
  const heading = String(item.heading || item.title || item.label || '').trim();
  const body = String(item.body || item.text || item.content || item.description || '').trim();
  return [heading, body].filter(Boolean).join('\n');
}

function contentJsonToBody(value) {
  return parseContent(value).map(contentItemToText).filter(Boolean).join('\n\n');
}

function bodyToContentJson(value) {
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map(part => part.trim())
    .filter(Boolean);
}

function mapResourceForContent(row) {
  const eligibility = evaluateResourceRagEligibility(row);
  return {
    id: row.id,
    slug: row.slug,
    category: row.category_code,
    categoryCode: row.category_code,
    topic: row.category_code,
    publicationStatus: row.status,
    reviewStatus: row.review_status,
    ragReady: toBoolean(row.rag_ready),
    effectiveRagEligible: eligibility.effectiveRagEligible,
    effectiveRagReasons: eligibility.reasons,
    updatedAt: formatTimestamp(row.updated_at),
  };
}

function mapTranslation(row) {
  if (!row) return null;
  return {
    locale: row.locale,
    title: row.title,
    summary: row.summary,
    body: contentJsonToBody(row.content_json),
    updatedAt: formatTimestamp(row.updated_at),
    exists: true,
  };
}

function buildTranslationsMap(rows) {
  const byLocale = new Map(rows.map(row => [row.locale, row]));
  return SUPPORTED_LOCALES.reduce((translations, locale) => {
    translations[locale] = mapTranslation(byLocale.get(locale));
    return translations;
  }, {});
}

function validateContentPayload(body = {}) {
  const unknownFields = Object.keys(body).filter(field => !ALLOWED_CONTENT_FIELDS.has(field));
  if (unknownFields.length) {
    throw httpError(400, 'ADMIN_RESOURCE_CONTENT_UNKNOWN_FIELDS', 'Unknown content fields are not allowed.', {
      errors: { fields: unknownFields },
    });
  }

  const locale = String(body.locale || '').trim();
  if (!SUPPORTED_LOCALE_SET.has(locale)) {
    throw httpError(400, 'ADMIN_RESOURCE_CONTENT_INVALID_LOCALE', 'Translation locale is invalid.');
  }

  const title = String(body.title ?? '').trim();
  const summary = String(body.summary ?? '').trim();
  const textBody = String(body.body ?? '').trim();
  const errors = {};

  if (!title) errors.title = 'required';
  if (title.length > TITLE_MAX_LENGTH) errors.title = 'too_long';
  if (!summary) errors.summary = 'required';
  if (summary.length > SUMMARY_MAX_LENGTH) errors.summary = 'too_long';
  if (!textBody) errors.body = 'required';
  if (textBody.length > BODY_MAX_LENGTH) errors.body = 'too_long';

  if (Object.keys(errors).length) {
    throw httpError(400, 'ADMIN_RESOURCE_CONTENT_INVALID', 'Resource translation content is invalid.', { errors });
  }

  return {
    locale,
    title,
    summary,
    body: textBody,
    contentJson: bodyToContentJson(textBody),
    expectedUpdatedAt: body.expectedUpdatedAt ? String(body.expectedUpdatedAt).trim() : null,
  };
}

async function fetchContentResource(poolOrConnection, resourceId, lock = false) {
  const [rows] = await poolOrConnection.query(
    `SELECT id,
            slug,
            category_code,
            status,
            review_status,
            rag_ready,
            updated_at
     FROM resource_articles
     WHERE id = ?
     ${lock ? 'FOR UPDATE' : ''}`,
    [resourceId]
  );
  return rows[0] || null;
}

async function fetchContentTranslations(poolOrConnection, resourceId, lock = false) {
  const [rows] = await poolOrConnection.query(
    `SELECT resource_id,
            locale,
            title,
            summary,
            content_json,
            source_label,
            updated_at
     FROM resource_article_translations
     WHERE resource_id = ?
     ORDER BY FIELD(locale, 'en', 'ms', 'zh-CN'), locale
     ${lock ? 'FOR UPDATE' : ''}`,
    [resourceId]
  );
  return rows;
}

async function fetchContentTranslation(poolOrConnection, resourceId, locale, lock = false) {
  const [rows] = await poolOrConnection.query(
    `SELECT resource_id,
            locale,
            title,
            summary,
            content_json,
            source_label,
            updated_at
     FROM resource_article_translations
     WHERE resource_id = ? AND locale = ?
     LIMIT 1
     ${lock ? 'FOR UPDATE' : ''}`,
    [resourceId, locale]
  );
  return rows[0] || null;
}

async function fetchFallbackSourceLabel(poolOrConnection, resourceId) {
  const [rows] = await poolOrConnection.query(
    `SELECT source_label
     FROM resource_article_translations
     WHERE resource_id = ?
     ORDER BY FIELD(locale, 'en', 'ms', 'zh-CN'), locale
     LIMIT 1`,
    [resourceId]
  );
  return rows[0]?.source_label || null;
}

async function saveContentTranslation(connection, resourceId, payload) {
  const current = await fetchContentTranslation(connection, resourceId, payload.locale, true);
  if (current && payload.expectedUpdatedAt && formatTimestamp(current.updated_at) !== payload.expectedUpdatedAt) {
    throw httpError(409, 'ADMIN_RESOURCE_CONTENT_STALE', 'Translation changed elsewhere. Reload the latest version.');
  }

  if (current) {
    await connection.query(
      `UPDATE resource_article_translations
       SET title = ?,
           summary = ?,
           content_json = CAST(? AS JSON),
           updated_at = CURRENT_TIMESTAMP(3)
       WHERE resource_id = ? AND locale = ?`,
      [
        payload.title,
        payload.summary,
        JSON.stringify(payload.contentJson),
        resourceId,
        payload.locale,
      ]
    );
  } else {
    const sourceLabel = await fetchFallbackSourceLabel(connection, resourceId);
    await connection.query(
      `INSERT INTO resource_article_translations (
          resource_id,
          locale,
          title,
          summary,
          content_json,
          source_label
       )
       VALUES (?, ?, ?, ?, CAST(? AS JSON), ?)`,
      [
        resourceId,
        payload.locale,
        payload.title,
        payload.summary,
        JSON.stringify(payload.contentJson),
        sourceLabel,
      ]
    );
  }

  await connection.query(
    `UPDATE resource_articles
     SET updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [resourceId]
  );

  return fetchContentTranslation(connection, resourceId, payload.locale);
}

module.exports = {
  SUPPORTED_LOCALES,
  buildTranslationsMap,
  fetchContentResource,
  fetchContentTranslations,
  httpError,
  mapResourceForContent,
  mapTranslation,
  saveContentTranslation,
  validateContentPayload,
};

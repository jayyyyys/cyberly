const { evaluateResourceRagEligibility, toBoolean } = require('../resource/resource.governance');
const {
  SUPPORTED_LOCALES,
  buildTranslationsMap,
  httpError,
  mapTranslation,
  validateContentPayload,
} = require('./admin.resourceContent');

const RESOURCE_CATEGORY_LABELS = {
  Beginner: 'Beginner / Digital Foundations',
  Scams: 'Scams & Social Engineering',
  Passwords: 'Passwords & Account Security',
  Privacy: 'Privacy & Personal Data Protection',
  Safety: 'Online Safety & Digital Wellbeing',
  Misinformation: 'Misinformation & Media Literacy',
  'AI & Technology': 'AI & Technology Safety',
};

const SOURCE_TYPES = [
  'government_cybersecurity_agency',
  'government_response_center',
  'government_fact_check_portal',
  'government_regulator_page',
  'government_data_protection_authority',
  'official_portal',
  'international_law_enforcement',
  'recognised_ngo',
  'education_web',
  'general_web',
  'test_source',
];

const SOURCE_COUNTRIES = ['MY', 'SG', 'US', 'global'];

const SOURCE_AUTHORITY_LEVELS = [
  'official_agency',
  'official_national_response',
  'official_portal',
  'official_press_or_media_page',
  'official_regulator',
  'recognised_international',
  'recognised_ngo',
  'general_web',
  'test_authority',
];

const AGE_SUITABILITY_OPTIONS = ['13-17', 'all_teens', 'older_teens'];

const ALLOWED_CREATE_FIELDS = new Set(['slug', 'categoryCode', 'source', 'safety', 'translation']);
const ALLOWED_SOURCE_FIELDS = new Set([
  'label',
  'url',
  'type',
  'country',
  'authorityLevel',
  'lastCheckedAt',
  'replacementNeeded',
]);
const ALLOWED_SAFETY_FIELDS = new Set(['ageAppropriateness', 'sensitiveTopic', 'malaysiaGuidance']);
const ALLOWED_CREATE_TRANSLATION_FIELDS = new Set(['locale', 'title', 'summary', 'body', 'sourceLabel']);
const ALLOWED_METADATA_FIELDS = new Set([
  'categoryCode',
  'sourceLabel',
  'sourceUrl',
  'sourceType',
  'sourceCountry',
  'sourceAuthorityLevel',
  'lastSourceCheckedAt',
  'replacementSourceNeeded',
  'malaysiaGuidanceFlag',
  'sensitiveTopicFlag',
  'ageAppropriateness',
  'expectedUpdatedAt',
]);

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const BODY_MAX_LENGTH = 24000;

function formatTimestamp(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function formatDate(value) {
  if (!value) return null;
  return String(value).slice(0, 10);
}

function assertNoUnknownFields(body, allowed, code) {
  const unknownFields = Object.keys(body || {}).filter(field => !allowed.has(field));
  if (unknownFields.length) {
    throw httpError(400, code, 'Unknown fields are not allowed.', { errors: { fields: unknownFields } });
  }
}

function normalizeBoolean(value, field) {
  if (value === undefined) return undefined;
  if (value === true || value === false) return value;
  throw httpError(400, 'ADMIN_RESOURCE_INVALID_BOOLEAN', `${field} must be a boolean.`, { errors: { [field]: 'invalid' } });
}

function normalizeOptionalText(value, field, maxLength = 255) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const text = String(value).trim();
  if (!text) return null;
  if (text.length > maxLength) {
    throw httpError(400, 'ADMIN_RESOURCE_METADATA_INVALID', `${field} is too long.`, { errors: { [field]: 'too_long' } });
  }
  return text;
}

function normalizeDate(value, field) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const text = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw httpError(400, 'ADMIN_RESOURCE_INVALID_DATE', `${field} is invalid.`, { errors: { [field]: 'invalid' } });
  }
  const date = new Date(`${text}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw httpError(400, 'ADMIN_RESOURCE_INVALID_DATE', `${field} is invalid.`, { errors: { [field]: 'invalid' } });
  }
  return text;
}

function normalizeSourceUrl(value, required = false) {
  if (value === undefined) return undefined;
  if (value === null || String(value).trim() === '') {
    if (required) throw httpError(400, 'ADMIN_RESOURCE_SOURCE_URL_REQUIRED', 'Source URL is required.');
    return null;
  }
  const text = String(value).trim();
  if (text.length > 500) {
    throw httpError(400, 'ADMIN_RESOURCE_INVALID_SOURCE_URL', 'Source URL is too long.');
  }
  let parsed;
  try {
    parsed = new URL(text);
  } catch {
    throw httpError(400, 'ADMIN_RESOURCE_INVALID_SOURCE_URL', 'Source URL is malformed.');
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw httpError(400, 'ADMIN_RESOURCE_INVALID_SOURCE_URL', 'Source URL must use http or https.');
  }
  if (parsed.username || parsed.password) {
    throw httpError(400, 'ADMIN_RESOURCE_INVALID_SOURCE_URL', 'Source URL must not include embedded credentials.');
  }
  return parsed.toString();
}

function normalizeSlug(value) {
  const slug = String(value || '').trim();
  if (!slug || !SLUG_PATTERN.test(slug)) {
    throw httpError(400, 'ADMIN_RESOURCE_INVALID_SLUG', 'Resource slug is invalid.', { errors: { slug: 'invalid' } });
  }
  return slug;
}

function normalizeCategory(value, validCategories) {
  const categoryCode = String(value || '').trim();
  if (!validCategories.has(categoryCode)) {
    throw httpError(400, 'ADMIN_RESOURCE_INVALID_CATEGORY', 'Resource category is invalid.', { errors: { categoryCode: 'invalid' } });
  }
  return categoryCode;
}

function normalizeOption(value, allowed, field) {
  if (value === undefined || value === null || value === '') return null;
  const text = String(value).trim();
  if (!allowed.includes(text)) {
    throw httpError(400, 'ADMIN_RESOURCE_METADATA_INVALID', `${field} is invalid.`, { errors: { [field]: 'invalid' } });
  }
  return text;
}

function validateCreatePayload(body, validCategories) {
  assertNoUnknownFields(body, ALLOWED_CREATE_FIELDS, 'ADMIN_RESOURCE_CREATE_UNKNOWN_FIELDS');
  assertNoUnknownFields(body.source || {}, ALLOWED_SOURCE_FIELDS, 'ADMIN_RESOURCE_CREATE_UNKNOWN_SOURCE_FIELDS');
  assertNoUnknownFields(body.safety || {}, ALLOWED_SAFETY_FIELDS, 'ADMIN_RESOURCE_CREATE_UNKNOWN_SAFETY_FIELDS');
  assertNoUnknownFields(body.translation || {}, ALLOWED_CREATE_TRANSLATION_FIELDS, 'ADMIN_RESOURCE_CREATE_UNKNOWN_TRANSLATION_FIELDS');

  const slug = normalizeSlug(body.slug);
  const categoryCode = normalizeCategory(body.categoryCode, validCategories);
  const source = body.source || {};
  const safety = body.safety || {};
  const translation = body.translation || {};

  const locale = String(translation.locale || 'en').trim();
  if (locale !== 'en') {
    throw httpError(400, 'ADMIN_RESOURCE_CREATE_ENGLISH_REQUIRED', 'Initial Resource translation must be English.');
  }

  const contentPayload = validateContentPayload({
    locale: 'en',
    title: translation.title,
    summary: translation.summary,
    body: translation.body,
  });
  if (contentPayload.body.length > BODY_MAX_LENGTH) {
    throw httpError(400, 'ADMIN_RESOURCE_CONTENT_INVALID', 'Resource body is too long.', { errors: { body: 'too_long' } });
  }

  return {
    slug,
    categoryCode,
    sourceUrl: normalizeSourceUrl(source.url, false),
    sourceLabel: normalizeOptionalText(translation.sourceLabel ?? source.label, 'sourceLabel', 180),
    sourceType: normalizeOption(source.type, SOURCE_TYPES, 'sourceType'),
    sourceCountry: normalizeOption(source.country, SOURCE_COUNTRIES, 'sourceCountry'),
    sourceAuthorityLevel: normalizeOption(source.authorityLevel, SOURCE_AUTHORITY_LEVELS, 'sourceAuthorityLevel'),
    lastSourceCheckedAt: normalizeDate(source.lastCheckedAt, 'lastSourceCheckedAt'),
    replacementSourceNeeded: normalizeBoolean(source.replacementNeeded, 'replacementNeeded') || false,
    ageAppropriateness: normalizeOption(safety.ageAppropriateness, AGE_SUITABILITY_OPTIONS, 'ageAppropriateness'),
    sensitiveTopicFlag: normalizeBoolean(safety.sensitiveTopic, 'sensitiveTopic') || false,
    malaysiaGuidanceFlag: normalizeBoolean(safety.malaysiaGuidance, 'malaysiaGuidance') || false,
    translation: contentPayload,
  };
}

function validateMetadataPayload(body, validCategories) {
  assertNoUnknownFields(body, ALLOWED_METADATA_FIELDS, 'ADMIN_RESOURCE_METADATA_UNKNOWN_FIELDS');
  const payload = {};
  if (body.categoryCode !== undefined) payload.categoryCode = normalizeCategory(body.categoryCode, validCategories);
  if (body.sourceUrl !== undefined) payload.sourceUrl = normalizeSourceUrl(body.sourceUrl, false);
  if (body.sourceLabel !== undefined) payload.sourceLabel = normalizeOptionalText(body.sourceLabel, 'sourceLabel', 180);
  if (body.sourceType !== undefined) payload.sourceType = normalizeOption(body.sourceType, SOURCE_TYPES, 'sourceType');
  if (body.sourceCountry !== undefined) payload.sourceCountry = normalizeOption(body.sourceCountry, SOURCE_COUNTRIES, 'sourceCountry');
  if (body.sourceAuthorityLevel !== undefined) payload.sourceAuthorityLevel = normalizeOption(body.sourceAuthorityLevel, SOURCE_AUTHORITY_LEVELS, 'sourceAuthorityLevel');
  if (body.lastSourceCheckedAt !== undefined) payload.lastSourceCheckedAt = normalizeDate(body.lastSourceCheckedAt, 'lastSourceCheckedAt');
  if (body.replacementSourceNeeded !== undefined) payload.replacementSourceNeeded = normalizeBoolean(body.replacementSourceNeeded, 'replacementSourceNeeded');
  if (body.malaysiaGuidanceFlag !== undefined) payload.malaysiaGuidanceFlag = normalizeBoolean(body.malaysiaGuidanceFlag, 'malaysiaGuidanceFlag');
  if (body.sensitiveTopicFlag !== undefined) payload.sensitiveTopicFlag = normalizeBoolean(body.sensitiveTopicFlag, 'sensitiveTopicFlag');
  if (body.ageAppropriateness !== undefined) payload.ageAppropriateness = normalizeOption(body.ageAppropriateness, AGE_SUITABILITY_OPTIONS, 'ageAppropriateness');
  payload.expectedUpdatedAt = body.expectedUpdatedAt ? String(body.expectedUpdatedAt).trim() : null;
  return payload;
}

async function listValidCategories(poolOrConnection) {
  const [rows] = await poolOrConnection.query(
    `SELECT DISTINCT category_code
     FROM resource_articles
     WHERE category_code IS NOT NULL AND category_code <> ''
     ORDER BY category_code`
  );
  return rows.map(row => row.category_code);
}

async function nextDisplayOrder(poolOrConnection) {
  const [[row]] = await poolOrConnection.query('SELECT COALESCE(MAX(display_order), 0) + 1 AS next_order FROM resource_articles');
  return Number(row.next_order || 1);
}

async function fetchResourceForMetadata(poolOrConnection, resourceId, lock = false) {
  const [rows] = await poolOrConnection.query(
    `SELECT ra.*,
            en.title AS english_title,
            en.summary AS english_summary,
            en.source_label AS english_source_label
     FROM resource_articles ra
     LEFT JOIN resource_article_translations en ON en.resource_id = ra.id AND en.locale = 'en'
     WHERE ra.id = ?
     ${lock ? 'FOR UPDATE' : ''}`,
    [resourceId]
  );
  return rows[0] || null;
}

async function fetchTranslations(poolOrConnection, resourceId) {
  const [rows] = await poolOrConnection.query(
    `SELECT resource_id, locale, title, summary, content_json, source_label, updated_at
     FROM resource_article_translations
     WHERE resource_id = ?
     ORDER BY FIELD(locale, 'en', 'ms', 'zh-CN'), locale`,
    [resourceId]
  );
  return rows;
}

function mapResourceMetadata(row) {
  const eligibility = evaluateResourceRagEligibility(row);
  return {
    id: row.id,
    slug: row.slug,
    title: row.english_title || row.slug,
    summary: row.english_summary || '',
    categoryCode: row.category_code,
    displayCategory: RESOURCE_CATEGORY_LABELS[row.category_code] || row.category_code,
    publicationStatus: row.status,
    reviewStatus: row.review_status,
    ragReady: toBoolean(row.rag_ready),
    effectiveRagEligible: eligibility.effectiveRagEligible,
    effectiveRagReasons: eligibility.reasons,
    sourceLabel: row.english_source_label || null,
    sourceUrl: row.source_url,
    sourceType: row.source_type,
    sourceCountry: row.source_country,
    sourceAuthorityLevel: row.source_authority_level,
    lastSourceCheckedAt: formatDate(row.last_source_checked_at),
    replacementSourceNeeded: toBoolean(row.replacement_source_needed),
    malaysiaGuidanceFlag: toBoolean(row.malaysia_guidance_flag),
    sensitiveTopicFlag: toBoolean(row.sensitive_topic_flag),
    ageAppropriateness: row.age_appropriateness,
    updatedAt: formatTimestamp(row.updated_at),
  };
}

async function insertDraftResource(connection, payload) {
  const displayOrder = await nextDisplayOrder(connection);
  const [result] = await connection.query(
    `INSERT INTO resource_articles (
       slug,
       category_code,
       source_url,
       source_type,
       source_country,
       source_authority_level,
       last_source_checked_at,
       malaysia_guidance_flag,
       age_appropriateness,
       sensitive_topic_flag,
       rag_ready,
       replacement_source_needed,
       display_order,
       status,
       review_status,
       reviewed_by,
       reviewed_at
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 'draft', 'draft', NULL, NULL)`,
    [
      payload.slug,
      payload.categoryCode,
      payload.sourceUrl,
      payload.sourceType,
      payload.sourceCountry,
      payload.sourceAuthorityLevel,
      payload.lastSourceCheckedAt,
      payload.malaysiaGuidanceFlag ? 1 : 0,
      payload.ageAppropriateness,
      payload.sensitiveTopicFlag ? 1 : 0,
      payload.replacementSourceNeeded ? 1 : 0,
      displayOrder,
    ]
  );
  const resourceId = result.insertId;
  await connection.query(
    `INSERT INTO resource_article_translations (
       resource_id,
       locale,
       title,
       summary,
       content_json,
       source_label
     )
     VALUES (?, 'en', ?, ?, CAST(? AS JSON), ?)`,
    [
      resourceId,
      payload.translation.title,
      payload.translation.summary,
      JSON.stringify(payload.translation.contentJson),
      payload.sourceLabel,
    ]
  );
  return resourceId;
}

function mapOptions(categories) {
  return {
    categories: categories.map(code => ({
      code,
      label: RESOURCE_CATEGORY_LABELS[code] || code,
    })),
    sourceTypes: SOURCE_TYPES.map(value => ({ value, label: value })),
    sourceCountries: SOURCE_COUNTRIES.map(value => ({ value, label: value })),
    sourceAuthorityLevels: SOURCE_AUTHORITY_LEVELS.map(value => ({ value, label: value })),
    ageSuitabilityOptions: AGE_SUITABILITY_OPTIONS.map(value => ({ value, label: value })),
  };
}

function mapCreationResponse(resource, translations) {
  return {
    resource: mapResourceMetadata(resource),
    translations: buildTranslationsMap(translations),
  };
}

async function updateResourceMetadata(connection, resourceId, payload, current) {
  if (payload.expectedUpdatedAt && formatTimestamp(current.updated_at) !== payload.expectedUpdatedAt) {
    throw httpError(409, 'ADMIN_RESOURCE_METADATA_STALE', 'Resource metadata changed elsewhere. Reload the latest version.');
  }

  const columns = [];
  const params = [];
  const pairs = [
    ['categoryCode', 'category_code'],
    ['sourceUrl', 'source_url'],
    ['sourceType', 'source_type'],
    ['sourceCountry', 'source_country'],
    ['sourceAuthorityLevel', 'source_authority_level'],
    ['lastSourceCheckedAt', 'last_source_checked_at'],
    ['replacementSourceNeeded', 'replacement_source_needed'],
    ['malaysiaGuidanceFlag', 'malaysia_guidance_flag'],
    ['sensitiveTopicFlag', 'sensitive_topic_flag'],
    ['ageAppropriateness', 'age_appropriateness'],
  ];
  for (const [key, column] of pairs) {
    if (payload[key] === undefined) continue;
    columns.push(`${column} = ?`);
    const value = typeof payload[key] === 'boolean' ? (payload[key] ? 1 : 0) : payload[key];
    params.push(value);
  }
  columns.push('updated_at = CURRENT_TIMESTAMP');
  params.push(resourceId);
  await connection.query(`UPDATE resource_articles SET ${columns.join(', ')} WHERE id = ?`, params);

  if (payload.sourceLabel !== undefined) {
    await connection.query(
      `UPDATE resource_article_translations
       SET source_label = ?,
           updated_at = CURRENT_TIMESTAMP(3)
       WHERE resource_id = ?`,
      [payload.sourceLabel, resourceId]
    );
  }
}

module.exports = {
  RESOURCE_CATEGORY_LABELS,
  SOURCE_AUTHORITY_LEVELS,
  SOURCE_COUNTRIES,
  SOURCE_TYPES,
  AGE_SUITABILITY_OPTIONS,
  fetchResourceForMetadata,
  fetchTranslations,
  insertDraftResource,
  listValidCategories,
  mapCreationResponse,
  mapOptions,
  mapResourceMetadata,
  mapTranslation,
  updateResourceMetadata,
  validateCreatePayload,
  validateMetadataPayload,
};

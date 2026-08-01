const express = require('express');
const { createRequireAdmin } = require('./admin.middleware');
const { createProviderRegistry, AI_PROVIDER_IDS } = require('../ai/providers/aiProvider.registry');
const { listControlledToolMetadata } = require('../agent/agent.toolCatalogue');
const {
  DEFERRED_ACTION_TYPES,
  ENABLED_ACTION_TYPES,
  PROHIBITED_ACTION_TYPES,
} = require('../agent/actions/actionPolicy');
const { createRagRepository } = require('../rag/rag.repository');
const { createRagService } = require('../rag/rag.service');
const {
  PUBLICATION_STATUSES,
  REVIEW_STATUSES,
  evaluateResourceRagEligibility,
  normalizeNextReviewAt,
} = require('../resource/resource.governance');
const {
  buildTranslationsMap,
  fetchContentResource,
  fetchContentTranslations,
  mapResourceForContent,
  mapTranslation,
  saveContentTranslation,
  validateContentPayload,
} = require('./admin.resourceContent');
const {
  RESOURCE_CATEGORY_LABELS,
  fetchResourceForMetadata,
  fetchTranslations: fetchMetadataTranslations,
  insertDraftResource,
  listValidCategories,
  mapCreationResponse,
  mapOptions,
  mapResourceMetadata,
  updateResourceMetadata,
  validateCreatePayload,
  validateMetadataPayload,
} = require('./admin.resourceMetadata');
const {
  DIFFICULTIES: SCENARIO_DIFFICULTIES,
  TOPIC_CODES: SCENARIO_TOPIC_CODES,
  buildScenarioDetail,
  buildScenarioLifecycle,
  countAttempts: countScenarioAttempts,
  fetchScenarioBase,
  fetchScenarioSteps,
  mapScenarioRow,
  normalizeSlug: normalizeScenarioSlug,
  replaceSteps,
  upsertDefinitionTranslations,
  upsertScenarioTranslation,
  validateCreatePayload: validateScenarioCreatePayload,
  validateMetadataPayload: validateScenarioMetadataPayload,
  validateScenarioStructure,
  validateStepsPayload: validateScenarioStepsPayload,
  validateTranslationPayload: validateScenarioTranslationPayload,
} = require('./admin.scenarioManagement');

const ADMIN_MODULES = [
  'dashboard',
  'resources',
  'rag',
  'aiSafety',
  'contentRelationships',
  'malaysiaGuidance',
];

function buildControlledAgenticRuntimeStatus() {
  return {
    productionRouter: 'openai',
    executionMode: 'single_step',
    maxModelCalls: 2,
    maxToolExecutions: 1,
    readOnlyOnly: true,
    autonomousLoop: false,
    writeActions: false,
    backendControlled: true,
    deterministicFallback: true,
    toolValidation: true,
    secureSessionIdentity: true,
    allowedTools: listControlledToolMetadata(),
  };
}

function buildAdaptiveLearningRuntimeStatus() {
  return {
    status: 'enabled',
    mode: 'deterministic_explainable',
    dataSources: [
      'learner_profile',
      'initial_assessment',
      'topic_progress',
      'scenario_outcomes',
      'active_recommendations',
    ],
    persistentAiRecommendations: false,
    automaticDifficultyChanges: false,
    automaticScoreChanges: false,
    learnerChoiceRequired: true,
    rulesSummary: [
      'strengths',
      'support_priorities',
      'confidence_data_quality',
      'response_guidance',
      'suggested_next_steps',
    ],
  };
}

function buildLearnerControlledActionStatus() {
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
  };
}

function buildCyberWellnessRuntimeStatus() {
  return {
    status: 'enabled',
    mode: 'deterministic_non_diagnostic',
    targetUsers: 'teenagers_13_17',
    domains: [
      'digital_balance',
      'focus_and_distraction',
      'online_pressure_and_boundaries',
      'healthy_online_communication',
      'safe_help_seeking',
      'digital_resilience',
    ],
    psychologicalDiagnosis: false,
    wellnessRiskScoring: false,
    automaticIntervention: false,
    learnerChoiceRequired: true,
    highRiskSafetyHandling: 'existing_safety_pathway',
  };
}

function toBoolean(value) {
  return Number(value || 0) === 1;
}

function mapResourceReviewRow(row) {
  return {
    id: row.id,
    slug: row.slug,
    categoryCode: row.category_code,
    displayCategory: RESOURCE_CATEGORY_LABELS[row.category_code] || row.category_code,
    status: row.status,
    reviewStatus: row.review_status,
    ragReady: toBoolean(row.rag_ready),
    ragReadyReason: row.rag_ready_reason,
    sourceLabel: row.source_label,
    sourceOrganisation: row.source_label,
    sourceUrl: row.source_url,
    sourceType: row.source_type,
    sourceCountry: row.source_country,
    sourceAuthorityLevel: row.source_authority_level,
    lastSourceCheckedAt: row.last_source_checked_at,
    reviewedAt: row.reviewed_at,
    nextReviewAt: row.next_review_at,
    malaysiaGuidanceFlag: toBoolean(row.malaysia_guidance_flag),
    sensitiveTopicFlag: toBoolean(row.sensitive_topic_flag),
    replacementSourceNeeded: toBoolean(row.replacement_source_needed),
    ageAppropriateness: row.age_appropriateness,
    reviewNotes: row.review_notes,
    translationCount: Number(row.translation_count || 0),
  };
}

function buildResourceReviewSummary(resources) {
  return {
    totalResources: resources.length,
    needsReviewCount: resources.filter(resource => resource.reviewStatus !== 'approved').length,
    ragReadyCount: resources.filter(resource => resource.ragReady).length,
    replacementSourceNeededCount: resources.filter(resource => resource.replacementSourceNeeded).length,
    malaysiaGuidanceFlaggedCount: resources.filter(resource => resource.malaysiaGuidanceFlag).length,
  };
}

const ALLOWED_GOVERNANCE_FIELDS = new Set([
  'publicationStatus',
  'reviewStatus',
  'ragReady',
  'reviewNotes',
  'nextReviewAt',
]);

function httpError(status, code, message, extra = {}) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  Object.assign(error, extra);
  return error;
}

function parsePositiveInteger(value, fallback, max) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) return fallback;
  return Math.min(number, max);
}

function normalizeNullableText(value, maxLength = 5000) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return String(value).trim().slice(0, maxLength) || null;
}

function parseBooleanInput(value) {
  if (value === undefined) return undefined;
  if (value === true || value === false) return value;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return Symbol.for('invalid_boolean');
}

function mapEligibility(row) {
  return evaluateResourceRagEligibility({
    status: row.status,
    review_status: row.review_status,
    rag_ready: row.rag_ready,
  });
}

function mapResourceListRow(row) {
  const eligibility = mapEligibility(row);
  return {
    id: row.id,
    slug: row.slug,
    title: row.title || row.slug,
    locale: row.locale || 'en',
    category: row.category_code,
    categoryCode: row.category_code,
    displayCategory: RESOURCE_CATEGORY_LABELS[row.category_code] || row.category_code,
    topic: row.category_code,
    publicationStatus: row.status,
    reviewStatus: row.review_status,
    ragReady: toBoolean(row.rag_ready),
    effectiveRagEligible: eligibility.effectiveRagEligible,
    effectiveRagReasons: eligibility.reasons,
    reviewedAt: row.reviewed_at,
    reviewedBy: row.reviewed_by,
    nextReviewAt: row.next_review_at,
    sourceType: row.source_type,
    sourceCountry: row.source_country,
    sourceAuthorityLevel: row.source_authority_level,
    ageAppropriateness: row.age_appropriateness,
    sensitiveTopicFlag: toBoolean(row.sensitive_topic_flag),
    malaysiaGuidanceFlag: toBoolean(row.malaysia_guidance_flag),
    replacementSourceNeeded: toBoolean(row.replacement_source_needed),
    updatedAt: row.updated_at,
  };
}

function mapRagDocument(row) {
  return {
    id: row.id,
    locale: row.locale,
    title: row.title,
    status: row.status,
    reviewStatus: row.review_status,
    ragReady: toBoolean(row.rag_ready),
    chunkCount: Number(row.chunk_count || 0),
    retrievableChunkCount: Number(row.retrievable_chunk_count || 0),
    updatedAt: row.updated_at,
  };
}

function mapLifecycleEligibility(resource, references = {}) {
  const counts = {
    translations: Number(references.translations || 0),
    ragDocuments: Number(references.ragDocuments || 0),
    ragChunks: Number(references.ragChunks || 0),
    chatSourceReferences: Number(references.chatSourceReferences || references.chatSources || 0),
    contentRelationships: Number(references.contentRelationships || 0),
  };
  const blockingReasons = [];
  if (!resource) blockingReasons.push({ code: 'resource_not_found', count: 1 });
  if (resource && resource.status !== 'draft') blockingReasons.push({ code: 'resource_not_draft', count: 1 });
  if (resource && resource.review_status !== 'draft') blockingReasons.push({ code: 'review_not_draft', count: 1 });
  if (resource && toBoolean(resource.rag_ready)) blockingReasons.push({ code: 'resource_rag_ready', count: 1 });
  if (counts.ragDocuments > 0) blockingReasons.push({ code: 'rag_documents_exist', count: counts.ragDocuments });
  if (counts.ragChunks > 0) blockingReasons.push({ code: 'rag_chunks_exist', count: counts.ragChunks });
  if (counts.chatSourceReferences > 0) blockingReasons.push({ code: 'chat_source_history_exists', count: counts.chatSourceReferences });
  if (counts.contentRelationships > 0) blockingReasons.push({ code: 'content_relationships_exist', count: counts.contentRelationships });

  const reasons = blockingReasons.map(reason => reason.code);

  return {
    canArchive: Boolean(resource && resource.status !== 'archived'),
    canRestore: Boolean(resource && resource.status === 'archived'),
    canPermanentlyDelete: blockingReasons.length === 0,
    counts,
    blockingReasons,
    reasons,
    archiveAvailable: Boolean(resource && resource.status !== 'archived'),
  };
}

function mapResourceDetail(row, translations, ragDocuments, retrievableChunkCount) {
  const eligibility = mapEligibility(row);
  const english = translations.find(item => item.locale === 'en') || translations[0] || {};
  return {
    ...mapResourceListRow({
      ...row,
      title: english.title,
      locale: english.locale || 'en',
    }),
    summary: english.summary || '',
    sourceLabel: english.source_label || null,
    sourceUrl: row.source_url,
    ragReadyReason: row.rag_ready_reason,
    reviewNotes: row.review_notes,
    lastSourceCheckedAt: row.last_source_checked_at,
    translations: translations.map(translation => ({
      locale: translation.locale,
      title: translation.title,
      summary: translation.summary,
      sourceLabel: translation.source_label,
    })),
    ragDocuments: ragDocuments.map(mapRagDocument),
    retrievableChunkCount,
    effectiveRagEligible: eligibility.effectiveRagEligible,
    effectiveRagReasons: eligibility.reasons,
  };
}

function buildAdminResourceSummary(rows) {
  return {
    total: rows.length,
    published: rows.filter(row => row.status === 'published').length,
    draft: rows.filter(row => row.status === 'draft').length,
    archived: rows.filter(row => row.status === 'archived').length,
    approved: rows.filter(row => row.review_status === 'approved').length,
    needsReview: rows.filter(row => row.review_status !== 'approved').length,
    rejected: rows.filter(row => row.review_status === 'rejected').length,
    ragReady: rows.filter(row => toBoolean(row.rag_ready)).length,
    effectivelyRagEligible: rows.filter(row => mapEligibility(row).effectiveRagEligible).length,
  };
}

async function fetchResourceBase(poolOrConnection, resourceId, lock = false) {
  const [rows] = await poolOrConnection.query(
    `SELECT *
     FROM resource_articles
     WHERE id = ?
     ${lock ? 'FOR UPDATE' : ''}`,
    [resourceId]
  );
  return rows[0] || null;
}

async function fetchResourceTranslations(poolOrConnection, resourceId) {
  const [rows] = await poolOrConnection.query(
    `SELECT locale, title, summary, source_label
     FROM resource_article_translations
     WHERE resource_id = ?
     ORDER BY FIELD(locale, 'en', 'ms', 'zh-CN'), locale`,
    [resourceId]
  );
  return rows;
}

async function fetchResourceEnglishContent(poolOrConnection, resourceId) {
  const [rows] = await poolOrConnection.query(
    `SELECT locale, title, summary, content_json
     FROM resource_article_translations
     WHERE resource_id = ? AND locale = 'en'
     LIMIT 1`,
    [resourceId]
  );
  return rows[0] || null;
}

async function listMissingOptionalResourceLocales(poolOrConnection, resourceId) {
  const [rows] = await poolOrConnection.query(
    `SELECT locale
     FROM resource_article_translations
     WHERE resource_id = ?`,
    [resourceId]
  );
  const existing = new Set(rows.map(row => row.locale));
  return ['ms', 'zh-CN'].filter(locale => !existing.has(locale));
}

function resourceContentHasBody(value) {
  if (Array.isArray(value)) return value.some(item => String(typeof item === 'string' ? item : item?.body || item?.text || item?.content || '').trim());
  if (value && typeof value === 'object') return Object.values(value).some(item => resourceContentHasBody(item));
  if (typeof value === 'string') {
    try {
      return resourceContentHasBody(JSON.parse(value));
    } catch {
      return value.trim().length > 0;
    }
  }
  return false;
}

async function validateResourcePublishReadiness(poolOrConnection, resource) {
  const reasons = [];
  if (!resource) reasons.push({ code: 'resource_not_found' });
  if (resource?.status === 'archived') reasons.push({ code: 'resource_archived' });
  if (!resource?.category_code) reasons.push({ code: 'category_required', field: 'categoryCode' });
  const english = resource ? await fetchResourceEnglishContent(poolOrConnection, resource.id) : null;
  if (!english?.title || !String(english.title).trim()) reasons.push({ code: 'english_title_required', field: 'title' });
  if (!english?.summary || !String(english.summary).trim()) reasons.push({ code: 'english_summary_required', field: 'summary' });
  if (!resourceContentHasBody(english?.content_json)) reasons.push({ code: 'english_body_required', field: 'body' });
  return {
    valid: reasons.length === 0,
    reasons,
    optionalMissingLocales: resource ? await listMissingOptionalResourceLocales(poolOrConnection, resource.id) : ['ms', 'zh-CN'],
  };
}

async function countResourceLifecycleReferences(poolOrConnection, resourceId, slug = null) {
  const [[translations]] = await poolOrConnection.query(
    `SELECT COUNT(*) AS count
     FROM resource_article_translations
     WHERE resource_id = ?`,
    [resourceId]
  );
  const [[ragDocuments]] = await poolOrConnection.query(
    `SELECT COUNT(DISTINCT id) AS count
     FROM rag_documents
     WHERE resource_id = ?
       AND content_type = 'resource'`,
    [resourceId]
  );
  const [[ragChunks]] = await poolOrConnection.query(
    `SELECT COUNT(DISTINCT rc.id) AS count
     FROM rag_chunks rc
     JOIN rag_documents rd ON rd.id = rc.document_id
     WHERE rd.resource_id = ?
       AND rd.content_type = 'resource'`,
    [resourceId]
  );
  const [[chatSources]] = await poolOrConnection.query(
    `SELECT COUNT(DISTINCT cms.id) AS count
     FROM chat_message_sources cms
     LEFT JOIN rag_documents rd ON rd.id = cms.document_id
     WHERE rd.resource_id = ?
        OR CAST(JSON_UNQUOTE(JSON_EXTRACT(cms.internal_target_json, '$.resourceId')) AS UNSIGNED) = ?
        OR JSON_UNQUOTE(JSON_EXTRACT(cms.internal_target_json, '$.resourceSlug')) = ?`,
    [resourceId, resourceId, slug || '']
  );
  return {
    translations: Number(translations?.count || 0),
    ragDocuments: Number(ragDocuments?.count || 0),
    ragChunks: Number(ragChunks?.count || 0),
    chatSourceReferences: Number(chatSources?.count || 0),
    chatSources: Number(chatSources?.count || 0),
    contentRelationships: 0,
  };
}

async function fetchResourceLifecycle(poolOrConnection, resourceId, lock = false) {
  const resource = await fetchResourceBase(poolOrConnection, resourceId, lock);
  if (!resource) return null;
  const references = await countResourceLifecycleReferences(poolOrConnection, resourceId, resource.slug);
  return {
    resourceId: resource.id,
    slug: resource.slug,
    publicationStatus: resource.status,
    reviewStatus: resource.review_status,
    ragReady: toBoolean(resource.rag_ready),
    references,
    ...mapLifecycleEligibility(resource, references),
  };
}

function createAdminRouter(pool, options = {}) {
  const router = express.Router();
  const requireAdmin = createRequireAdmin(pool);
  const ragRepository = createRagRepository(pool);
  const ragService = createRagService(ragRepository);
  const agenticTraceService = options.agenticTraceService || null;

  router.get('/status', requireAdmin, (_req, res) => {
    res.json({
      ok: true,
      role: 'admin',
      modules: ADMIN_MODULES,
      message: 'Admin access verified',
    });
  });

  router.get('/ai/providers', requireAdmin, (_req, res) => {
    const registry = createProviderRegistry();
    res.json({
      ...registry.getSafeStatus(),
      controlledAgenticRuntime: buildControlledAgenticRuntimeStatus(),
      adaptiveLearningRuntime: buildAdaptiveLearningRuntimeStatus(),
      learnerControlledActions: buildLearnerControlledActionStatus(),
      cyberWellnessRuntime: buildCyberWellnessRuntimeStatus(),
    });
  });

  router.post('/ai/providers/:providerId/test', requireAdmin, async (req, res, next) => {
    try {
      const providerId = String(req.params.providerId || '').trim().toLowerCase();
      if (!AI_PROVIDER_IDS.includes(providerId)) {
        throw httpError(404, 'AI_PROVIDER_UNKNOWN', 'AI provider was not found.');
      }
      const registry = createProviderRegistry();
      const result = await registry.safeTestProvider(providerId);
      if (result.status === 'failed') {
        return res.status(result.httpStatus || 503).json(result);
      }
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  router.get('/ai/traces', requireAdmin, async (req, res, next) => {
    try {
      if (!agenticTraceService) {
        return res.json({
          items: [],
          pagination: { limit: 20, offset: 0, total: 0, hasMore: false },
        });
      }
      const result = await agenticTraceService.listTraces({
        limit: req.query.limit,
        offset: req.query.offset,
        status: String(req.query.status || '').trim(),
        proposalStatus: String(req.query.proposalStatus || '').trim(),
        from: String(req.query.from || '').trim(),
        to: String(req.query.to || '').trim(),
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  router.get('/ai/traces/:traceId', requireAdmin, async (req, res, next) => {
    try {
      if (!agenticTraceService) {
        throw httpError(404, 'AGENTIC_TRACE_NOT_FOUND', 'Agentic trace was not found.');
      }
      const traceId = String(req.params.traceId || '').trim();
      if (!/^agt_[a-f0-9-]{36}$/.test(traceId)) {
        throw httpError(400, 'AGENTIC_TRACE_INVALID_ID', 'Agentic trace id is invalid.');
      }
      const trace = await agenticTraceService.getTrace(traceId);
      if (!trace) {
        throw httpError(404, 'AGENTIC_TRACE_NOT_FOUND', 'Agentic trace was not found.');
      }
      res.json({ trace });
    } catch (error) {
      next(error);
    }
  });

  router.get('/resources/review', requireAdmin, async (_req, res, next) => {
    try {
      const [rows] = await pool.query(
        `SELECT ra.id,
                ra.slug,
                ra.category_code,
                ra.status,
                ra.review_status,
                ra.rag_ready,
                ra.rag_ready_reason,
                ra.source_url,
                ra.source_type,
                ra.source_country,
                ra.source_authority_level,
                ra.last_source_checked_at,
                ra.reviewed_at,
                ra.next_review_at,
                ra.malaysia_guidance_flag,
                ra.sensitive_topic_flag,
                ra.replacement_source_needed,
                ra.age_appropriateness,
                ra.review_notes,
                MAX(CASE WHEN rat.locale = 'en' THEN rat.source_label ELSE NULL END) AS source_label,
                COUNT(DISTINCT rat.locale) AS translation_count
         FROM resource_articles ra
         LEFT JOIN resource_article_translations rat ON rat.resource_id = ra.id
         GROUP BY ra.id,
                  ra.slug,
                  ra.category_code,
                  ra.status,
                  ra.review_status,
                  ra.rag_ready,
                  ra.rag_ready_reason,
                  ra.source_url,
                  ra.source_type,
                  ra.source_country,
                  ra.source_authority_level,
                  ra.last_source_checked_at,
                  ra.reviewed_at,
                  ra.next_review_at,
                  ra.malaysia_guidance_flag,
                  ra.sensitive_topic_flag,
                  ra.replacement_source_needed,
                  ra.age_appropriateness,
                  ra.review_notes
         ORDER BY ra.display_order, ra.id`
      );
      const resources = rows.map(mapResourceReviewRow);
      res.json({
        summary: buildResourceReviewSummary(resources),
        resources,
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/scenarios/options', requireAdmin, (_req, res) => {
    res.json({
      topics: Array.from(SCENARIO_TOPIC_CODES),
      difficulties: Array.from(SCENARIO_DIFFICULTIES),
      statuses: ['draft', 'published', 'archived'],
      scoreOptions: [
        { value: 2, label: 'safest' },
        { value: 1, label: 'partial' },
        { value: 0, label: 'unsafe' },
      ],
    });
  });

  router.get('/scenarios', requireAdmin, async (req, res, next) => {
    try {
      const page = parsePositiveInteger(req.query.page, 1, 100000);
      const pageSize = parsePositiveInteger(req.query.pageSize, 20, 50);
      const offset = (page - 1) * pageSize;
      const search = String(req.query.search || '').trim();
      const status = String(req.query.status || '').trim();
      const topicCode = String(req.query.topicCode || '').trim();
      const difficulty = String(req.query.difficulty || '').trim();
      const where = [];
      const params = [];

      if (search) {
        where.push('(sd.slug LIKE ? OR sd.title LIKE ? OR sd.summary LIKE ? OR en.title LIKE ?)');
        const like = `%${search}%`;
        params.push(like, like, like, like);
      }
      if (status) {
        if (!['draft', 'published', 'archived'].includes(status)) {
          throw httpError(400, 'ADMIN_SCENARIO_INVALID_STATUS', 'Scenario status filter is invalid.');
        }
        where.push('sd.status = ?');
        params.push(status);
      }
      if (topicCode) {
        if (!SCENARIO_TOPIC_CODES.has(topicCode)) {
          throw httpError(400, 'ADMIN_SCENARIO_INVALID_TOPIC', 'Scenario topic filter is invalid.');
        }
        where.push('sd.topic_code = ?');
        params.push(topicCode);
      }
      if (difficulty) {
        if (!SCENARIO_DIFFICULTIES.has(difficulty)) {
          throw httpError(400, 'ADMIN_SCENARIO_INVALID_DIFFICULTY', 'Scenario difficulty filter is invalid.');
        }
        where.push('sd.difficulty = ?');
        params.push(difficulty);
      }
      const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

      const [summaryRows] = await pool.query(
        `SELECT status, COUNT(*) AS count
         FROM scenario_definitions
         GROUP BY status`
      );
      const [[countRow]] = await pool.query(
        `SELECT COUNT(DISTINCT sd.id) AS count
         FROM scenario_definitions sd
         LEFT JOIN scenario_definition_translations en ON en.scenario_id = sd.id AND en.locale = 'en'
         ${whereSql}`,
        params
      );
      const [rows] = await pool.query(
        `SELECT sd.*,
                COALESCE(en.title, sd.title) AS title,
                COALESCE(en.summary, sd.summary) AS summary,
                COUNT(DISTINCT ss.id) AS step_count,
                GROUP_CONCAT(DISTINCT sdt.locale ORDER BY FIELD(sdt.locale, 'en', 'ms', 'zh-CN'), sdt.locale) AS translation_coverage
         FROM scenario_definitions sd
         LEFT JOIN scenario_definition_translations en ON en.scenario_id = sd.id AND en.locale = 'en'
         LEFT JOIN scenario_definition_translations sdt ON sdt.scenario_id = sd.id
         LEFT JOIN scenario_steps ss ON ss.scenario_id = sd.id
         ${whereSql}
         GROUP BY sd.id
         ORDER BY FIELD(sd.status, 'published', 'draft', 'archived'), sd.updated_at DESC, sd.id DESC
         LIMIT ? OFFSET ?`,
        [...params, pageSize, offset]
      );
      const scenarioIds = rows.map(row => row.id);
      const stepsByScenario = new Map();
      if (scenarioIds.length) {
        const [steps] = await pool.query(
          `SELECT *
           FROM scenario_steps
           WHERE scenario_id IN (?)
           ORDER BY scenario_id, step_order`,
          [scenarioIds]
        );
        for (const step of steps) {
          const list = stepsByScenario.get(Number(step.scenario_id)) || [];
          list.push(step);
          stepsByScenario.set(Number(step.scenario_id), list);
        }
      }

      const items = rows.map(row => mapScenarioRow(row, validateScenarioStructure(row, stepsByScenario.get(Number(row.id)) || [])));
      const statusCounts = Object.fromEntries(summaryRows.map(row => [row.status, Number(row.count || 0)]));
      res.json({
        items,
        summary: {
          total: Object.values(statusCounts).reduce((sum, count) => sum + count, 0),
          draft: statusCounts.draft || 0,
          published: statusCounts.published || 0,
          archived: statusCounts.archived || 0,
          invalid: items.filter(item => !item.structuralValidation?.valid).length,
        },
        pagination: {
          page,
          pageSize,
          totalItems: Number(countRow?.count || 0),
          totalPages: Math.max(1, Math.ceil(Number(countRow?.count || 0) / pageSize)),
        },
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/scenarios', requireAdmin, async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
      const payload = validateScenarioCreatePayload(req.body || {});
      await connection.beginTransaction();
      const [existing] = await connection.query(
        `SELECT id FROM scenario_definitions WHERE slug = ? AND version = 1 LIMIT 1 FOR UPDATE`,
        [payload.slug]
      );
      if (existing.length) {
        throw httpError(409, 'ADMIN_SCENARIO_DUPLICATE_SLUG', 'Scenario slug already exists.', {
          errors: { slug: 'duplicate' },
        });
      }
      const [result] = await connection.query(
        `INSERT INTO scenario_definitions (slug, title, summary, topic_code, difficulty, version, status, estimated_minutes, total_steps)
         VALUES (?, ?, ?, ?, ?, 1, 'draft', ?, ?)`,
        [
          payload.slug,
          payload.title,
          payload.summary,
          payload.topicCode,
          payload.difficulty,
          payload.estimatedMinutes,
          payload.totalSteps,
        ]
      );
      await upsertDefinitionTranslations(connection, result.insertId, {
        en: { title: payload.title, summary: payload.summary },
      });
      await connection.commit();
      res.status(201).json(await buildScenarioDetail(pool, result.insertId));
    } catch (error) {
      try { await connection.rollback(); } catch {}
      next(error);
    } finally {
      connection.release();
    }
  });

  router.get('/scenarios/:scenarioId', requireAdmin, async (req, res, next) => {
    try {
      const scenarioId = Number(req.params.scenarioId);
      if (!Number.isInteger(scenarioId) || scenarioId < 1) {
        throw httpError(404, 'ADMIN_SCENARIO_NOT_FOUND', 'Scenario was not found.');
      }
      const detail = await buildScenarioDetail(pool, scenarioId);
      if (!detail) throw httpError(404, 'ADMIN_SCENARIO_NOT_FOUND', 'Scenario was not found.');
      res.json(detail);
    } catch (error) {
      next(error);
    }
  });

  router.get('/scenarios/:scenarioId/lifecycle', requireAdmin, async (req, res, next) => {
    try {
      const scenarioId = Number(req.params.scenarioId);
      if (!Number.isInteger(scenarioId) || scenarioId < 1) {
        throw httpError(404, 'ADMIN_SCENARIO_NOT_FOUND', 'Scenario was not found.');
      }
      const lifecycle = await buildScenarioLifecycle(pool, scenarioId);
      if (!lifecycle) throw httpError(404, 'ADMIN_SCENARIO_NOT_FOUND', 'Scenario was not found.');
      res.json(lifecycle);
    } catch (error) {
      next(error);
    }
  });

  router.delete('/scenarios/:scenarioId', requireAdmin, async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
      const scenarioId = Number(req.params.scenarioId);
      if (!Number.isInteger(scenarioId) || scenarioId < 1) {
        throw httpError(404, 'ADMIN_SCENARIO_NOT_FOUND', 'Scenario was not found.');
      }
      const confirmationSlug = req.body?.confirmationSlug;
      await connection.beginTransaction();
      const lifecycle = await buildScenarioLifecycle(connection, scenarioId, true);
      if (!lifecycle) throw httpError(404, 'ADMIN_SCENARIO_NOT_FOUND', 'Scenario was not found.');
      if (confirmationSlug !== lifecycle.slug) {
        await connection.rollback();
        res.status(400).json({
          code: 'ADMIN_SCENARIO_DELETE_CONFIRMATION_MISMATCH',
          message: 'Scenario slug confirmation does not match.',
          lifecycle,
        });
        return;
      }
      if (!lifecycle.canPermanentlyDelete) {
        await connection.rollback();
        res.status(409).json({
          code: 'ADMIN_SCENARIO_DELETE_BLOCKED',
          message: 'Scenario cannot be permanently deleted. Archive it instead when appropriate.',
          counts: lifecycle.counts,
          blockingReasons: lifecycle.blockingReasons,
          lifecycle,
        });
        return;
      }
      await connection.query('DELETE FROM scenario_definitions WHERE id = ?', [scenarioId]);
      await connection.commit();
      res.json({
        deletedScenario: {
          id: scenarioId,
          slug: lifecycle.slug,
        },
      });
    } catch (error) {
      try { await connection.rollback(); } catch {}
      next(error);
    } finally {
      connection.release();
    }
  });

  router.patch('/scenarios/:scenarioId/metadata', requireAdmin, async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
      const scenarioId = Number(req.params.scenarioId);
      if (!Number.isInteger(scenarioId) || scenarioId < 1) {
        throw httpError(404, 'ADMIN_SCENARIO_NOT_FOUND', 'Scenario was not found.');
      }
      const payload = validateScenarioMetadataPayload(req.body || {});
      await connection.beginTransaction();
      const current = await fetchScenarioBase(connection, scenarioId, true);
      if (!current) throw httpError(404, 'ADMIN_SCENARIO_NOT_FOUND', 'Scenario was not found.');
      if (payload.expectedUpdatedAt && new Date(current.updated_at).toISOString() !== payload.expectedUpdatedAt) {
        throw httpError(409, 'ADMIN_SCENARIO_METADATA_STALE', 'Scenario metadata changed since it was loaded.');
      }
      const columns = [];
      const params = [];
      if (payload.title !== undefined) { columns.push('title = ?'); params.push(payload.title); }
      if (payload.summary !== undefined) { columns.push('summary = ?'); params.push(payload.summary); }
      if (payload.topicCode !== undefined) { columns.push('topic_code = ?'); params.push(payload.topicCode); }
      if (payload.difficulty !== undefined) { columns.push('difficulty = ?'); params.push(payload.difficulty); }
      if (payload.estimatedMinutes !== undefined) { columns.push('estimated_minutes = ?'); params.push(payload.estimatedMinutes); }
      if (payload.totalSteps !== undefined) { columns.push('total_steps = ?'); params.push(payload.totalSteps); }
      if (columns.length) {
        columns.push('updated_at = CURRENT_TIMESTAMP');
        await connection.query(`UPDATE scenario_definitions SET ${columns.join(', ')} WHERE id = ?`, [...params, scenarioId]);
      }
      if (payload.title !== undefined || payload.summary !== undefined) {
        await upsertDefinitionTranslations(connection, scenarioId, {
          en: {
            title: payload.title !== undefined ? payload.title : current.title,
            summary: payload.summary !== undefined ? payload.summary : current.summary,
          },
        });
      }
      await upsertDefinitionTranslations(connection, scenarioId, payload.translations);
      await connection.commit();
      res.json(await buildScenarioDetail(pool, scenarioId));
    } catch (error) {
      try { await connection.rollback(); } catch {}
      next(error);
    } finally {
      connection.release();
    }
  });

  router.put('/scenarios/:scenarioId/steps', requireAdmin, async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
      const scenarioId = Number(req.params.scenarioId);
      if (!Number.isInteger(scenarioId) || scenarioId < 1) {
        throw httpError(404, 'ADMIN_SCENARIO_NOT_FOUND', 'Scenario was not found.');
      }
      await connection.beginTransaction();
      const current = await fetchScenarioBase(connection, scenarioId, true);
      if (!current) throw httpError(404, 'ADMIN_SCENARIO_NOT_FOUND', 'Scenario was not found.');
      const attemptCount = await countScenarioAttempts(connection, scenarioId);
      if (attemptCount > 0) {
        throw httpError(
          409,
          'ADMIN_SCENARIO_HAS_ATTEMPTS',
          'Scenario steps cannot be replaced after learners have attempted this scenario. Create a new version before changing the structure.',
          { errors: { attempts: attemptCount } }
        );
      }
      const steps = validateScenarioStepsPayload(req.body || {}, current);
      await replaceSteps(connection, scenarioId, steps);
      if (current.status === 'published') {
        await connection.query(
          `UPDATE scenario_definitions
           SET status = 'draft',
               updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [scenarioId]
        );
      }
      await connection.commit();
      res.json(await buildScenarioDetail(pool, scenarioId));
    } catch (error) {
      try { await connection.rollback(); } catch {}
      next(error);
    } finally {
      connection.release();
    }
  });

  router.patch('/scenarios/:scenarioId/translations/:locale', requireAdmin, async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
      const scenarioId = Number(req.params.scenarioId);
      if (!Number.isInteger(scenarioId) || scenarioId < 1) {
        throw httpError(404, 'ADMIN_SCENARIO_NOT_FOUND', 'Scenario was not found.');
      }
      const payload = validateScenarioTranslationPayload({
        ...(req.body || {}),
        locale: req.params.locale,
      });
      await connection.beginTransaction();
      const current = await fetchScenarioBase(connection, scenarioId, true);
      if (!current) throw httpError(404, 'ADMIN_SCENARIO_NOT_FOUND', 'Scenario was not found.');
      await upsertScenarioTranslation(connection, scenarioId, payload);
      await connection.query(
        `UPDATE scenario_definitions
         SET updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [scenarioId]
      );
      await connection.commit();
      res.json(await buildScenarioDetail(pool, scenarioId));
    } catch (error) {
      try { await connection.rollback(); } catch {}
      next(error);
    } finally {
      connection.release();
    }
  });

  router.post('/scenarios/:scenarioId/publish', requireAdmin, async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
      const scenarioId = Number(req.params.scenarioId);
      if (!Number.isInteger(scenarioId) || scenarioId < 1) {
        throw httpError(404, 'ADMIN_SCENARIO_NOT_FOUND', 'Scenario was not found.');
      }
      await connection.beginTransaction();
      const current = await fetchScenarioBase(connection, scenarioId, true);
      if (!current) throw httpError(404, 'ADMIN_SCENARIO_NOT_FOUND', 'Scenario was not found.');
      const steps = await fetchScenarioSteps(connection, scenarioId);
      const structuralValidation = validateScenarioStructure(current, steps);
      if (!structuralValidation.valid) {
        throw httpError(409, 'ADMIN_SCENARIO_CANNOT_PUBLISH', 'Scenario cannot be published until validation passes.', {
          errors: { reasons: structuralValidation.reasons },
          reasons: structuralValidation.reasons,
        });
      }
      await connection.query(
        `UPDATE scenario_definitions
         SET status = 'published',
             first_published_at = COALESCE(first_published_at, CURRENT_TIMESTAMP(3)),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [scenarioId]
      );
      await connection.commit();
      res.json(await buildScenarioDetail(pool, scenarioId));
    } catch (error) {
      try { await connection.rollback(); } catch {}
      next(error);
    } finally {
      connection.release();
    }
  });

  router.post('/scenarios/:scenarioId/unpublish', requireAdmin, async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
      const scenarioId = Number(req.params.scenarioId);
      if (!Number.isInteger(scenarioId) || scenarioId < 1) {
        throw httpError(404, 'ADMIN_SCENARIO_NOT_FOUND', 'Scenario was not found.');
      }
      await connection.beginTransaction();
      const current = await fetchScenarioBase(connection, scenarioId, true);
      if (!current) throw httpError(404, 'ADMIN_SCENARIO_NOT_FOUND', 'Scenario was not found.');
      if (current.status === 'archived') {
        throw httpError(409, 'ADMIN_SCENARIO_ARCHIVED', 'Restore the Scenario before returning it to Draft.');
      }
      await connection.query(
        `UPDATE scenario_definitions
         SET status = 'draft',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [scenarioId]
      );
      await connection.commit();
      const detail = await buildScenarioDetail(pool, scenarioId);
      res.json(detail);
    } catch (error) {
      try { await connection.rollback(); } catch {}
      next(error);
    } finally {
      connection.release();
    }
  });

  router.post('/scenarios/:scenarioId/archive', requireAdmin, async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
      const scenarioId = Number(req.params.scenarioId);
      if (!Number.isInteger(scenarioId) || scenarioId < 1) {
        throw httpError(404, 'ADMIN_SCENARIO_NOT_FOUND', 'Scenario was not found.');
      }
      await connection.beginTransaction();
      const current = await fetchScenarioBase(connection, scenarioId, true);
      if (!current) throw httpError(404, 'ADMIN_SCENARIO_NOT_FOUND', 'Scenario was not found.');
      await connection.query(
        `UPDATE scenario_definitions
         SET status = 'archived',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [scenarioId]
      );
      await connection.commit();
      res.json(await buildScenarioDetail(pool, scenarioId));
    } catch (error) {
      try { await connection.rollback(); } catch {}
      next(error);
    } finally {
      connection.release();
    }
  });

  router.post('/scenarios/:scenarioId/restore', requireAdmin, async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
      const scenarioId = Number(req.params.scenarioId);
      if (!Number.isInteger(scenarioId) || scenarioId < 1) {
        throw httpError(404, 'ADMIN_SCENARIO_NOT_FOUND', 'Scenario was not found.');
      }
      await connection.beginTransaction();
      const current = await fetchScenarioBase(connection, scenarioId, true);
      if (!current) throw httpError(404, 'ADMIN_SCENARIO_NOT_FOUND', 'Scenario was not found.');
      await connection.query(
        `UPDATE scenario_definitions
         SET status = 'draft',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [scenarioId]
      );
      await connection.commit();
      res.json(await buildScenarioDetail(pool, scenarioId));
    } catch (error) {
      try { await connection.rollback(); } catch {}
      next(error);
    } finally {
      connection.release();
    }
  });

  router.get('/resources/options', requireAdmin, async (_req, res, next) => {
    try {
      const categories = await listValidCategories(pool);
      res.json(mapOptions(categories));
    } catch (error) {
      next(error);
    }
  });

  router.post('/resources', requireAdmin, async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
      const categories = new Set(await listValidCategories(connection));
      const payload = validateCreatePayload(req.body || {}, categories);

      await connection.beginTransaction();
      const [existing] = await connection.query(
        `SELECT id FROM resource_articles WHERE slug = ? LIMIT 1 FOR UPDATE`,
        [payload.slug]
      );
      if (existing.length) {
        throw httpError(409, 'ADMIN_RESOURCE_DUPLICATE_SLUG', 'Resource slug already exists.', {
          errors: { slug: 'duplicate' },
        });
      }
      const resourceId = await insertDraftResource(connection, payload);
      const resource = await fetchResourceForMetadata(connection, resourceId);
      const translations = await fetchMetadataTranslations(connection, resourceId);
      await connection.commit();
      res.status(201).json(mapCreationResponse(resource, translations));
    } catch (error) {
      try {
        await connection.rollback();
      } catch {}
      next(error);
    } finally {
      connection.release();
    }
  });

  router.get('/resources', requireAdmin, async (req, res, next) => {
    try {
      const page = parsePositiveInteger(req.query.page, 1, 100000);
      const pageSize = parsePositiveInteger(req.query.pageSize, 20, 50);
      const offset = (page - 1) * pageSize;
      const search = String(req.query.search || '').trim();
      const publicationStatus = String(req.query.publicationStatus || '').trim();
      const reviewStatus = String(req.query.reviewStatus || '').trim();
      const ragReady = parseBooleanInput(req.query.ragReady);

      if (publicationStatus && !PUBLICATION_STATUSES.has(publicationStatus)) {
        throw httpError(400, 'ADMIN_RESOURCE_INVALID_PUBLICATION_STATUS', 'Publication status is invalid.');
      }
      if (reviewStatus && !REVIEW_STATUSES.has(reviewStatus)) {
        throw httpError(400, 'ADMIN_RESOURCE_INVALID_REVIEW_STATUS', 'Review status is invalid.');
      }
      if (ragReady === Symbol.for('invalid_boolean')) {
        throw httpError(400, 'ADMIN_RESOURCE_INVALID_RAG_READY', 'RAG readiness filter is invalid.');
      }

      const where = [];
      const params = [];
      if (search) {
        where.push('(ra.slug LIKE ? OR en.title LIKE ? OR en.summary LIKE ?)');
        const like = `%${search}%`;
        params.push(like, like, like);
      }
      if (publicationStatus) {
        where.push('ra.status = ?');
        params.push(publicationStatus);
      }
      if (reviewStatus) {
        where.push('ra.review_status = ?');
        params.push(reviewStatus);
      }
      if (ragReady !== undefined) {
        where.push('ra.rag_ready = ?');
        params.push(ragReady ? 1 : 0);
      }
      const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

      const [allRows] = await pool.query(
        `SELECT ra.id,
                ra.slug,
                ra.category_code,
                ra.status,
                ra.review_status,
                ra.rag_ready
         FROM resource_articles ra`
      );

      const [[countRow]] = await pool.query(
        `SELECT COUNT(*) AS count
         FROM resource_articles ra
         LEFT JOIN resource_article_translations en ON en.resource_id = ra.id AND en.locale = 'en'
         ${whereSql}`,
        params
      );

      const [rows] = await pool.query(
        `SELECT ra.id,
                ra.slug,
                ra.category_code,
                ra.status,
                ra.review_status,
                ra.rag_ready,
                ra.reviewed_at,
                ra.reviewed_by,
                ra.next_review_at,
                ra.source_type,
                ra.source_country,
                ra.source_authority_level,
                ra.age_appropriateness,
                ra.sensitive_topic_flag,
                ra.malaysia_guidance_flag,
                ra.replacement_source_needed,
                ra.updated_at,
                en.locale,
                en.title
         FROM resource_articles ra
         LEFT JOIN resource_article_translations en ON en.resource_id = ra.id AND en.locale = 'en'
         ${whereSql}
         ORDER BY ra.display_order, ra.id
         LIMIT ? OFFSET ?`,
        [...params, pageSize, offset]
      );

      const totalItems = Number(countRow?.count || 0);
      res.json({
        items: rows.map(mapResourceListRow),
        pagination: {
          page,
          pageSize,
          totalItems,
          totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
        },
        summary: buildAdminResourceSummary(allRows),
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/resources/:resourceId', requireAdmin, async (req, res, next) => {
    try {
      const resourceId = Number(req.params.resourceId);
      if (!Number.isInteger(resourceId) || resourceId < 1) {
        throw httpError(404, 'ADMIN_RESOURCE_NOT_FOUND', 'Resource was not found.');
      }
      const resource = await fetchResourceBase(pool, resourceId);
      if (!resource) throw httpError(404, 'ADMIN_RESOURCE_NOT_FOUND', 'Resource was not found.');
      const translations = await fetchResourceTranslations(pool, resourceId);
      const ragDocuments = await ragRepository.listDocumentsForResource(resourceId);
      const retrievableChunkCount = await ragRepository.countRetrievableChunksForResource(resourceId);
      res.json({
        resource: mapResourceDetail(resource, translations, ragDocuments, retrievableChunkCount),
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/resources/:resourceId/lifecycle', requireAdmin, async (req, res, next) => {
    try {
      const resourceId = Number(req.params.resourceId);
      if (!Number.isInteger(resourceId) || resourceId < 1) {
        throw httpError(404, 'ADMIN_RESOURCE_NOT_FOUND', 'Resource was not found.');
      }
      const lifecycle = await fetchResourceLifecycle(pool, resourceId);
      if (!lifecycle) throw httpError(404, 'ADMIN_RESOURCE_NOT_FOUND', 'Resource was not found.');
      res.json({ lifecycle });
    } catch (error) {
      next(error);
    }
  });

  router.post('/resources/:resourceId/publish', requireAdmin, async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
      const resourceId = Number(req.params.resourceId);
      if (!Number.isInteger(resourceId) || resourceId < 1) {
        throw httpError(404, 'ADMIN_RESOURCE_NOT_FOUND', 'Resource was not found.');
      }
      await connection.beginTransaction();
      const current = await fetchResourceBase(connection, resourceId, true);
      if (!current) throw httpError(404, 'ADMIN_RESOURCE_NOT_FOUND', 'Resource was not found.');
      const readiness = await validateResourcePublishReadiness(connection, current);
      if (!readiness.valid) {
        throw httpError(409, 'ADMIN_RESOURCE_CANNOT_PUBLISH', 'Resource cannot be published until required content is complete.', {
          blockingReasons: readiness.reasons,
          optionalMissingLocales: readiness.optionalMissingLocales,
        });
      }
      await connection.query(
        `UPDATE resource_articles
         SET status = 'published',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [resourceId]
      );
      await ragService.syncResource(resourceId, connection);
      const saved = await fetchResourceBase(connection, resourceId);
      const translations = await fetchResourceTranslations(connection, resourceId);
      const ragDocuments = await ragRepository.listDocumentsForResource(resourceId, connection);
      const retrievableChunkCount = await ragRepository.countRetrievableChunksForResource(resourceId, connection);
      await connection.commit();
      res.json({
        ok: true,
        resource: mapResourceDetail(saved, translations, ragDocuments, retrievableChunkCount),
        optionalMissingLocales: readiness.optionalMissingLocales,
      });
    } catch (error) {
      try { await connection.rollback(); } catch {}
      next(error);
    } finally {
      connection.release();
    }
  });

  router.post('/resources/:resourceId/unpublish', requireAdmin, async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
      const resourceId = Number(req.params.resourceId);
      if (!Number.isInteger(resourceId) || resourceId < 1) {
        throw httpError(404, 'ADMIN_RESOURCE_NOT_FOUND', 'Resource was not found.');
      }
      await connection.beginTransaction();
      const current = await fetchResourceBase(connection, resourceId, true);
      if (!current) throw httpError(404, 'ADMIN_RESOURCE_NOT_FOUND', 'Resource was not found.');
      if (current.status === 'archived') {
        throw httpError(409, 'ADMIN_RESOURCE_ARCHIVED', 'Restore the Resource before returning it to Draft.');
      }
      await connection.query(
        `UPDATE resource_articles
         SET status = 'draft',
             rag_ready = 0,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [resourceId]
      );
      await ragService.syncResource(resourceId, connection);
      const saved = await fetchResourceBase(connection, resourceId);
      const translations = await fetchResourceTranslations(connection, resourceId);
      const ragDocuments = await ragRepository.listDocumentsForResource(resourceId, connection);
      const retrievableChunkCount = await ragRepository.countRetrievableChunksForResource(resourceId, connection);
      await connection.commit();
      res.json({
        ok: true,
        automaticChanges: ['rag_ready_disabled'],
        resource: mapResourceDetail(saved, translations, ragDocuments, retrievableChunkCount),
      });
    } catch (error) {
      try { await connection.rollback(); } catch {}
      next(error);
    } finally {
      connection.release();
    }
  });

  router.post('/resources/:resourceId/archive', requireAdmin, async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
      const resourceId = Number(req.params.resourceId);
      if (!Number.isInteger(resourceId) || resourceId < 1) {
        throw httpError(404, 'ADMIN_RESOURCE_NOT_FOUND', 'Resource was not found.');
      }

      await connection.beginTransaction();
      const current = await fetchResourceBase(connection, resourceId, true);
      if (!current) throw httpError(404, 'ADMIN_RESOURCE_NOT_FOUND', 'Resource was not found.');

      await connection.query(
        `UPDATE resource_articles
         SET status = 'archived',
             rag_ready = 0,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [resourceId]
      );
      await ragService.syncResource(resourceId, connection);
      const saved = await fetchResourceBase(connection, resourceId);
      const translations = await fetchResourceTranslations(connection, resourceId);
      const ragDocuments = await ragRepository.listDocumentsForResource(resourceId, connection);
      const retrievableChunkCount = await ragRepository.countRetrievableChunksForResource(resourceId, connection);
      await connection.commit();

      res.json({
        ok: true,
        resource: mapResourceDetail(saved, translations, ragDocuments, retrievableChunkCount),
        lifecycle: await fetchResourceLifecycle(pool, resourceId),
      });
    } catch (error) {
      try {
        await connection.rollback();
      } catch {}
      next(error);
    } finally {
      connection.release();
    }
  });

  router.post('/resources/:resourceId/restore', requireAdmin, async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
      const resourceId = Number(req.params.resourceId);
      if (!Number.isInteger(resourceId) || resourceId < 1) {
        throw httpError(404, 'ADMIN_RESOURCE_NOT_FOUND', 'Resource was not found.');
      }

      await connection.beginTransaction();
      const current = await fetchResourceBase(connection, resourceId, true);
      if (!current) throw httpError(404, 'ADMIN_RESOURCE_NOT_FOUND', 'Resource was not found.');

      await connection.query(
        `UPDATE resource_articles
         SET status = 'draft',
             rag_ready = 0,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [resourceId]
      );
      await ragService.syncResource(resourceId, connection);
      const saved = await fetchResourceBase(connection, resourceId);
      const translations = await fetchResourceTranslations(connection, resourceId);
      const ragDocuments = await ragRepository.listDocumentsForResource(resourceId, connection);
      const retrievableChunkCount = await ragRepository.countRetrievableChunksForResource(resourceId, connection);
      await connection.commit();

      res.json({
        ok: true,
        resource: mapResourceDetail(saved, translations, ragDocuments, retrievableChunkCount),
        lifecycle: await fetchResourceLifecycle(pool, resourceId),
      });
    } catch (error) {
      try {
        await connection.rollback();
      } catch {}
      next(error);
    } finally {
      connection.release();
    }
  });

  router.delete('/resources/:resourceId', requireAdmin, async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
      const resourceId = Number(req.params.resourceId);
      if (!Number.isInteger(resourceId) || resourceId < 1) {
        throw httpError(404, 'ADMIN_RESOURCE_NOT_FOUND', 'Resource was not found.');
      }
      const confirmationSlug = String(req.body?.confirmationSlug || '');

      await connection.beginTransaction();
      const current = await fetchResourceBase(connection, resourceId, true);
      if (!current) throw httpError(404, 'ADMIN_RESOURCE_NOT_FOUND', 'Resource was not found.');
      if (confirmationSlug !== current.slug) {
        throw httpError(400, 'ADMIN_RESOURCE_DELETE_SLUG_MISMATCH', 'Type the exact Resource slug to permanently delete this draft.', {
          errors: { confirmationSlug: 'mismatch' },
        });
      }

      const references = await countResourceLifecycleReferences(connection, resourceId, current.slug);
      const eligibility = mapLifecycleEligibility(current, references);
      if (!eligibility.canPermanentlyDelete) {
        await connection.rollback();
        return res.status(409).json({
          code: 'ADMIN_RESOURCE_DELETE_NOT_ELIGIBLE',
          message: 'This Resource cannot be permanently deleted. Archive it instead.',
          canArchive: eligibility.canArchive,
          canRestore: eligibility.canRestore,
          counts: eligibility.counts,
          blockingReasons: eligibility.blockingReasons,
          reasons: eligibility.reasons,
          archiveAvailable: eligibility.canArchive,
        });
      }

      await connection.query('DELETE FROM resource_article_translations WHERE resource_id = ?', [resourceId]);
      await connection.query('DELETE FROM resource_articles WHERE id = ?', [resourceId]);
      await connection.commit();

      res.json({
        ok: true,
        deletedResourceId: resourceId,
        deletedSlug: current.slug,
      });
    } catch (error) {
      try {
        await connection.rollback();
      } catch {}
      next(error);
    } finally {
      connection.release();
    }
  });

  router.get('/resources/:resourceId/content', requireAdmin, async (req, res, next) => {
    try {
      const resourceId = Number(req.params.resourceId);
      if (!Number.isInteger(resourceId) || resourceId < 1) {
        throw httpError(404, 'ADMIN_RESOURCE_NOT_FOUND', 'Resource was not found.');
      }
      const resource = await fetchContentResource(pool, resourceId);
      if (!resource) throw httpError(404, 'ADMIN_RESOURCE_NOT_FOUND', 'Resource was not found.');
      const translations = await fetchContentTranslations(pool, resourceId);
      res.json({
        resource: mapResourceForContent(resource),
        translations: buildTranslationsMap(translations),
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/resources/:resourceId/metadata', requireAdmin, async (req, res, next) => {
    try {
      const resourceId = Number(req.params.resourceId);
      if (!Number.isInteger(resourceId) || resourceId < 1) {
        throw httpError(404, 'ADMIN_RESOURCE_NOT_FOUND', 'Resource was not found.');
      }
      const resource = await fetchResourceForMetadata(pool, resourceId);
      if (!resource) throw httpError(404, 'ADMIN_RESOURCE_NOT_FOUND', 'Resource was not found.');
      res.json({ resource: mapResourceMetadata(resource) });
    } catch (error) {
      next(error);
    }
  });

  router.patch('/resources/:resourceId/metadata', requireAdmin, async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
      const resourceId = Number(req.params.resourceId);
      if (!Number.isInteger(resourceId) || resourceId < 1) {
        throw httpError(404, 'ADMIN_RESOURCE_NOT_FOUND', 'Resource was not found.');
      }
      const categories = new Set(await listValidCategories(connection));
      const payload = validateMetadataPayload(req.body || {}, categories);

      await connection.beginTransaction();
      const current = await fetchResourceForMetadata(connection, resourceId, true);
      if (!current) throw httpError(404, 'ADMIN_RESOURCE_NOT_FOUND', 'Resource was not found.');
      await updateResourceMetadata(connection, resourceId, payload, current);
      const saved = await fetchResourceForMetadata(connection, resourceId);
      await connection.commit();

      res.json({
        ok: true,
        resource: mapResourceMetadata(saved),
      });
    } catch (error) {
      try {
        await connection.rollback();
      } catch {}
      next(error);
    } finally {
      connection.release();
    }
  });

  router.patch('/resources/:resourceId/content', requireAdmin, async (req, res, next) => {
    const connection = await pool.getConnection();
    let savedResource = null;
    let savedTranslation = null;
    let payload = null;
    try {
      const resourceId = Number(req.params.resourceId);
      if (!Number.isInteger(resourceId) || resourceId < 1) {
        throw httpError(404, 'ADMIN_RESOURCE_NOT_FOUND', 'Resource was not found.');
      }
      payload = validateContentPayload(req.body || {});

      await connection.beginTransaction();
      const current = await fetchContentResource(connection, resourceId, true);
      if (!current) throw httpError(404, 'ADMIN_RESOURCE_NOT_FOUND', 'Resource was not found.');
      savedTranslation = await saveContentTranslation(connection, resourceId, payload);
      savedResource = await fetchContentResource(connection, resourceId);
      await connection.commit();
    } catch (error) {
      try {
        await connection.rollback();
      } catch {}
      return next(error);
    } finally {
      connection.release();
    }

    const resource = mapResourceForContent(savedResource);
    const ragSync = {
      attempted: false,
      succeeded: false,
      reason: 'resource_not_rag_eligible',
    };

    if (resource.effectiveRagEligible) {
      ragSync.attempted = true;
      try {
        const syncResult = await ragService.syncResourceTranslation(resource.id, payload.locale);
        ragSync.succeeded = Boolean(syncResult.effectiveRagEligible);
        ragSync.reason = syncResult.effectiveRagEligible
          ? 'eligible_resource_translation_updated'
          : (syncResult.reasons?.[0] || 'resource_not_rag_eligible');
        ragSync.documents = syncResult.documents;
        ragSync.chunks = syncResult.chunks;
      } catch {
        ragSync.succeeded = false;
        ragSync.reason = 'rag_sync_failed';
      }
    }

    res.json({
      ok: true,
      resource,
      translation: mapTranslation(savedTranslation),
      ragSync,
    });
  });

  router.patch('/resources/:resourceId/governance', requireAdmin, async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
      const resourceId = Number(req.params.resourceId);
      if (!Number.isInteger(resourceId) || resourceId < 1) {
        throw httpError(404, 'ADMIN_RESOURCE_NOT_FOUND', 'Resource was not found.');
      }

      const body = req.body || {};
      const unknownFields = Object.keys(body).filter(field => !ALLOWED_GOVERNANCE_FIELDS.has(field));
      if (unknownFields.length) {
        throw httpError(400, 'ADMIN_RESOURCE_UNKNOWN_FIELDS', 'Unknown governance fields are not allowed.', {
          errors: { fields: unknownFields },
        });
      }

      const normalized = {};
      if (body.publicationStatus !== undefined) {
        normalized.publicationStatus = String(body.publicationStatus).trim();
        if (!PUBLICATION_STATUSES.has(normalized.publicationStatus)) {
          throw httpError(400, 'ADMIN_RESOURCE_INVALID_PUBLICATION_STATUS', 'Publication status is invalid.');
        }
      }
      if (body.reviewStatus !== undefined) {
        normalized.reviewStatus = String(body.reviewStatus).trim();
        if (!REVIEW_STATUSES.has(normalized.reviewStatus)) {
          throw httpError(400, 'ADMIN_RESOURCE_INVALID_REVIEW_STATUS', 'Review status is invalid.');
        }
      }
      if (body.ragReady !== undefined) {
        normalized.ragReady = parseBooleanInput(body.ragReady);
        if (normalized.ragReady === Symbol.for('invalid_boolean')) {
          throw httpError(400, 'ADMIN_RESOURCE_INVALID_RAG_READY', 'RAG readiness value is invalid.');
        }
      }
      if (body.reviewNotes !== undefined) normalized.reviewNotes = normalizeNullableText(body.reviewNotes);
      if (body.nextReviewAt !== undefined) {
        normalized.nextReviewAt = normalizeNextReviewAt(body.nextReviewAt);
        if (normalized.nextReviewAt === Symbol.for('invalid_date')) {
          throw httpError(400, 'ADMIN_RESOURCE_INVALID_NEXT_REVIEW_AT', 'Next review date is invalid.');
        }
      }

      await connection.beginTransaction();
      const current = await fetchResourceBase(connection, resourceId, true);
      if (!current) throw httpError(404, 'ADMIN_RESOURCE_NOT_FOUND', 'Resource was not found.');

      const nextState = {
        status: normalized.publicationStatus || current.status,
        review_status: normalized.reviewStatus || current.review_status,
        rag_ready: normalized.ragReady === undefined ? toBoolean(current.rag_ready) : normalized.ragReady,
      };
      const automaticChanges = [];
      if ((nextState.status !== 'published' || nextState.review_status !== 'approved') && nextState.rag_ready) {
        nextState.rag_ready = false;
        automaticChanges.push('rag_ready_disabled');
      }

      const updateColumns = [
        'status = ?',
        'review_status = ?',
        'rag_ready = ?',
        'updated_at = CURRENT_TIMESTAMP',
      ];
      const updateParams = [
        nextState.status,
        nextState.review_status,
        nextState.rag_ready ? 1 : 0,
      ];

      if (normalized.reviewStatus !== undefined) {
        updateColumns.push('reviewed_by = ?', 'reviewed_at = CURRENT_TIMESTAMP');
        updateParams.push(req.adminUser.id);
      }
      if (normalized.reviewNotes !== undefined) {
        updateColumns.push('review_notes = ?');
        updateParams.push(normalized.reviewNotes);
      }
      if (normalized.nextReviewAt !== undefined) {
        updateColumns.push('next_review_at = ?');
        updateParams.push(normalized.nextReviewAt);
      }

      updateParams.push(resourceId);
      await connection.query(
        `UPDATE resource_articles
         SET ${updateColumns.join(', ')}
         WHERE id = ?`,
        updateParams
      );

      await ragService.syncResource(resourceId, connection);
      const saved = await fetchResourceBase(connection, resourceId);
      const translations = await fetchResourceTranslations(connection, resourceId);
      const ragDocuments = await ragRepository.listDocumentsForResource(resourceId, connection);
      const retrievableChunkCount = await ragRepository.countRetrievableChunksForResource(resourceId, connection);
      await connection.commit();

      res.json({
        ok: true,
        automaticChanges,
        resource: mapResourceDetail(saved, translations, ragDocuments, retrievableChunkCount),
      });
    } catch (error) {
      try {
        await connection.rollback();
      } catch {}
      next(error);
    } finally {
      connection.release();
    }
  });

  return router;
}

module.exports = {
  ADMIN_MODULES,
  createAdminRouter,
};

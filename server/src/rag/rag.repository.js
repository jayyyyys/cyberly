const { mapRetrievedChunk } = require('./rag.mapper');
const { APPROVED_REVIEW_STATUS, RETRIEVABLE_STATUS } = require('./rag.policy');
const {
  evaluateResourceRagEligibility,
  mapReviewStatusForRagDocument,
} = require('../resource/resource.governance');

function parseLimit(value, fallback = 4) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) return fallback;
  return Math.min(number, 8);
}

function escapeLike(value) {
  return String(value).replace(/[\\%_]/g, character => `\\${character}`);
}

function searchableTerms(query) {
  const normalized = String(query || '').trim().toLowerCase();
  if (!normalized) return [];
  const words = normalized
    .split(/[^\p{L}\p{N}-]+/u)
    .map(word => word.trim())
    .filter(word => word.length >= 2);
  return words.length ? Array.from(new Set(words)).slice(0, 8) : [normalized];
}

function createRagRepository(pool) {
  function db(connection) {
    return connection || pool;
  }

  async function withTransaction(callback) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async function listPublishedResourceTranslations(connection) {
    const [rows] = await db(connection).query(
      `SELECT ra.id AS resource_id,
              ra.slug,
              ra.category_code,
              ra.source_url,
              ra.status,
              ra.review_status,
              ra.rag_ready,
              ra.reviewed_at,
              ra.next_review_at,
              NULL AS source_updated_at,
              rat.locale,
              rat.title,
              rat.summary,
              rat.content_json,
              rat.source_label
       FROM resource_articles ra
       JOIN resource_article_translations rat ON rat.resource_id = ra.id
       WHERE ra.status = 'published'
         AND ra.review_status = 'approved'
         AND ra.rag_ready = 1
       ORDER BY ra.display_order, ra.id, FIELD(rat.locale, 'en', 'ms', 'zh-CN'), rat.locale`
    );
    return rows;
  }

  async function listResourceTranslationsById(resourceId, connection) {
    const [rows] = await db(connection).query(
      `SELECT ra.id AS resource_id,
              ra.slug,
              ra.category_code,
              ra.source_url,
              ra.status,
              ra.review_status,
              ra.rag_ready,
              ra.reviewed_at,
              ra.next_review_at,
              NULL AS source_updated_at,
              rat.locale,
              rat.title,
              rat.summary,
              rat.content_json,
              rat.source_label
       FROM resource_articles ra
       JOIN resource_article_translations rat ON rat.resource_id = ra.id
       WHERE ra.id = ?
       ORDER BY FIELD(rat.locale, 'en', 'ms', 'zh-CN'), rat.locale`,
      [resourceId]
    );
    return rows;
  }

  async function findResourceTranslationByIdAndLocale(resourceId, locale, connection) {
    const [rows] = await db(connection).query(
      `SELECT ra.id AS resource_id,
              ra.slug,
              ra.category_code,
              ra.source_url,
              ra.status,
              ra.review_status,
              ra.rag_ready,
              ra.reviewed_at,
              ra.next_review_at,
              NULL AS source_updated_at,
              rat.locale,
              rat.title,
              rat.summary,
              rat.content_json,
              rat.source_label
       FROM resource_articles ra
       JOIN resource_article_translations rat ON rat.resource_id = ra.id
       WHERE ra.id = ?
         AND rat.locale = ?
       LIMIT 1`,
      [resourceId, locale]
    );
    return rows[0] || null;
  }

  async function listResourceGovernanceStates(connection) {
    const [rows] = await db(connection).query(
      `SELECT id AS resource_id,
              status,
              review_status,
              rag_ready,
              reviewed_at,
              next_review_at
       FROM resource_articles
       ORDER BY id`
    );
    return rows;
  }

  async function upsertResourceDocument(resource, connection) {
    const eligibility = evaluateResourceRagEligibility({
      status: resource.status,
      review_status: resource.review_status,
      rag_ready: resource.rag_ready,
    });
    const documentStatus = resource.status || 'draft';
    const documentReviewStatus = mapReviewStatusForRagDocument(resource.review_status);
    const documentRagReady = eligibility.effectiveRagEligible ? 1 : 0;
    const internalTarget = {
      page: 'resources',
      resourceId: Number(resource.resource_id),
      resourceSlug: resource.slug,
    };
    await db(connection).query(
      `INSERT INTO rag_documents (
          content_type,
          content_code,
          resource_id,
          locale,
          title,
          summary,
          category_code,
          source_label,
          source_organisation,
          source_url,
          internal_target_json,
          status,
          review_status,
          rag_ready,
          source_updated_at,
          last_reviewed_at,
          next_review_at
       )
       VALUES (
          'resource', ?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON),
          ?, ?, ?, ?, ?, ?
       )
       ON DUPLICATE KEY UPDATE
          content_code = VALUES(content_code),
          title = VALUES(title),
          summary = VALUES(summary),
          category_code = VALUES(category_code),
          source_label = VALUES(source_label),
          source_organisation = VALUES(source_organisation),
          source_url = VALUES(source_url),
          internal_target_json = VALUES(internal_target_json),
          status = VALUES(status),
          review_status = VALUES(review_status),
          rag_ready = VALUES(rag_ready),
          source_updated_at = VALUES(source_updated_at),
          last_reviewed_at = VALUES(last_reviewed_at),
          next_review_at = VALUES(next_review_at)`,
      [
        `resource:${resource.slug}`,
        resource.resource_id,
        resource.locale,
        resource.title,
        resource.summary,
        resource.category_code,
        resource.source_label,
        resource.source_label,
        resource.source_url,
        JSON.stringify(internalTarget),
        documentStatus,
        documentReviewStatus,
        documentRagReady,
        resource.source_updated_at || null,
        resource.reviewed_at || null,
        resource.next_review_at || null,
      ]
    );

    const [rows] = await db(connection).query(
      `SELECT *
       FROM rag_documents
       WHERE resource_id = ?
         AND locale = ?
         AND content_type = 'resource'
       LIMIT 1`,
      [resource.resource_id, resource.locale]
    );
    return rows[0] || null;
  }

  async function updateResourceDocumentGovernance(resourceId, resourceState, connection) {
    const eligibility = evaluateResourceRagEligibility(resourceState);
    await db(connection).query(
      `UPDATE rag_documents
       SET status = ?,
           review_status = ?,
           rag_ready = ?,
           last_reviewed_at = ?,
           next_review_at = ?
       WHERE resource_id = ?
         AND content_type = 'resource'`,
      [
        resourceState.status || 'draft',
        mapReviewStatusForRagDocument(resourceState.review_status),
        eligibility.effectiveRagEligible ? 1 : 0,
        resourceState.reviewed_at || null,
        resourceState.next_review_at || null,
        resourceId,
      ]
    );
  }

  async function updateResourceDocumentGovernanceForLocale(resourceId, locale, resourceState, connection) {
    const eligibility = evaluateResourceRagEligibility(resourceState);
    await db(connection).query(
      `UPDATE rag_documents
       SET status = ?,
           review_status = ?,
           rag_ready = ?,
           last_reviewed_at = ?,
           next_review_at = ?
       WHERE resource_id = ?
         AND locale = ?
         AND content_type = 'resource'`,
      [
        resourceState.status || 'draft',
        mapReviewStatusForRagDocument(resourceState.review_status),
        eligibility.effectiveRagEligible ? 1 : 0,
        resourceState.reviewed_at || null,
        resourceState.next_review_at || null,
        resourceId,
        locale,
      ]
    );
  }

  async function listDocumentsForResource(resourceId, connection) {
    const [rows] = await db(connection).query(
      `SELECT rd.id,
              rd.content_type,
              rd.resource_id,
              rd.locale,
              rd.title,
              rd.status,
              rd.review_status,
              rd.rag_ready,
              rd.updated_at,
              COUNT(rc.id) AS chunk_count,
              SUM(CASE WHEN rd.status = 'published'
                         AND rd.review_status = 'approved'
                         AND rd.rag_ready = 1
                       THEN 1 ELSE 0 END) AS retrievable_chunk_count
       FROM rag_documents rd
       LEFT JOIN rag_chunks rc ON rc.document_id = rd.id
       WHERE rd.resource_id = ?
         AND rd.content_type = 'resource'
       GROUP BY rd.id,
                rd.content_type,
                rd.resource_id,
                rd.locale,
                rd.title,
                rd.status,
                rd.review_status,
                rd.rag_ready,
                rd.updated_at
       ORDER BY FIELD(rd.locale, 'en', 'ms', 'zh-CN'), rd.locale`,
      [resourceId]
    );
    return rows;
  }

  async function countRetrievableChunksForResource(resourceId, connection) {
    const [[row]] = await db(connection).query(
      `SELECT COUNT(rc.id) AS count
       FROM rag_chunks rc
       JOIN rag_documents rd ON rd.id = rc.document_id
       WHERE rd.resource_id = ?
         AND rd.content_type = 'resource'
         AND rd.status = 'published'
         AND rd.review_status = 'approved'
         AND rd.rag_ready = 1`,
      [resourceId]
    );
    return Number(row?.count || 0);
  }

  async function replaceChunks(documentId, chunks, connection) {
    await db(connection).query('DELETE FROM rag_chunks WHERE document_id = ?', [documentId]);
    if (!chunks.length) return [];

    const values = chunks.map(chunk => [
      documentId,
      chunk.chunkIndex,
      chunk.heading,
      chunk.chunkText,
      chunk.tokenEstimate,
      JSON.stringify(chunk.metadata || {}),
    ]);
    await db(connection).query(
      `INSERT INTO rag_chunks (
          document_id,
          chunk_index,
          heading,
          chunk_text,
          token_estimate,
          metadata_json
       )
       VALUES ?`,
      [values]
    );

    const [rows] = await db(connection).query(
      `SELECT *
       FROM rag_chunks
       WHERE document_id = ?
       ORDER BY chunk_index`,
      [documentId]
    );
    return rows;
  }

  async function countDocuments(connection) {
    const [[row]] = await db(connection).query('SELECT COUNT(*) AS count FROM rag_documents');
    return Number(row?.count || 0);
  }

  async function countChunks(connection) {
    const [[row]] = await db(connection).query('SELECT COUNT(*) AS count FROM rag_chunks');
    return Number(row?.count || 0);
  }

  async function searchChunks(options = {}, connection) {
    const locale = options.locale;
    const limit = parseLimit(options.limit);
    const query = String(options.query || '').trim();
    const terms = searchableTerms(query);
    if (!terms.length) return [];

    const conditions = [
      'rd.status = ?',
      'rd.review_status = ?',
      'rd.rag_ready = 1',
      'rd.content_type = ?',
      'rd.locale = ?',
    ];
    const conditionParams = [RETRIEVABLE_STATUS, APPROVED_REVIEW_STATUS, 'resource', locale];

    if (options.categoryCode) {
      conditions.push('rd.category_code = ?');
      conditionParams.push(options.categoryCode);
    }
    if (options.topicCode) {
      conditions.push('rd.topic_code = ?');
      conditionParams.push(options.topicCode);
    }

    const likeConditions = [];
    const searchParams = [];
    const scoreParts = [
      '(MATCH(rc.heading, rc.chunk_text) AGAINST (? IN NATURAL LANGUAGE MODE) * 10)',
    ];
    const scoreParams = [query];
    for (const term of terms) {
      const like = `%${escapeLike(term)}%`;
      likeConditions.push('(LOWER(rc.chunk_text) LIKE ? ESCAPE \'\\\\\' OR LOWER(COALESCE(rc.heading, \'\')) LIKE ? ESCAPE \'\\\\\' OR LOWER(rd.title) LIKE ? ESCAPE \'\\\\\' OR LOWER(COALESCE(rd.summary, \'\')) LIKE ? ESCAPE \'\\\\\')');
      searchParams.push(like, like, like, like);
      scoreParts.push('(CASE WHEN LOWER(rc.chunk_text) LIKE ? ESCAPE \'\\\\\' THEN 3 ELSE 0 END)');
      scoreParts.push('(CASE WHEN LOWER(COALESCE(rc.heading, \'\')) LIKE ? ESCAPE \'\\\\\' THEN 2 ELSE 0 END)');
      scoreParts.push('(CASE WHEN LOWER(rd.title) LIKE ? ESCAPE \'\\\\\' THEN 4 ELSE 0 END)');
      scoreParts.push('(CASE WHEN LOWER(COALESCE(rd.summary, \'\')) LIKE ? ESCAPE \'\\\\\' THEN 2 ELSE 0 END)');
      scoreParams.push(like, like, like, like);
    }

    const searchCondition = `(MATCH(rc.heading, rc.chunk_text) AGAINST (? IN NATURAL LANGUAGE MODE) OR ${likeConditions.join(' OR ')})`;
    const sqlParams = [
      ...scoreParams,
      ...conditionParams,
      query,
      ...searchParams,
      limit,
    ];

    const [rows] = await db(connection).query(
      `SELECT rc.id AS chunk_id,
              rc.document_id,
              rd.title,
              rd.source_label,
              rd.source_organisation,
              rd.source_url,
              rd.internal_target_json,
              rd.locale,
              rc.chunk_text,
              (${scoreParts.join(' + ')}) AS score
       FROM rag_chunks rc
       JOIN rag_documents rd ON rd.id = rc.document_id
       WHERE ${conditions.join(' AND ')}
         AND ${searchCondition}
       ORDER BY score DESC, rd.id, rc.chunk_index
       LIMIT ?`,
      sqlParams
    );
    return rows.map(mapRetrievedChunk).filter(Boolean);
  }

  return {
    countChunks,
    countDocuments,
    listPublishedResourceTranslations,
    findResourceTranslationByIdAndLocale,
    listResourceGovernanceStates,
    listResourceTranslationsById,
    listDocumentsForResource,
    replaceChunks,
    searchChunks,
    countRetrievableChunksForResource,
    updateResourceDocumentGovernance,
    updateResourceDocumentGovernanceForLocale,
    upsertResourceDocument,
    withTransaction,
  };
}

module.exports = {
  createRagRepository,
};

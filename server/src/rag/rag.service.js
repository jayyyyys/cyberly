const { normalizeLocale } = require('../i18n/locale');
const { buildResourceChunks } = require('./rag.chunker');
const { evaluateResourceRagEligibility } = require('../resource/resource.governance');

const DEFAULT_RETRIEVAL_LIMIT = 4;

function validateQuery(query) {
  const text = String(query || '').trim();
  if (!text) throw new Error('RAG query is required.');
  return text;
}

function createRagService(repository) {
  async function ingestPublishedResources() {
    return repository.withTransaction(async (connection) => {
      const resourceStates = await repository.listResourceGovernanceStates(connection);
      for (const resource of resourceStates) {
        await repository.updateResourceDocumentGovernance(resource.resource_id, resource, connection);
      }

      const resources = await repository.listPublishedResourceTranslations(connection);
      let chunkTotal = 0;
      for (const resource of resources) {
        const document = await repository.upsertResourceDocument(resource, connection);
        if (!document) continue;
        const chunks = buildResourceChunks(resource);
        await repository.replaceChunks(document.id, chunks, connection);
        chunkTotal += chunks.length;
      }
      return {
        documents: await repository.countDocuments(connection),
        chunks: chunkTotal,
      };
    });
  }

  async function syncResource(resourceId, connection) {
    const run = async (activeConnection) => {
      const resources = await repository.listResourceTranslationsById(resourceId, activeConnection);
      if (!resources.length) {
        return {
          found: false,
          effectiveRagEligible: false,
          reasons: ['resource_not_found'],
          documents: 0,
          chunks: 0,
        };
      }

      const resourceState = resources[0];
      const eligibility = evaluateResourceRagEligibility({
        status: resourceState.status,
        review_status: resourceState.review_status,
        rag_ready: resourceState.rag_ready,
      });

      await repository.updateResourceDocumentGovernance(resourceId, resourceState, activeConnection);
      if (!eligibility.effectiveRagEligible) {
        return {
          found: true,
          effectiveRagEligible: false,
          reasons: eligibility.reasons,
          documents: resources.length,
          chunks: await repository.countRetrievableChunksForResource(resourceId, activeConnection),
        };
      }

      let chunkTotal = 0;
      for (const resource of resources) {
        const document = await repository.upsertResourceDocument(resource, activeConnection);
        if (!document) continue;
        const chunks = buildResourceChunks(resource);
        await repository.replaceChunks(document.id, chunks, activeConnection);
        chunkTotal += chunks.length;
      }

      return {
        found: true,
        effectiveRagEligible: true,
        reasons: [],
        documents: resources.length,
        chunks: chunkTotal,
      };
    };

    if (connection) return run(connection);
    return repository.withTransaction(run);
  }

  async function syncResourceTranslation(resourceId, locale, connection) {
    const run = async (activeConnection) => {
      const resource = await repository.findResourceTranslationByIdAndLocale(resourceId, locale, activeConnection);
      if (!resource) {
        return {
          found: false,
          effectiveRagEligible: false,
          reasons: ['resource_translation_not_found'],
          documents: 0,
          chunks: 0,
        };
      }

      const eligibility = evaluateResourceRagEligibility({
        status: resource.status,
        review_status: resource.review_status,
        rag_ready: resource.rag_ready,
      });

      await repository.updateResourceDocumentGovernanceForLocale(resourceId, locale, resource, activeConnection);
      if (!eligibility.effectiveRagEligible) {
        return {
          found: true,
          effectiveRagEligible: false,
          reasons: eligibility.reasons,
          documents: 0,
          chunks: 0,
        };
      }

      const document = await repository.upsertResourceDocument(resource, activeConnection);
      if (!document) {
        return {
          found: true,
          effectiveRagEligible: true,
          reasons: [],
          documents: 0,
          chunks: 0,
        };
      }
      const chunks = buildResourceChunks(resource);
      await repository.replaceChunks(document.id, chunks, activeConnection);
      return {
        found: true,
        effectiveRagEligible: true,
        reasons: [],
        documents: 1,
        chunks: chunks.length,
      };
    };

    if (connection) return run(connection);
    return repository.withTransaction(run);
  }

  async function retrieveForLocale({ query, locale, topicCode, categoryCode, limit }) {
    return repository.searchChunks({
      query,
      locale,
      topicCode,
      categoryCode,
      limit,
    });
  }

  async function retrieveReviewedChunks(input = {}) {
    const query = validateQuery(input.query);
    const locale = normalizeLocale(input.locale);
    const limit = Number.isInteger(Number(input.limit))
      ? Math.min(Math.max(Number(input.limit), 1), 8)
      : DEFAULT_RETRIEVAL_LIMIT;

    const primary = await retrieveForLocale({
      query,
      locale,
      topicCode: input.topicCode || null,
      categoryCode: input.categoryCode || null,
      limit,
    });

    if (locale === 'en' || primary.length >= limit) {
      return primary.slice(0, limit);
    }

    const fallback = await retrieveForLocale({
      query,
      locale: 'en',
      topicCode: input.topicCode || null,
      categoryCode: input.categoryCode || null,
      limit: limit - primary.length,
    });
    const seen = new Set(primary.map(item => item.chunkId));
    const merged = [...primary];
    for (const item of fallback) {
      if (seen.has(item.chunkId)) continue;
      seen.add(item.chunkId);
      merged.push(item);
      if (merged.length >= limit) break;
    }
    return merged;
  }

  return {
    ingestPublishedResources,
    retrieveReviewedChunks,
    syncResource,
    syncResourceTranslation,
  };
}

module.exports = {
  createRagService,
};

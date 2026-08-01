const { safeInternalTarget } = require('./rag.policy');

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function parseJson(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function snippetFromText(value) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length > 360 ? `${text.slice(0, 357).trim()}...` : text;
}

function mapRetrievedChunk(row) {
  if (!row) return null;
  return {
    chunkId: Number(row.chunk_id),
    documentId: Number(row.document_id),
    title: row.title,
    sourceLabel: row.source_label || null,
    sourceOrganisation: row.source_organisation || null,
    sourceUrl: row.source_url || null,
    internalTarget: safeInternalTarget(parseJson(row.internal_target_json)),
    locale: row.locale,
    snippet: snippetFromText(row.chunk_text),
    score: toNumber(row.score),
  };
}

module.exports = {
  mapRetrievedChunk,
};

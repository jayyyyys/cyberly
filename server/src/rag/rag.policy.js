const ALLOWED_CONTENT_TYPES = new Set(['resource']);
const ALLOWED_TARGET_PAGES = new Set(['resources']);
const RETRIEVABLE_STATUS = 'published';
const APPROVED_REVIEW_STATUS = 'approved';

function isRetrievableDocument(row) {
  return Boolean(
    row &&
    ALLOWED_CONTENT_TYPES.has(row.content_type) &&
    row.status === RETRIEVABLE_STATUS &&
    row.review_status === APPROVED_REVIEW_STATUS &&
    Number(row.rag_ready) === 1
  );
}

function safeInternalTarget(target) {
  if (!target || typeof target !== 'object') return null;
  if (!ALLOWED_TARGET_PAGES.has(target.page)) return null;

  const safe = { page: target.page };
  if (target.resourceSlug) safe.resourceSlug = String(target.resourceSlug);
  if (target.resourceId !== undefined && target.resourceId !== null) {
    const resourceId = Number(target.resourceId);
    if (Number.isInteger(resourceId) && resourceId > 0) safe.resourceId = resourceId;
  }
  return safe;
}

module.exports = {
  APPROVED_REVIEW_STATUS,
  RETRIEVABLE_STATUS,
  isRetrievableDocument,
  safeInternalTarget,
};

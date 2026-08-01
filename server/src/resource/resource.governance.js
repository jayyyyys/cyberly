const PUBLICATION_STATUSES = new Set(['draft', 'published', 'archived']);
const REVIEW_STATUSES = new Set(['draft', 'needs_review', 'approved', 'rejected']);

function toBoolean(value) {
  return Number(value || 0) === 1;
}

function mapReviewStatusForRagDocument(reviewStatus) {
  if (reviewStatus === 'approved') return 'approved';
  if (reviewStatus === 'rejected') return 'rejected';
  return 'pending';
}

function evaluateResourceRagEligibility(resource) {
  const reasons = [];
  if (!resource || resource.status !== 'published') reasons.push('resource_not_published');
  if (!resource || resource.review_status !== 'approved') reasons.push('resource_not_approved');
  if (!resource || !toBoolean(resource.rag_ready)) reasons.push('resource_rag_disabled');

  return {
    effectiveRagEligible: reasons.length === 0,
    reasons,
  };
}

function normalizeNextReviewAt(value) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const text = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return Symbol.for('invalid_date');
  const date = new Date(`${text}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return Symbol.for('invalid_date');
  return text;
}

module.exports = {
  PUBLICATION_STATUSES,
  REVIEW_STATUSES,
  evaluateResourceRagEligibility,
  mapReviewStatusForRagDocument,
  normalizeNextReviewAt,
  toBoolean,
};

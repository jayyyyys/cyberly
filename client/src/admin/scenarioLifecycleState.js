export const SCENARIO_LIFECYCLE_COUNT_KEYS = [
  "steps",
  "choices",
  "attempts",
  "completedAttempts",
  "decisions",
  "progressReferences",
  "recommendationReferences",
  "ragDocuments",
];

function normalizeCounts(value) {
  if (!value) return {};
  return {
    steps: Number(value.steps || 0),
    choices: Number(value.choices || 0),
    attempts: Number(value.attempts || 0),
    completedAttempts: Number(value.completedAttempts || 0),
    decisions: Number(value.decisions || 0),
    progressReferences: Number(value.progressReferences || 0),
    recommendationReferences: Number(value.recommendationReferences || 0),
    ragDocuments: Number(value.ragDocuments || 0),
  };
}

function normalizeReasons(value) {
  if (Array.isArray(value?.blockingReasons)) return value.blockingReasons;
  if (Array.isArray(value?.reasons)) {
    return value.reasons.map(reason => typeof reason === "string" ? { code: reason, count: 1 } : reason);
  }
  return [];
}

export function normalizeScenarioLifecycle(value) {
  return {
    loaded: Boolean(value),
    scenarioId: value?.scenarioId || null,
    slug: value?.slug || "",
    title: value?.title || "",
    status: value?.status || "draft",
    firstPublishedAt: value?.firstPublishedAt || null,
    hasEverPublished: Boolean(value?.hasEverPublished),
    canArchive: Boolean(value?.canArchive),
    canRestore: Boolean(value?.canRestore),
    canPermanentlyDelete: Boolean(value?.canPermanentlyDelete),
    counts: normalizeCounts(value?.counts),
    blockingReasons: normalizeReasons(value),
  };
}

export function canConfirmScenarioDelete({ lifecycle, slug, confirmationSlug }) {
  return Boolean(lifecycle?.canPermanentlyDelete && slug && confirmationSlug === slug);
}

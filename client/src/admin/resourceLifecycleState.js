const COUNT_KEYS = [
  "translations",
  "ragDocuments",
  "ragChunks",
  "chatSourceReferences",
  "contentRelationships",
];

function toCount(value) {
  const count = Number(value || 0);
  return Number.isFinite(count) && count > 0 ? count : 0;
}

function normalizeReason(reason) {
  if (!reason) return null;
  if (typeof reason === "string") {
    return { code: reason, count: 1 };
  }
  const code = String(reason.code || "").trim();
  if (!code) return null;
  return {
    code,
    count: toCount(reason.count) || 1,
  };
}

function normalizeCounts(value) {
  return COUNT_KEYS.reduce((counts, key) => {
    counts[key] = toCount(value?.[key]);
    return counts;
  }, {});
}

export function normalizeLifecycle(value) {
  const counts = normalizeCounts(value?.counts);
  const blockingReasons = (Array.isArray(value?.blockingReasons) && value.blockingReasons.length
    ? value.blockingReasons
    : Array.isArray(value?.reasons)
      ? value.reasons
      : [])
    .map(normalizeReason)
    .filter(Boolean);

  return {
    loaded: Boolean(value?.loaded ?? value),
    canArchive: Boolean(value?.canArchive ?? value?.archiveAvailable),
    canRestore: Boolean(value?.canRestore),
    canPermanentlyDelete: Boolean(value?.canPermanentlyDelete),
    counts,
    blockingReasons,
    reasons: Array.isArray(value?.reasons)
      ? value.reasons.filter(Boolean).map(String)
      : blockingReasons.map(reason => reason.code),
    archiveAvailable: Boolean(value?.archiveAvailable ?? value?.canArchive),
  };
}

export function getLifecycleBlockingReasons(value) {
  return normalizeLifecycle(value).blockingReasons;
}

export function getResourceLifecycleMenuActions(value) {
  const lifecycle = normalizeLifecycle(value);
  if (!lifecycle.loaded) return [];

  const actions = [];
  if (lifecycle.canArchive) actions.push("archive");
  if (lifecycle.canRestore) actions.push("restore");
  actions.push("delete");
  return actions;
}

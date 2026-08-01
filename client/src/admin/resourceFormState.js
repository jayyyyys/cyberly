const CONTENT_FIELDS = ["locale", "title", "summary", "body"];
const METADATA_FIELDS = [
  "categoryCode",
  "sourceLabel",
  "sourceUrl",
  "sourceType",
  "sourceCountry",
  "sourceAuthorityLevel",
  "lastSourceCheckedAt",
  "replacementSourceNeeded",
  "ageAppropriateness",
  "sensitiveTopicFlag",
  "malaysiaGuidanceFlag",
];

export const RESOURCE_SECTION_TABS = [
  { id: "content", pathSuffix: "edit", labelKey: "admin.resourceLifecycle.tabs.content" },
  { id: "metadata", pathSuffix: "metadata", labelKey: "admin.resourceLifecycle.tabs.metadata" },
];

function text(value) {
  return String(value ?? "").trim();
}

function bool(value) {
  return value === true || value === 1 || value === "1";
}

function dateOnly(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? raw : parsed.toISOString().slice(0, 10);
}

function bodyText(value) {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .trim()
    .split(/\n{2,}/)
    .map(part => part.trim())
    .filter(Boolean)
    .join("\n\n");
}

function orderedSnapshot(value, fields) {
  return fields.reduce((snapshot, field) => {
    snapshot[field] = value[field];
    return snapshot;
  }, {});
}

export function normalizeContentFormValues(locale, data = {}) {
  return {
    locale: text(data.locale || locale || "en"),
    title: text(data.title),
    summary: text(data.summary),
    body: bodyText(data.body),
  };
}

export function createContentSnapshot(data = {}) {
  return orderedSnapshot(normalizeContentFormValues(data.locale, data), CONTENT_FIELDS);
}

export function normalizeMetadataFormValues(data = {}) {
  return {
    categoryCode: text(data.categoryCode || "Scams"),
    sourceLabel: text(data.sourceLabel),
    sourceUrl: text(data.sourceUrl),
    sourceType: text(data.sourceType),
    sourceCountry: text(data.sourceCountry),
    sourceAuthorityLevel: text(data.sourceAuthorityLevel),
    lastSourceCheckedAt: dateOnly(data.lastSourceCheckedAt),
    replacementSourceNeeded: bool(data.replacementSourceNeeded),
    ageAppropriateness: text(data.ageAppropriateness),
    sensitiveTopicFlag: bool(data.sensitiveTopicFlag),
    malaysiaGuidanceFlag: bool(data.malaysiaGuidanceFlag),
  };
}

export function createMetadataSnapshot(data = {}) {
  return orderedSnapshot(normalizeMetadataFormValues(data), METADATA_FIELDS);
}

export function areSnapshotsEqual(first, second) {
  return JSON.stringify(first) === JSON.stringify(second);
}

export function isFormDirty({ status = "ready", currentSnapshot, savedSnapshot } = {}) {
  return status === "ready" && !areSnapshotsEqual(currentSnapshot, savedSnapshot);
}

export function isPermanentDeleteAvailable(lifecycle = {}) {
  return Boolean(lifecycle?.canPermanentlyDelete);
}

export function canConfirmPermanentDelete({ lifecycle, slug, confirmationSlug } = {}) {
  if (!isPermanentDeleteAvailable(lifecycle)) return false;
  return String(confirmationSlug ?? "") === String(slug ?? "");
}

export { getResourceLifecycleMenuActions } from "./resourceLifecycleState";

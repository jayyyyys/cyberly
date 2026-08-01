import {
  areSnapshotsEqual,
  canConfirmPermanentDelete,
  createContentSnapshot,
  createMetadataSnapshot,
  isFormDirty,
  getResourceLifecycleMenuActions,
  RESOURCE_SECTION_TABS,
  isPermanentDeleteAvailable,
  normalizeContentFormValues,
  normalizeMetadataFormValues,
} from "./resourceFormState";
import {
  createPendingAction,
  shouldBlockRouteTransition,
  shouldGuardAction,
} from "../navigation/navigationGuardState";

describe("admin resource form state snapshots", () => {
  test("content response normalization makes saved form and baseline identical", () => {
    const serverTranslation = {
      locale: "en",
      title: "  Strong Passwords  ",
      summary: "  Keep accounts safer.  ",
      body: " First paragraph. \r\n\r\n\r\n Second paragraph. ",
      updatedAt: "2026-07-15T10:00:00.000Z",
      ragSync: { attempted: true, succeeded: false },
    };

    const normalized = normalizeContentFormValues("en", serverTranslation);

    expect(normalized).toEqual({
      locale: "en",
      title: "Strong Passwords",
      summary: "Keep accounts safer.",
      body: "First paragraph.\n\nSecond paragraph.",
    });
    expect(areSnapshotsEqual(createContentSnapshot(normalized), createContentSnapshot(serverTranslation))).toBe(true);
  });

  test("content dirty snapshot ignores updatedAt and RAG sync results", () => {
    const saved = createContentSnapshot({
      locale: "ms",
      title: "Kata Laluan",
      summary: "Ringkasan",
      body: "Isi utama",
      updatedAt: "2026-07-15T10:00:00.000Z",
    });
    const response = createContentSnapshot({
      locale: "ms",
      title: "Kata Laluan",
      summary: "Ringkasan",
      body: "Isi utama",
      updatedAt: "2026-07-15T11:00:00.000Z",
      ragSync: { attempted: true, succeeded: false },
    });

    expect(areSnapshotsEqual(saved, response)).toBe(true);
  });

  test("metadata normalization handles dates, nulls, empty strings, and booleans", () => {
    const form = normalizeMetadataFormValues({
      categoryCode: "Scams",
      sourceLabel: null,
      sourceUrl: "",
      sourceType: "government",
      sourceCountry: "MY",
      sourceAuthorityLevel: "official_agency",
      lastSourceCheckedAt: "2026-07-15T08:30:00.000Z",
      replacementSourceNeeded: 1,
      ageAppropriateness: "",
      sensitiveTopicFlag: 0,
      malaysiaGuidanceFlag: true,
      updatedAt: "2026-07-15T10:00:00.000Z",
    });

    expect(form).toEqual({
      categoryCode: "Scams",
      sourceLabel: "",
      sourceUrl: "",
      sourceType: "government",
      sourceCountry: "MY",
      sourceAuthorityLevel: "official_agency",
      lastSourceCheckedAt: "2026-07-15",
      replacementSourceNeeded: true,
      ageAppropriateness: "",
      sensitiveTopicFlag: false,
      malaysiaGuidanceFlag: true,
    });
    expect(areSnapshotsEqual(createMetadataSnapshot(form), createMetadataSnapshot({ ...form, updatedAt: "later" }))).toBe(true);
  });

  test("dirty state is false before editable form hydration is ready", () => {
    const saved = createMetadataSnapshot({ categoryCode: "Scams" });
    const edited = createMetadataSnapshot({ categoryCode: "Privacy" });

    expect(isFormDirty({ status: "loading", currentSnapshot: edited, savedSnapshot: saved })).toBe(false);
    expect(isFormDirty({ status: "hydrating", currentSnapshot: edited, savedSnapshot: saved })).toBe(false);
    expect(isFormDirty({ status: "error", currentSnapshot: edited, savedSnapshot: saved })).toBe(false);
    expect(isFormDirty({ status: "ready", currentSnapshot: edited, savedSnapshot: saved })).toBe(true);
  });

  test("changing and reverting metadata returns to clean", () => {
    const saved = createMetadataSnapshot({
      categoryCode: "Scams",
      sourceLabel: null,
      sourceUrl: " https://example.test/source ",
      lastSourceCheckedAt: "2026-07-15T08:30:00.000Z",
      replacementSourceNeeded: 0,
    });
    const reverted = createMetadataSnapshot({
      categoryCode: "Scams",
      sourceLabel: "",
      sourceUrl: "https://example.test/source",
      lastSourceCheckedAt: "2026-07-15",
      replacementSourceNeeded: false,
    });

    expect(isFormDirty({ status: "ready", currentSnapshot: reverted, savedSnapshot: saved })).toBe(false);
  });

  test("failed save can remain dirty while successful creation can clear its blocker snapshot", () => {
    const initial = createContentSnapshot({ locale: "en", title: "", summary: "", body: "" });
    const edited = createContentSnapshot({ locale: "en", title: "A", summary: "B", body: "C" });
    const saved = createContentSnapshot({ locale: "en", title: "A", summary: "B", body: "C" });

    expect(areSnapshotsEqual(edited, initial)).toBe(false);
    expect(areSnapshotsEqual(edited, saved)).toBe(true);
  });

  test("server-trimmed title and summary do not leave content dirty", () => {
    const form = createContentSnapshot({
      locale: "zh-CN",
      title: "  网络钓鱼  ",
      summary: "  识别可疑链接。 ",
      body: "第一段。\n\n第二段。",
    });
    const saved = createContentSnapshot({
      locale: "zh-CN",
      title: "网络钓鱼",
      summary: "识别可疑链接。",
      body: "第一段。\n\n第二段。",
    });

    expect(areSnapshotsEqual(form, saved)).toBe(true);
  });

  test("successful save removes guard conditions for back and global navigation", () => {
    const activeBlocker = { key: "resource-editor:7:en" };
    const clearedBlocker = null;

    expect(shouldBlockRouteTransition({
      blocker: activeBlocker,
      acceptedHash: "#/admin/resources/7/edit",
      requestedHash: "#/admin/resources",
    })).toBe(true);
    expect(shouldBlockRouteTransition({
      blocker: clearedBlocker,
      acceptedHash: "#/admin/resources/7/edit",
      requestedHash: "#/admin/resources",
    })).toBe(false);
    expect(shouldGuardAction({ blocker: clearedBlocker })).toBe(false);
  });

  test("successful creation clears resource-create blocker before opening editor", () => {
    const createBlocker = { key: "resource-create:new" };

    expect(shouldBlockRouteTransition({
      blocker: createBlocker,
      acceptedHash: "#/admin/resources/new",
      requestedHash: "#/admin/resources/31/edit",
    })).toBe(true);
    expect(shouldBlockRouteTransition({
      blocker: null,
      acceptedHash: "#/admin/resources/new",
      requestedHash: "#/admin/resources/31/edit",
    })).toBe(false);
  });

  test("failed save remains dirty and guarded", () => {
    const baseline = createMetadataSnapshot({ categoryCode: "Scams", sourceUrl: "https://example.test/a" });
    const edited = createMetadataSnapshot({ categoryCode: "Scams", sourceUrl: "https://example.test/b" });
    const blocker = { key: "resource-metadata:7" };

    expect(areSnapshotsEqual(edited, baseline)).toBe(false);
    expect(shouldGuardAction({ blocker })).toBe(true);
  });

  test("permanent delete requires lifecycle eligibility and an exact slug", () => {
    const lifecycle = { canPermanentlyDelete: true };
    expect(isPermanentDeleteAvailable(lifecycle)).toBe(true);
    expect(canConfirmPermanentDelete({ lifecycle, slug: "phishing", confirmationSlug: "phishing" })).toBe(true);
    expect(canConfirmPermanentDelete({ lifecycle, slug: "phishing", confirmationSlug: "" })).toBe(false);
    expect(canConfirmPermanentDelete({ lifecycle, slug: "phishing", confirmationSlug: " phishing " })).toBe(false);
    expect(canConfirmPermanentDelete({ lifecycle, slug: "phishing", confirmationSlug: "Phishing" })).toBe(false);
    expect(canConfirmPermanentDelete({ lifecycle: { canPermanentlyDelete: false }, slug: "phishing", confirmationSlug: "phishing" })).toBe(false);
  });

  test("resource section tabs use Content and Metadata only", () => {
    expect(RESOURCE_SECTION_TABS.map(tab => tab.id)).toEqual(["content", "metadata"]);
    expect(RESOURCE_SECTION_TABS.map(tab => tab.pathSuffix)).toEqual(["edit", "metadata"]);
  });

  test("resource lifecycle menu has one context-sensitive lifecycle entry set", () => {
    expect(getResourceLifecycleMenuActions({ canArchive: true, canRestore: false }, "draft")).toEqual(["archive", "delete"]);
    expect(getResourceLifecycleMenuActions({ canArchive: false, canRestore: true }, "archived")).toEqual(["restore", "delete"]);
    expect(getResourceLifecycleMenuActions({ canArchive: true, canRestore: false }, "draft").filter(action => action === "archive")).toHaveLength(1);
  });

  test("dirty forms guard lifecycle actions before archive or permanent delete executes", () => {
    const blocker = { key: "resource-metadata:7", source: "resource-metadata" };
    const archive = jest.fn();
    const permanentDelete = jest.fn();

    expect(shouldGuardAction({ blocker })).toBe(true);
    const archivePending = createPendingAction({ actionType: "resource-archive", execute: archive, guard: blocker });
    const deletePending = createPendingAction({ actionType: "resource-delete", execute: permanentDelete, guard: blocker });

    expect(archive).not.toHaveBeenCalled();
    expect(permanentDelete).not.toHaveBeenCalled();
    archivePending.execute();
    deletePending.execute();
    expect(archive).toHaveBeenCalledTimes(1);
    expect(permanentDelete).toHaveBeenCalledTimes(1);
  });
});

import {
  getLifecycleBlockingReasons,
  getResourceLifecycleMenuActions,
  normalizeLifecycle,
} from "./resourceLifecycleState";

describe("admin resource lifecycle state", () => {
  test("normalizes null lifecycle into a safe unloaded shape", () => {
    expect(normalizeLifecycle(null)).toEqual({
      loaded: false,
      canArchive: false,
      canRestore: false,
      canPermanentlyDelete: false,
      counts: {
        translations: 0,
        ragDocuments: 0,
        ragChunks: 0,
        chatSourceReferences: 0,
        contentRelationships: 0,
      },
      blockingReasons: [],
      reasons: [],
      archiveAvailable: false,
    });
  });

  test("normalizes undefined lifecycle into a safe unloaded shape", () => {
    expect(normalizeLifecycle(undefined)).toMatchObject({
      loaded: false,
      canArchive: false,
      canRestore: false,
      canPermanentlyDelete: false,
      blockingReasons: [],
    });
  });

  test("normalizes partial and legacy lifecycle shapes", () => {
    expect(normalizeLifecycle({
      canPermanentlyDelete: false,
      archiveAvailable: true,
      reasons: ["resource_not_draft"],
      counts: { ragDocuments: "2" },
    })).toMatchObject({
      loaded: true,
      canArchive: true,
      canRestore: false,
      canPermanentlyDelete: false,
      counts: {
        translations: 0,
        ragDocuments: 2,
        ragChunks: 0,
        chatSourceReferences: 0,
        contentRelationships: 0,
      },
      blockingReasons: [{ code: "resource_not_draft", count: 1 }],
      reasons: ["resource_not_draft"],
    });
  });

  test("partial lifecycle without blocking reasons stays render safe", () => {
    expect(normalizeLifecycle({ counts: { translations: 1 } })).toMatchObject({
      loaded: true,
      counts: {
        translations: 1,
        ragDocuments: 0,
        ragChunks: 0,
        chatSourceReferences: 0,
        contentRelationships: 0,
      },
      blockingReasons: [],
      reasons: [],
    });
  });

  test("blocking reasons and menu actions are safe before lifecycle loads", () => {
    const lifecycle = normalizeLifecycle(null);
    expect(getLifecycleBlockingReasons(lifecycle)).toEqual([]);
    expect(getResourceLifecycleMenuActions(lifecycle, "draft")).toEqual([]);
  });

  test("menu actions follow normalized lifecycle state after load", () => {
    expect(getResourceLifecycleMenuActions(normalizeLifecycle({ canArchive: true }), "draft")).toEqual(["archive", "delete"]);
    expect(getResourceLifecycleMenuActions(normalizeLifecycle({ canRestore: true }), "archived")).toEqual(["restore", "delete"]);
  });
});

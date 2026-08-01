import {
  createPendingAction,
  createPendingRouteTransition,
  normalizeHashRoute,
  resolveSessionRestoreHash,
  routeIdentityFromHash,
  routeIdentitiesMatch,
  shouldBlockRouteTransition,
  shouldGuardAction,
} from "./navigationGuardState";

describe("navigation guard route state", () => {
  test("normalizes route hashes consistently", () => {
    expect(normalizeHashRoute("admin/resources")).toBe("#/admin/resources");
    expect(normalizeHashRoute("#admin/resources")).toBe("#/admin/resources");
    expect(normalizeHashRoute("")).toBe("#/home");
  });

  test("preserves complete Admin route identity", () => {
    expect(routeIdentityFromHash("#/admin/resources/1/edit")).toEqual({
      hash: "#/admin/resources/1/edit",
      page: "admin",
      section: "resources",
      resourceId: 1,
      mode: "edit",
    });
    expect(routeIdentitiesMatch("#/admin", "#/admin/resources/1/edit")).toBe(false);
  });

  test("preserves Scenario Admin route identity across refresh and history", () => {
    expect(routeIdentityFromHash("#/admin/scenarios/12/edit")).toEqual({
      hash: "#/admin/scenarios/12/edit",
      page: "admin",
      section: "scenarios",
      resourceId: 12,
      mode: "edit",
    });
    expect(routeIdentitiesMatch("#/admin/scenarios", "#/admin/scenarios/12/edit")).toBe(false);
    expect(shouldBlockRouteTransition({
      blocker: { key: "scenario-create:new" },
      acceptedHash: "#/admin/scenarios/new",
      requestedHash: "#/admin/scenarios/12/edit",
    })).toBe(true);
  });

  test("session restore keeps full Scenario Admin hashes for onboarded admins", () => {
    expect(resolveSessionRestoreHash({
      currentHash: "#/admin/scenarios",
      restoredPage: "admin",
      onboardingCompleted: true,
    })).toBe("#/admin/scenarios");
    expect(resolveSessionRestoreHash({
      currentHash: "#/admin/scenarios/new",
      restoredPage: "admin",
      onboardingCompleted: true,
    })).toBe("#/admin/scenarios/new");
    expect(resolveSessionRestoreHash({
      currentHash: "#/admin/scenarios/12/edit",
      restoredPage: "admin",
      onboardingCompleted: true,
    })).toBe("#/admin/scenarios/12/edit");
  });

  test("session restore still sends incomplete profiles to profile", () => {
    expect(resolveSessionRestoreHash({
      currentHash: "#/admin/scenarios/12/edit",
      restoredPage: "admin",
      onboardingCompleted: false,
    })).toBe("#/profile");
  });

  test("admin landing is a different destination from editor route", () => {
    expect(shouldBlockRouteTransition({
      blocker: { key: "resource-editor:1:en" },
      acceptedHash: "#/admin/resources/1/edit",
      requestedHash: "#/admin",
    })).toBe(true);
  });

  test("dirty route request becomes pending and cancel keeps accepted route", () => {
    const acceptedHash = "#/admin/resources/1/edit";
    const requestedHash = "#/admin/resources";
    expect(shouldBlockRouteTransition({ blocker: { key: "resource-editor:1:en" }, acceptedHash, requestedHash })).toBe(true);
    const pending = createPendingRouteTransition({ acceptedHash, requestedHash, acceptedIndex: 4, requestedIndex: 3 });
    expect(pending).toMatchObject({ type: "hash", acceptedHash, hash: requestedHash, historyDelta: -1 });
  });

  test("forward traversal records positive history delta", () => {
    const pending = createPendingRouteTransition({
      acceptedHash: "#/admin/resources",
      requestedHash: "#/admin/resources/1/edit",
      acceptedIndex: 3,
      requestedIndex: 4,
    });
    expect(pending.historyDelta).toBe(1);
  });

  test("unmanaged history traversal keeps safe null delta fallback", () => {
    const pending = createPendingRouteTransition({
      acceptedHash: "#/admin/resources/1/edit",
      requestedHash: "#/admin/resources",
      acceptedIndex: undefined,
      requestedIndex: undefined,
    });
    expect(pending.historyDelta).toBeNull();
  });

  test("same exact route does not show warning", () => {
    expect(shouldBlockRouteTransition({
      blocker: { key: "resource-editor:1:en" },
      acceptedHash: "#/admin/resources/1/edit",
      requestedHash: "#/admin/resources/1/edit",
    })).toBe(false);
  });

  test("resource blocker keys are resource scoped", () => {
    const first = "resource-editor:1:en";
    const second = "resource-editor:2:en";
    expect(first).not.toEqual(second);
  });

  test("guarded action does not execute until confirmation", () => {
    const execute = jest.fn();
    const pending = createPendingAction({ actionType: "locale-switch", execute });
    expect(execute).not.toHaveBeenCalled();
    pending.execute();
    expect(execute).toHaveBeenCalledTimes(1);
  });

  test("unguarded route request is never blocked", () => {
    expect(shouldBlockRouteTransition({
      blocker: null,
      acceptedHash: "#/admin/resources/1/edit",
      requestedHash: "#/admin/resources",
    })).toBe(false);
  });

  test("interface locale change executes immediately when no blocker exists", () => {
    const execute = jest.fn();
    expect(shouldGuardAction({ blocker: null })).toBe(false);
    execute();
    expect(execute).toHaveBeenCalledTimes(1);
  });

  test("active scenario interface locale change can bypass leave guard", () => {
    const execute = jest.fn();
    const blocker = { source: "scenario", key: "scenario:attempt-1" };
    expect(shouldGuardAction({ blocker, bypassGuard: true })).toBe(false);
    execute();
    expect(execute).toHaveBeenCalledTimes(1);
  });

  test("dirty editor turns interface locale change into a pending guarded action", () => {
    const execute = jest.fn();
    const blocker = { key: "resource-editor:7:en" };
    expect(shouldGuardAction({ blocker })).toBe(true);
    const pending = createPendingAction({
      actionType: "interface-locale-change",
      execute,
      guard: blocker,
      meta: { nextLocale: "zh-CN", currentInterfaceLocale: "en", editorTranslationLocale: "en" },
    });
    expect(pending).toMatchObject({
      type: "action",
      actionType: "interface-locale-change",
      guard: blocker,
      meta: { nextLocale: "zh-CN", currentInterfaceLocale: "en", editorTranslationLocale: "en" },
    });
  });

  test("pending interface locale action does not execute before confirmation", () => {
    const execute = jest.fn();
    const pending = createPendingAction({
      actionType: "interface-locale-change",
      execute,
      guard: { key: "resource-editor:7:en" },
    });
    expect(execute).not.toHaveBeenCalled();
    expect(pending.execute).toBe(execute);
  });

  test("continue editing cancels locale change and preserves previous interface locale", () => {
    const execute = jest.fn();
    const previousInterfaceLocale = "en";
    const pending = createPendingAction({
      actionType: "interface-locale-change",
      execute,
      guard: { key: "resource-editor:7:en" },
      meta: { currentInterfaceLocale: previousInterfaceLocale, nextLocale: "zh-CN" },
    });
    const afterCancel = {
      pending: null,
      interfaceLocale: pending.meta.currentInterfaceLocale,
    };
    expect(execute).not.toHaveBeenCalled();
    expect(afterCancel.interfaceLocale).toBe(previousInterfaceLocale);
    expect(afterCancel.pending).toBeNull();
  });

  test("continue editing preserves the previous interface locale", () => {
    const pending = createPendingAction({
      actionType: "interface-locale-change",
      execute: jest.fn(),
      guard: { key: "resource-editor:7:en" },
      meta: { currentInterfaceLocale: "ms", nextLocale: "zh-CN" },
    });
    expect(pending.meta.currentInterfaceLocale).toBe("ms");
  });

  test("continue editing preserves pending editor form state at state-machine level", () => {
    const dirtyForm = { title: "Misinformation & Fake News (Test)" };
    const pending = createPendingAction({
      actionType: "interface-locale-change",
      execute: jest.fn(),
      guard: { key: "resource-editor:7:en" },
      meta: { editorTranslationLocale: "en" },
    });
    const afterCancel = {
      pending: null,
      editorTranslationLocale: pending.meta.editorTranslationLocale,
      form: dirtyForm,
    };
    expect(afterCancel.form.title).toContain("(Test)");
    expect(afterCancel.editorTranslationLocale).toBe("en");
  });

  test("discard executes interface locale action once", () => {
    const execute = jest.fn();
    const pending = createPendingAction({
      actionType: "interface-locale-change",
      execute,
      guard: { key: "resource-editor:7:en" },
    });
    pending.execute();
    expect(execute).toHaveBeenCalledTimes(1);
  });

  test("discard does not execute interface locale action twice during rerender", () => {
    const execute = jest.fn();
    const pending = createPendingAction({
      actionType: "interface-locale-change",
      execute,
      guard: { key: "resource-editor:7:en" },
    });
    const consumedPending = pending;
    const clearedPending = null;
    consumedPending.execute();
    clearedPending?.execute?.();
    expect(execute).toHaveBeenCalledTimes(1);
  });

  test("interface locale action remains separate from editor translation locale", () => {
    const pending = createPendingAction({
      actionType: "interface-locale-change",
      execute: jest.fn(),
      guard: { key: "resource-editor:7:en" },
      meta: { nextLocale: "zh-CN", editorTranslationLocale: "en" },
    });
    expect(pending.meta.nextLocale).toBe("zh-CN");
    expect(pending.meta.editorTranslationLocale).toBe("en");
  });

  test("successful Resource save allows interface locale change without dialog", () => {
    const execute = jest.fn();
    expect(shouldGuardAction({ blocker: null })).toBe(false);
    execute();
    expect(execute).toHaveBeenCalledTimes(1);
  });

  test("locale selector displayed value remains old locale after cancellation", () => {
    const pending = createPendingAction({
      actionType: "interface-locale-change",
      execute: jest.fn(),
      guard: { key: "resource-editor:7:en" },
      meta: { currentInterfaceLocale: "en", nextLocale: "zh-CN" },
    });
    const displayedLocaleAfterCancel = pending.meta.currentInterfaceLocale;
    expect(displayedLocaleAfterCancel).toBe("en");
  });

  test("stale Resource blocker cannot intercept a later unrelated locale change", () => {
    const execute = jest.fn();
    const staleBlocker = null;
    expect(shouldGuardAction({ blocker: staleBlocker })).toBe(false);
    execute();
    expect(execute).toHaveBeenCalledTimes(1);
  });

  test("dirty creation page blocks internal navigation with a creation-scoped key", () => {
    const blocker = { key: "resource-create:new", source: "resource-create" };
    expect(shouldBlockRouteTransition({
      blocker,
      acceptedHash: "#/admin/resources/new",
      requestedHash: "#/admin/resources",
    })).toBe(true);
  });

  test("creation and editor blocker keys remain independent", () => {
    expect("resource-create:new").not.toBe("resource-editor:7:en");
  });

  test("global UI locale switching is guarded on dirty creation page", () => {
    const blocker = { key: "resource-create:new", source: "resource-create" };
    const execute = jest.fn();
    expect(shouldGuardAction({ blocker })).toBe(true);
    const pending = createPendingAction({
      actionType: "interface-locale-change",
      execute,
      guard: blocker,
      meta: { currentInterfaceLocale: "en", nextLocale: "ms" },
    });
    expect(pending.actionType).toBe("interface-locale-change");
    expect(execute).not.toHaveBeenCalled();
  });

  test("successful creation can clear blocker before replacing the editor route", () => {
    const blockerBeforeSave = { key: "resource-create:new" };
    const blockerAfterSave = null;
    expect(shouldGuardAction({ blocker: blockerBeforeSave })).toBe(true);
    expect(shouldGuardAction({ blocker: blockerAfterSave })).toBe(false);
    expect(shouldBlockRouteTransition({
      blocker: blockerAfterSave,
      acceptedHash: "#/admin/resources/new",
      requestedHash: "#/admin/resources/25/edit",
    })).toBe(false);
  });
});

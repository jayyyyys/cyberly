import { canConfirmScenarioDelete, normalizeScenarioLifecycle } from "./scenarioLifecycleState";

describe("normalizeScenarioLifecycle", () => {
  test("normalizes null lifecycle without crashing", () => {
    expect(normalizeScenarioLifecycle(null)).toEqual(expect.objectContaining({
      loaded: false,
      canArchive: false,
      canRestore: false,
      canPermanentlyDelete: false,
      blockingReasons: [],
    }));
    expect(normalizeScenarioLifecycle(null).counts).toEqual({});
  });

  test("normalizes partial and legacy lifecycle data", () => {
    const lifecycle = normalizeScenarioLifecycle({
      scenarioId: 3,
      slug: "draft-scenario",
      canPermanentlyDelete: true,
      counts: { steps: "3", choices: "9" },
      reasons: ["scenario_previously_published"],
    });

    expect(lifecycle.loaded).toBe(true);
    expect(lifecycle.counts.steps).toBe(3);
    expect(lifecycle.counts.choices).toBe(9);
    expect(lifecycle.blockingReasons).toEqual([{ code: "scenario_previously_published", count: 1 }]);
  });

  test("exact slug confirmation is required", () => {
    const lifecycle = normalizeScenarioLifecycle({ canPermanentlyDelete: true, slug: "scenario-local-test" });
    expect(canConfirmScenarioDelete({ lifecycle, slug: "scenario-local-test", confirmationSlug: "scenario-local-test" })).toBe(true);
    expect(canConfirmScenarioDelete({ lifecycle, slug: "scenario-local-test", confirmationSlug: "scenario-local-test " })).toBe(false);
  });
});

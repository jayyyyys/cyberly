import {
  archiveAdminResource,
  archiveAdminScenario,
  createAdminScenario,
  getAdminScenario,
  getAdminAiProviders,
  getAdminAgenticTrace,
  listAdminAgenticTraces,
  getAdminScenarioLifecycle,
  getAdminStatus,
  getAdminResourceLifecycle,
  listAdminScenarios,
  permanentlyDeleteAdminScenario,
  permanentlyDeleteAdminResource,
  publishAdminResource,
  publishAdminScenario,
  restoreAdminResource,
  restoreAdminScenario,
  testAdminAiProvider,
  unpublishAdminResource,
  unpublishAdminScenario,
  updateAdminScenarioMetadata,
  updateAdminScenarioSteps,
} from "./adminApi";

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
  };
}

describe("admin API lifecycle adapter", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("lifecycle failure includes safe HTTP status diagnostic", async () => {
    global.fetch.mockResolvedValue(jsonResponse(404, { code: "ADMIN_RESOURCE_NOT_FOUND" }));

    const result = await getAdminResourceLifecycle(7);

    expect(global.fetch).toHaveBeenCalledWith("http://localhost:5000/api/admin/resources/7/lifecycle", {
      method: "GET",
      credentials: "include",
    });
    expect(result.ok).toBe(false);
    expect(result.status).toBe(404);
    expect(result.error).toContain("(404)");
  });

  test("admin status adapter uses the protected status endpoint", async () => {
    global.fetch.mockResolvedValue(jsonResponse(200, {
      ok: true,
      role: "admin",
    }));

    const result = await getAdminStatus();

    expect(result.ok).toBe(true);
    expect(result.status.role).toBe("admin");
    expect(global.fetch).toHaveBeenCalledWith("http://localhost:5000/api/admin/status", {
      method: "GET",
      credentials: "include",
    });
  });

  test("resource publish, unpublish, archive, restore, and delete use explicit endpoints", async () => {
    global.fetch
      .mockResolvedValueOnce(jsonResponse(200, { resource: { id: 7 } }))
      .mockResolvedValueOnce(jsonResponse(200, { resource: { id: 7 } }))
      .mockResolvedValueOnce(jsonResponse(200, { resource: { id: 7 }, lifecycle: { canRestore: true } }))
      .mockResolvedValueOnce(jsonResponse(200, { resource: { id: 7 }, lifecycle: { canArchive: true } }))
      .mockResolvedValueOnce(jsonResponse(200, { deletedResourceId: 7, deletedSlug: "phishing" }));

    await publishAdminResource(7);
    await unpublishAdminResource(7);
    await archiveAdminResource(7);
    await restoreAdminResource(7);
    await permanentlyDeleteAdminResource(7, "phishing");

    expect(global.fetch.mock.calls.map(call => [call[0], call[1].method])).toEqual([
      ["http://localhost:5000/api/admin/resources/7/publish", "POST"],
      ["http://localhost:5000/api/admin/resources/7/unpublish", "POST"],
      ["http://localhost:5000/api/admin/resources/7/archive", "POST"],
      ["http://localhost:5000/api/admin/resources/7/restore", "POST"],
      ["http://localhost:5000/api/admin/resources/7", "DELETE"],
    ]);
  });

  test("scenario adapter uses the canonical admin scenario endpoints", async () => {
    global.fetch.mockResolvedValue(jsonResponse(200, { scenario: { id: 3 }, steps: [] }));

    await listAdminScenarios({ search: "phishing" });
    await createAdminScenario({ slug: "safe-draft" });
    await getAdminScenario(3);
    await updateAdminScenarioMetadata(3, { title: "Updated" });
    await updateAdminScenarioSteps(3, { steps: [] });
    await publishAdminScenario(3);
    await unpublishAdminScenario(3);
    await archiveAdminScenario(3);
    await restoreAdminScenario(3);
    await getAdminScenarioLifecycle(3);
    await permanentlyDeleteAdminScenario(3, "safe-draft");

    expect(global.fetch.mock.calls.map(call => [String(call[0]), call[1].method])).toEqual([
      ["http://localhost:5000/api/admin/scenarios?search=phishing", "GET"],
      ["http://localhost:5000/api/admin/scenarios", "POST"],
      ["http://localhost:5000/api/admin/scenarios/3", "GET"],
      ["http://localhost:5000/api/admin/scenarios/3/metadata", "PATCH"],
      ["http://localhost:5000/api/admin/scenarios/3/steps", "PUT"],
      ["http://localhost:5000/api/admin/scenarios/3/publish", "POST"],
      ["http://localhost:5000/api/admin/scenarios/3/unpublish", "POST"],
      ["http://localhost:5000/api/admin/scenarios/3/archive", "POST"],
      ["http://localhost:5000/api/admin/scenarios/3/restore", "POST"],
      ["http://localhost:5000/api/admin/scenarios/3/lifecycle", "GET"],
      ["http://localhost:5000/api/admin/scenarios/3", "DELETE"],
    ]);
  });

  test("AI provider diagnostics adapters use safe admin endpoints", async () => {
    global.fetch
      .mockResolvedValueOnce(jsonResponse(200, {
        providers: [{ id: "openai", configured: true }],
        defaultProvider: "openai",
        purposeAssignments: { cyberguard_chat: "openai" },
        controlledAgenticRuntime: { productionRouter: "openai", allowedTools: [] },
        adaptiveLearningRuntime: { status: "enabled", dataSources: ["learner_profile"] },
      }))
      .mockResolvedValueOnce(jsonResponse(200, {
        provider: "openai",
        status: "success",
        latencyMs: 12,
        textPreview: "OK",
      }));

    const list = await getAdminAiProviders();
    const test = await testAdminAiProvider("openai");

    expect(list.ok).toBe(true);
    expect(list.providers).toHaveLength(1);
    expect(list.controlledAgenticRuntime.productionRouter).toBe("openai");
    expect(list.adaptiveLearningRuntime.status).toBe("enabled");
    expect(test.ok).toBe(true);
    expect(global.fetch.mock.calls.map(call => [String(call[0]), call[1].method])).toEqual([
      ["http://localhost:5000/api/admin/ai/providers", "GET"],
      ["http://localhost:5000/api/admin/ai/providers/openai/test", "POST"],
    ]);
    expect(JSON.stringify(list)).not.toContain("API_KEY");
    expect(JSON.stringify(test)).not.toContain("API_KEY");
  });

  test("agentic trace adapters use safe admin endpoints", async () => {
    global.fetch
      .mockResolvedValueOnce(jsonResponse(200, {
        items: [{ traceId: "agt_123", safeStatus: "completed" }],
        pagination: { total: 1 },
      }))
      .mockResolvedValueOnce(jsonResponse(200, {
        trace: { traceId: "agt_123", safeStatus: "completed", timeline: [] },
      }));

    const list = await listAdminAgenticTraces({ status: "completed", limit: 5 });
    const detail = await getAdminAgenticTrace("agt_123");

    expect(list.ok).toBe(true);
    expect(list.items).toHaveLength(1);
    expect(detail.ok).toBe(true);
    expect(global.fetch.mock.calls.map(call => [String(call[0]), call[1].method])).toEqual([
      ["http://localhost:5000/api/admin/ai/traces?status=completed&limit=5", "GET"],
      ["http://localhost:5000/api/admin/ai/traces/agt_123", "GET"],
    ]);
    expect(JSON.stringify(list)).not.toContain("confirmationToken");
    expect(JSON.stringify(detail)).not.toContain("systemPrompt");
  });
});

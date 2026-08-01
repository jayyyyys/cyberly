import { apiFetch, parseApiJson } from "../api/apiClient";

function failure(data = {}, fallback = "Request failed.", status = null) {
  const message = data.message || data.code || fallback;
  return {
    ok: false,
    error: status ? `${message} (${status})` : message,
    code: data.code || null,
    errors: data.errors || {},
    counts: data.counts || data.lifecycle?.counts || null,
    blockingReasons: Array.isArray(data.blockingReasons) ? data.blockingReasons : (Array.isArray(data.lifecycle?.blockingReasons) ? data.lifecycle.blockingReasons : []),
    lifecycle: data.lifecycle || null,
    status,
  };
}

function networkFailure() {
  return {
    ok: false,
    error: "Network error. Please try again.",
    code: null,
    errors: {},
  };
}

async function parseJson(response) {
  return parseApiJson(response);
}

export async function getAdminStatus() {
  try {
    const response = await apiFetch("/api/admin/status", {
      method: "GET",
      credentials: "include",
    });
    const data = await parseJson(response);
    if (!response.ok) return failure(data, "Unable to verify admin access.", response.status);
    return { ok: true, status: data };
  } catch {
    return networkFailure();
  }
}

export async function listAdminResources(filters = {}) {
  try {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && String(value).trim() !== "") {
        params.set(key, value);
      }
    }
    const response = await apiFetch(`/api/admin/resources${params.toString() ? `?${params}` : ""}`, {
      method: "GET",
      credentials: "include",
    });
    const data = await parseJson(response);
    if (!response.ok) return failure(data, "Unable to load resources.", response.status);
    return {
      ok: true,
      items: Array.isArray(data.items) ? data.items : [],
      pagination: data.pagination || {},
      summary: data.summary || {},
    };
  } catch {
    return networkFailure();
  }
}

export async function getAdminResource(resourceId) {
  try {
    const response = await apiFetch(`/api/admin/resources/${resourceId}`, {
      method: "GET",
      credentials: "include",
    });
    const data = await parseJson(response);
    if (!response.ok) return failure(data, "Unable to load resource.", response.status);
    return { ok: true, resource: data.resource };
  } catch {
    return networkFailure();
  }
}

export async function getAdminResourceLifecycle(resourceId) {
  try {
    const response = await apiFetch(`/api/admin/resources/${resourceId}/lifecycle`, {
      method: "GET",
      credentials: "include",
    });
    const data = await parseJson(response);
    if (!response.ok) return failure(data, "Unable to load resource lifecycle.", response.status);
    return { ok: true, lifecycle: data.lifecycle };
  } catch {
    return networkFailure();
  }
}

export async function archiveAdminResource(resourceId) {
  try {
    const response = await apiFetch(`/api/admin/resources/${resourceId}/archive`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await parseJson(response);
    if (!response.ok) return failure(data, "Unable to archive resource.", response.status);
    return {
      ok: true,
      resource: data.resource,
      lifecycle: data.lifecycle,
    };
  } catch {
    return networkFailure();
  }
}

export async function restoreAdminResource(resourceId) {
  try {
    const response = await apiFetch(`/api/admin/resources/${resourceId}/restore`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await parseJson(response);
    if (!response.ok) return failure(data, "Unable to restore resource.", response.status);
    return {
      ok: true,
      resource: data.resource,
      lifecycle: data.lifecycle,
    };
  } catch {
    return networkFailure();
  }
}

async function postResourceLifecycle(resourceId, action, fallback) {
  try {
    const response = await apiFetch(`/api/admin/resources/${resourceId}/${action}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await parseJson(response);
    if (!response.ok) return failure(data, fallback, response.status);
    return {
      ok: true,
      resource: data.resource,
      lifecycle: data.lifecycle || null,
      blockingReasons: Array.isArray(data.blockingReasons) ? data.blockingReasons : [],
      optionalMissingLocales: Array.isArray(data.optionalMissingLocales) ? data.optionalMissingLocales : [],
    };
  } catch {
    return networkFailure();
  }
}

export function publishAdminResource(resourceId) {
  return postResourceLifecycle(resourceId, "publish", "Unable to publish resource.");
}

export function unpublishAdminResource(resourceId) {
  return postResourceLifecycle(resourceId, "unpublish", "Unable to return resource to draft.");
}

export async function getAdminAiProviders() {
  try {
    const response = await apiFetch(`/api/admin/ai/providers`, {
      method: "GET",
      credentials: "include",
    });
    const data = await parseJson(response);
    if (!response.ok) return failure(data, "Unable to load AI providers.", response.status);
    return {
      ok: true,
      providers: Array.isArray(data.providers) ? data.providers : [],
      defaultProvider: data.defaultProvider || null,
      purposeAssignments: data.purposeAssignments || {},
      controlledAgenticRuntime: data.controlledAgenticRuntime || null,
      adaptiveLearningRuntime: data.adaptiveLearningRuntime || null,
      learnerControlledActions: data.learnerControlledActions || null,
    };
  } catch {
    return networkFailure();
  }
}

export async function testAdminAiProvider(providerId) {
  try {
    const response = await apiFetch(`/api/admin/ai/providers/${encodeURIComponent(providerId)}/test`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await parseJson(response);
    if (!response.ok) return failure(data, "Unable to test AI provider.", response.status);
    return { ok: true, result: data };
  } catch {
    return networkFailure();
  }
}

export async function listAdminAgenticTraces(filters = {}) {
  try {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && String(value).trim() !== "") {
        params.set(key, value);
      }
    }
    const response = await apiFetch(`/api/admin/ai/traces${params.toString() ? `?${params}` : ""}`, {
      method: "GET",
      credentials: "include",
    });
    const data = await parseJson(response);
    if (!response.ok) return failure(data, "Unable to load agentic traces.", response.status);
    return {
      ok: true,
      items: Array.isArray(data.items) ? data.items : [],
      pagination: data.pagination || {},
    };
  } catch {
    return networkFailure();
  }
}

export async function getAdminAgenticTrace(traceId) {
  try {
    const response = await apiFetch(`/api/admin/ai/traces/${encodeURIComponent(traceId)}`, {
      method: "GET",
      credentials: "include",
    });
    const data = await parseJson(response);
    if (!response.ok) return failure(data, "Unable to load agentic trace.", response.status);
    return { ok: true, trace: data.trace || null };
  } catch {
    return networkFailure();
  }
}

export async function permanentlyDeleteAdminResource(resourceId, confirmationSlug) {
  try {
    const response = await apiFetch(`/api/admin/resources/${resourceId}`, {
      method: "DELETE",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmationSlug }),
    });
    const data = await parseJson(response);
    if (!response.ok) {
      return {
        ...failure(data, "Unable to permanently delete resource.", response.status),
        reasons: Array.isArray(data.reasons) ? data.reasons : [],
        blockingReasons: Array.isArray(data.blockingReasons) ? data.blockingReasons : [],
        counts: data.counts || {},
        canArchive: Boolean(data.canArchive),
        canRestore: Boolean(data.canRestore),
        archiveAvailable: Boolean(data.archiveAvailable),
      };
    }
    return {
      ok: true,
      deletedResourceId: data.deletedResourceId,
      deletedSlug: data.deletedSlug,
    };
  } catch {
    return networkFailure();
  }
}

export async function updateAdminResourceGovernance(resourceId, payload) {
  try {
    const response = await apiFetch(`/api/admin/resources/${resourceId}/governance`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await parseJson(response);
    if (!response.ok) return failure(data, "Unable to save resource governance.", response.status);
    return {
      ok: true,
      resource: data.resource,
      automaticChanges: Array.isArray(data.automaticChanges) ? data.automaticChanges : [],
    };
  } catch {
    return networkFailure();
  }
}

export async function getAdminResourceOptions() {
  try {
    const response = await apiFetch(`/api/admin/resources/options`, {
      method: "GET",
      credentials: "include",
    });
    const data = await parseJson(response);
    if (!response.ok) return failure(data, "Unable to load resource options.", response.status);
    return {
      ok: true,
      categories: Array.isArray(data.categories) ? data.categories : [],
      sourceTypes: Array.isArray(data.sourceTypes) ? data.sourceTypes : [],
      sourceCountries: Array.isArray(data.sourceCountries) ? data.sourceCountries : [],
      sourceAuthorityLevels: Array.isArray(data.sourceAuthorityLevels) ? data.sourceAuthorityLevels : [],
      ageSuitabilityOptions: Array.isArray(data.ageSuitabilityOptions) ? data.ageSuitabilityOptions : [],
    };
  } catch {
    return networkFailure();
  }
}

export async function createAdminResource(payload) {
  try {
    const response = await apiFetch(`/api/admin/resources`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await parseJson(response);
    if (!response.ok) return failure(data, "Unable to create resource.", response.status);
    return {
      ok: true,
      resource: data.resource,
      translations: data.translations || {},
    };
  } catch {
    return networkFailure();
  }
}

export async function getAdminResourceMetadata(resourceId) {
  try {
    const response = await apiFetch(`/api/admin/resources/${resourceId}/metadata`, {
      method: "GET",
      credentials: "include",
    });
    const data = await parseJson(response);
    if (!response.ok) return failure(data, "Unable to load resource metadata.", response.status);
    return { ok: true, resource: data.resource };
  } catch {
    return networkFailure();
  }
}

export async function updateAdminResourceMetadata(resourceId, payload) {
  try {
    const response = await apiFetch(`/api/admin/resources/${resourceId}/metadata`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await parseJson(response);
    if (!response.ok) return failure(data, "Unable to save resource metadata.", response.status);
    return { ok: true, resource: data.resource };
  } catch {
    return networkFailure();
  }
}

export async function getAdminResourceContent(resourceId) {
  try {
    const response = await apiFetch(`/api/admin/resources/${resourceId}/content`, {
      method: "GET",
      credentials: "include",
    });
    const data = await parseJson(response);
    if (!response.ok) return failure(data, "Unable to load resource content.", response.status);
    return {
      ok: true,
      resource: data.resource,
      translations: data.translations || {},
    };
  } catch {
    return networkFailure();
  }
}

export async function updateAdminResourceContent(resourceId, payload) {
  try {
    const response = await apiFetch(`/api/admin/resources/${resourceId}/content`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await parseJson(response);
    if (!response.ok) return failure(data, "Unable to save resource content.", response.status);
    return {
      ok: true,
      resource: data.resource,
      translation: data.translation,
      ragSync: data.ragSync || {},
    };
  } catch {
    return networkFailure();
  }
}

export async function listAdminScenarios(filters = {}) {
  try {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && String(value).trim() !== "") {
        params.set(key, value);
      }
    }
    const response = await apiFetch(`/api/admin/scenarios${params.toString() ? `?${params}` : ""}`, {
      method: "GET",
      credentials: "include",
    });
    const data = await parseJson(response);
    if (!response.ok) return failure(data, "Unable to load scenarios.", response.status);
    return {
      ok: true,
      items: Array.isArray(data.items) ? data.items : [],
      pagination: data.pagination || {},
      summary: data.summary || {},
    };
  } catch {
    return networkFailure();
  }
}

export async function getAdminScenario(scenarioId) {
  try {
    const response = await apiFetch(`/api/admin/scenarios/${scenarioId}`, {
      method: "GET",
      credentials: "include",
    });
    const data = await parseJson(response);
    if (!response.ok) return failure(data, "Unable to load scenario.", response.status);
    return { ok: true, scenario: data.scenario, steps: Array.isArray(data.steps) ? data.steps : [] };
  } catch {
    return networkFailure();
  }
}

export async function getAdminScenarioLifecycle(scenarioId) {
  try {
    const response = await apiFetch(`/api/admin/scenarios/${scenarioId}/lifecycle`, {
      method: "GET",
      credentials: "include",
    });
    const data = await parseJson(response);
    if (!response.ok) return failure(data, "Unable to load Scenario lifecycle information.", response.status);
    return { ok: true, lifecycle: data };
  } catch {
    return networkFailure();
  }
}

export async function getAdminScenarioOptions() {
  try {
    const response = await apiFetch(`/api/admin/scenarios/options`, {
      method: "GET",
      credentials: "include",
    });
    const data = await parseJson(response);
    if (!response.ok) return failure(data, "Unable to load scenario options.", response.status);
    return {
      ok: true,
      topicCodes: Array.isArray(data.topicCodes) ? data.topicCodes : [],
      difficulties: Array.isArray(data.difficulties) ? data.difficulties : [],
      statuses: Array.isArray(data.statuses) ? data.statuses : [],
    };
  } catch {
    return networkFailure();
  }
}

export async function createAdminScenario(payload) {
  try {
    const response = await apiFetch(`/api/admin/scenarios`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await parseJson(response);
    if (!response.ok) return failure(data, "Unable to create scenario.", response.status);
    return { ok: true, scenario: data.scenario, steps: Array.isArray(data.steps) ? data.steps : [] };
  } catch {
    return networkFailure();
  }
}

export async function updateAdminScenarioMetadata(scenarioId, payload) {
  try {
    const response = await apiFetch(`/api/admin/scenarios/${scenarioId}/metadata`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await parseJson(response);
    if (!response.ok) return failure(data, "Unable to save scenario metadata.", response.status);
    return { ok: true, scenario: data.scenario, steps: Array.isArray(data.steps) ? data.steps : [] };
  } catch {
    return networkFailure();
  }
}

export async function updateAdminScenarioSteps(scenarioId, payload) {
  try {
    const response = await apiFetch(`/api/admin/scenarios/${scenarioId}/steps`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await parseJson(response);
    if (!response.ok) return failure(data, "Unable to save scenario steps.", response.status);
    return { ok: true, scenario: data.scenario, steps: Array.isArray(data.steps) ? data.steps : [] };
  } catch {
    return networkFailure();
  }
}

export async function updateAdminScenarioTranslation(scenarioId, locale, payload) {
  try {
    const response = await apiFetch(`/api/admin/scenarios/${scenarioId}/translations/${encodeURIComponent(locale)}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await parseJson(response);
    if (!response.ok) return failure(data, "Unable to save scenario translation.", response.status);
    return { ok: true, scenario: data.scenario, steps: Array.isArray(data.steps) ? data.steps : [] };
  } catch {
    return networkFailure();
  }
}

async function postScenarioLifecycle(scenarioId, action, fallback) {
  try {
    const response = await apiFetch(`/api/admin/scenarios/${scenarioId}/${action}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await parseJson(response);
    if (!response.ok) return failure(data, fallback, response.status);
    return { ok: true, scenario: data.scenario, steps: Array.isArray(data.steps) ? data.steps : [] };
  } catch {
    return networkFailure();
  }
}

export function publishAdminScenario(scenarioId) {
  return postScenarioLifecycle(scenarioId, "publish", "Unable to publish scenario.");
}

export function unpublishAdminScenario(scenarioId) {
  return postScenarioLifecycle(scenarioId, "unpublish", "Unable to return scenario to draft.");
}

export function archiveAdminScenario(scenarioId) {
  return postScenarioLifecycle(scenarioId, "archive", "Unable to archive scenario.");
}

export function restoreAdminScenario(scenarioId) {
  return postScenarioLifecycle(scenarioId, "restore", "Unable to restore scenario.");
}

export async function permanentlyDeleteAdminScenario(scenarioId, confirmationSlug) {
  try {
    const response = await apiFetch(`/api/admin/scenarios/${scenarioId}`, {
      method: "DELETE",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmationSlug }),
    });
    const data = await parseJson(response);
    if (!response.ok) return failure(data, "Unable to permanently delete scenario.", response.status);
    return {
      ok: true,
      deletedScenario: data.deletedScenario || null,
    };
  } catch {
    return networkFailure();
  }
}

import { apiRequest } from "./apiClient";
import { buildQueryString } from "./apiQuery";

export function listScenarios(query = {}) {
  return apiRequest(`/api/scenarios${buildQueryString(query)}`, {
    method: "GET",
  });
}

export function getRecommendedScenarios(query = {}) {
  return apiRequest(`/api/scenarios/recommended${buildQueryString(query)}`, {
    method: "GET",
  });
}

export function getScenarioDashboard(query = {}) {
  return apiRequest(`/api/scenarios/dashboard${buildQueryString(query)}`, {
    method: "GET",
  });
}

export function getScenarioBySlug(slug, query = {}) {
  return apiRequest(`/api/scenarios/${encodeURIComponent(slug)}${buildQueryString(query)}`, {
    method: "GET",
  });
}

export function startScenarioAttempt(slug, query = {}) {
  return apiRequest(`/api/scenarios/${encodeURIComponent(slug)}/attempts${buildQueryString(query)}`, {
    method: "POST",
  });
}

export function getScenarioAttempt(attemptId, query = {}) {
  return apiRequest(`/api/scenario-attempts/${encodeURIComponent(attemptId)}${buildQueryString(query)}`, {
    method: "GET",
  });
}

export function saveScenarioDecision(attemptId, payload, query = {}) {
  return apiRequest(`/api/scenario-attempts/${encodeURIComponent(attemptId)}/decisions${buildQueryString(query)}`, {
    method: "PUT",
    body: payload,
  });
}

export function completeScenarioAttempt(attemptId, query = {}) {
  return apiRequest(`/api/scenario-attempts/${encodeURIComponent(attemptId)}/complete${buildQueryString(query)}`, {
    method: "POST",
  });
}

export function getScenarioAttemptResult(attemptId, query = {}) {
  return apiRequest(`/api/scenario-attempts/${encodeURIComponent(attemptId)}/result${buildQueryString(query)}`, {
    method: "GET",
  });
}


import { apiRequest } from "./apiClient";
import { buildQueryString } from "./apiQuery";

export function getInitialAssessment(query = {}) {
  return apiRequest(`/api/assessments/initial${buildQueryString(query)}`, {
    method: "GET",
  });
}

export function createInitialAssessmentAttempt(query = {}) {
  return apiRequest(`/api/assessments/initial/attempts${buildQueryString(query)}`, {
    method: "POST",
  });
}

export function getInitialAssessmentResult(query = {}) {
  return apiRequest(`/api/assessments/initial/result${buildQueryString(query)}`, {
    method: "GET",
  });
}

export function getInitialAssessmentStatus(query = {}) {
  return apiRequest(`/api/assessments/initial/status${buildQueryString(query)}`, {
    method: "GET",
  });
}

export function getAssessmentAttempt(attemptId, query = {}) {
  return apiRequest(`/api/assessment-attempts/${encodeURIComponent(attemptId)}${buildQueryString(query)}`, {
    method: "GET",
  });
}

export function saveAssessmentAnswer(attemptId, payload) {
  return apiRequest(`/api/assessment-attempts/${encodeURIComponent(attemptId)}/answers`, {
    method: "PUT",
    body: payload,
  });
}

export function submitAssessmentAttempt(attemptId, query = {}) {
  return apiRequest(`/api/assessment-attempts/${encodeURIComponent(attemptId)}/submit${buildQueryString(query)}`, {
    method: "POST",
  });
}


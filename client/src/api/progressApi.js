import { apiRequest } from "./apiClient";

export function getProgress() {
  return apiRequest("/api/progress", { method: "GET" });
}

export function syncInitialAssessmentProgress(payload) {
  return apiRequest("/api/progress/sync-initial-assessment", {
    method: "POST",
    body: payload,
  });
}


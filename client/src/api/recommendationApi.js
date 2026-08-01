import { apiRequest } from "./apiClient";
import { buildQueryString } from "./apiQuery";

export function getCurrentRecommendation(query = {}) {
  return apiRequest(`/api/recommendations/current${buildQueryString(query)}`, {
    method: "GET",
  });
}

export function markRecommendationViewed(recommendationId, query = {}) {
  return apiRequest(`/api/recommendations/${encodeURIComponent(recommendationId)}/viewed${buildQueryString(query)}`, {
    method: "POST",
  });
}

export function markRecommendationCompleted(recommendationId, query = {}) {
  return apiRequest(`/api/recommendations/${encodeURIComponent(recommendationId)}/completed${buildQueryString(query)}`, {
    method: "POST",
  });
}


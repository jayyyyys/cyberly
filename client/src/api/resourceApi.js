import { apiRequest } from "./apiClient";
import { buildQueryString } from "./apiQuery";

export function listResources(query = {}) {
  return apiRequest(`/api/resources${buildQueryString(query)}`, {
    method: "GET",
  });
}

export function getResourceBySlug(slug, query = {}) {
  return apiRequest(`/api/resources/${encodeURIComponent(slug)}${buildQueryString(query)}`, {
    method: "GET",
  });
}


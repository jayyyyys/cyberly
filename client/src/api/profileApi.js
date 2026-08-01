import { apiRequest } from "./apiClient";

export function getProfile() {
  return apiRequest("/api/profile", { method: "GET" });
}

export function saveProfile(profile) {
  return apiRequest("/api/profile", {
    method: "PUT",
    body: profile,
  });
}


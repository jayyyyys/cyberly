import { apiRequest } from "./apiClient";

export function getAccount() {
  return apiRequest("/api/account", { method: "GET" });
}

export function saveAccount(account) {
  return apiRequest("/api/account", {
    method: "PUT",
    body: account,
  });
}


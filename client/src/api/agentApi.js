import { apiRequest } from "./apiClient";

export function createActionProposal(payload = {}, options = {}) {
  return apiRequest("/api/agent/actions/proposals", {
    method: "POST",
    body: payload,
    signal: options.signal,
  });
}

export function confirmActionProposal(proposalId, payload = {}, options = {}) {
  return apiRequest(`/api/agent/actions/proposals/${encodeURIComponent(proposalId)}/confirm`, {
    method: "POST",
    body: payload,
    signal: options.signal,
  });
}

export function cancelActionProposal(proposalId, payload = {}, options = {}) {
  return apiRequest(`/api/agent/actions/proposals/${encodeURIComponent(proposalId)}/cancel`, {
    method: "POST",
    body: payload,
    signal: options.signal,
  });
}

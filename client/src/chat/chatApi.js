import i18n from "../i18n";
import { apiFetch, parseApiJson } from "../api/apiClient";
import {
  cancelActionProposal,
  confirmActionProposal,
  createActionProposal,
} from "../api/agentApi";

function localizedApiError(result = {}, fallbackKey = "errors.fallback.generic") {
  if (result.code) {
    const key = `errors.codes.${result.code}`;
    const translated = i18n.t(key, { defaultValue: "" });
    if (translated && translated !== key) return translated;
  }

  if (result.message) return result.message;

  return i18n.t(fallbackKey, {
    defaultValue: i18n.t("errors.fallback.generic"),
  });
}

function apiFailure(data = {}, fallbackKey = "errors.fallback.generic", fallbackErrors = {}) {
  const result = {
    ok: false,
    code: data.code,
    message: data.message,
    errors: data.errors || fallbackErrors,
  };

  return {
    ...result,
    error: localizedApiError(result, fallbackKey),
  };
}

function networkFailure(fallbackKey = "errors.fallback.network", fallbackErrors = {}) {
  const result = {
    ok: false,
    code: "NETWORK_UNAVAILABLE",
    network: true,
    errors: fallbackErrors,
  };

  return {
    ...result,
    error: localizedApiError(result, fallbackKey),
  };
}

async function chatRequest(path, options = {}, fallbackKey) {
  try {
    const response = await apiFetch(path, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {}),
      },
    });
    const data = await parseApiJson(response);
    if (!response.ok) return apiFailure(data, fallbackKey);
    return { ok: true, ...data };
  } catch (error) {
    if (error?.name === "AbortError") {
      return { ok: false, aborted: true, code: "REQUEST_ABORTED", error: "" };
    }
    return networkFailure(fallbackKey);
  }
}

async function actionProposalRequest(request, fallbackKey) {
  try {
    const result = await request();
    const data = result.data || {};
    if (!result.ok) return apiFailure(data, fallbackKey);
    return { ok: true, ...data };
  } catch (error) {
    if (error?.cause?.name === "AbortError" || error?.name === "AbortError") {
      return { ok: false, aborted: true, code: "REQUEST_ABORTED", error: "" };
    }
    return networkFailure(fallbackKey);
  }
}

export function listChatConversations(limit = 50, options = {}) {
  const safeLimit = Number.isFinite(Number(limit)) ? Number(limit) : 50;
  return chatRequest(
    `/api/chat/conversations?limit=${encodeURIComponent(safeLimit)}`,
    { method: "GET", signal: options.signal },
    "errors.fallback.loadChatConversations"
  );
}

export function createChatConversation(payload = {}, options = {}) {
  return chatRequest(
    "/api/chat/conversations",
    { method: "POST", body: JSON.stringify(payload), signal: options.signal },
    "errors.fallback.createChatConversation"
  );
}

export function getChatConversation(conversationId, options = {}) {
  return chatRequest(
    `/api/chat/conversations/${encodeURIComponent(conversationId)}`,
    { method: "GET", signal: options.signal },
    "errors.fallback.loadChatMessages"
  );
}

export function renameChatConversation(conversationId, title, options = {}) {
  return chatRequest(
    `/api/chat/conversations/${encodeURIComponent(conversationId)}`,
    { method: "PATCH", body: JSON.stringify({ title }), signal: options.signal },
    "errors.fallback.renameChatConversation"
  );
}

export function deleteChatConversation(conversationId, options = {}) {
  return chatRequest(
    `/api/chat/conversations/${encodeURIComponent(conversationId)}`,
    { method: "DELETE", signal: options.signal },
    "errors.fallback.deleteChatConversation"
  );
}

export function createChatUserMessage(conversationId, payload = {}, options = {}) {
  return chatRequest(
    `/api/chat/conversations/${encodeURIComponent(conversationId)}/messages`,
    { method: "POST", body: JSON.stringify(payload), signal: options.signal },
    "errors.fallback.sendChatMessage"
  );
}

export function generateChatAssistantReply(conversationId, messageId, payload = {}, options = {}) {
  return chatRequest(
    `/api/chat/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}/generate`,
    { method: "POST", body: JSON.stringify(payload), signal: options.signal },
    "errors.fallback.generateChatReply"
  );
}

export function createLearnerActionProposal(payload = {}, options = {}) {
  return actionProposalRequest(
    () => createActionProposal(payload, options),
    "errors.fallback.generic"
  );
}

export function confirmLearnerActionProposal(proposalId, confirmationToken, options = {}) {
  return actionProposalRequest(
    () => confirmActionProposal(proposalId, { confirmationToken }, options),
    "errors.fallback.generic"
  );
}

export function cancelLearnerActionProposal(proposalId, options = {}) {
  return actionProposalRequest(
    () => cancelActionProposal(proposalId, {}, options),
    "errors.fallback.generic"
  );
}

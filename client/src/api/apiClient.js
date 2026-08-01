import { API_BASE_URL } from "./apiConfig";

export class ApiNetworkError extends Error {
  constructor(message = "Network error. Please try again.", cause) {
    super(message);
    this.name = "ApiNetworkError";
    this.code = "NETWORK_UNAVAILABLE";
    this.cause = cause;
  }
}

export function buildApiUrl(path, baseUrl = API_BASE_URL) {
  const rawPath = String(path || "");
  if (/^https?:\/\//i.test(rawPath)) return rawPath;

  const normalizedBaseUrl = String(baseUrl || "").replace(/\/+$/, "");
  const normalizedPath = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
  return `${normalizedBaseUrl}${normalizedPath}`;
}

function isJsonSerializableBody(body) {
  if (body === undefined || body === null) return false;
  if (typeof body === "string") return false;
  if (typeof FormData !== "undefined" && body instanceof FormData) return false;
  if (typeof Blob !== "undefined" && body instanceof Blob) return false;
  if (typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams) return false;
  return typeof body === "object";
}

export async function parseApiJson(response) {
  if (!response) return {};
  if (typeof response.text !== "function") {
    if (typeof response.json === "function") {
      return response.json().catch(() => ({}));
    }
    return {};
  }

  const text = await response.text().catch(() => "");
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

export function normalizeBackendError(data = {}, fallbackMessage = "Request failed.", status = null) {
  return {
    message: data?.message || fallbackMessage,
    code: data?.code,
    errors: data?.errors || {},
    status,
  };
}

export async function apiFetch(path, options = {}) {
  const {
    body,
    credentials = "include",
    headers = {},
    signal,
    ...requestOptions
  } = options;

  const shouldSerializeJson = isJsonSerializableBody(body);
  const requestHeaders = {
    ...(body !== undefined && !(typeof FormData !== "undefined" && body instanceof FormData)
      ? { "Content-Type": "application/json" }
      : {}),
    ...headers,
  };

  const fetchOptions = {
    ...requestOptions,
    credentials,
  };

  if (Object.keys(requestHeaders).length > 0) fetchOptions.headers = requestHeaders;
  if (signal) fetchOptions.signal = signal;
  if (body !== undefined) fetchOptions.body = shouldSerializeJson ? JSON.stringify(body) : body;

  try {
    return await fetch(buildApiUrl(path), fetchOptions);
  } catch (error) {
    throw new ApiNetworkError(undefined, error);
  }
}

export async function apiRequest(path, options = {}) {
  const response = await apiFetch(path, options);
  const data = await parseApiJson(response);

  return {
    ok: Boolean(response.ok),
    status: response.status,
    response,
    data,
  };
}

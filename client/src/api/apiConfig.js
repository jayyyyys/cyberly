const DEVELOPMENT_API_BASE_URL = "http://localhost:5000";

export function normalizeApiBaseUrl(value = "") {
  return String(value || "").trim().replace(/\/+$/, "");
}

export function resolveApiBaseUrl(env = process.env) {
  const configuredBaseUrl = normalizeApiBaseUrl(env.REACT_APP_API_BASE_URL);
  if (configuredBaseUrl) return configuredBaseUrl;

  if (env.NODE_ENV === "production") return "";

  return DEVELOPMENT_API_BASE_URL;
}

export const API_BASE_URL = resolveApiBaseUrl();


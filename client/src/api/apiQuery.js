export function buildQueryString(params = {}) {
  if (!params) return "";

  if (typeof params === "string") {
    const trimmed = params.trim().replace(/^\?/, "");
    return trimmed ? `?${trimmed}` : "";
  }

  const searchParams = params instanceof URLSearchParams
    ? params
    : new URLSearchParams();

  if (!(params instanceof URLSearchParams)) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && String(value).trim() !== "") {
        searchParams.set(key, value);
      }
    }
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}


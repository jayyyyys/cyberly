const DATE_PREFIX_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/;

export function formatAdminDate(value, _locale, fallback = "—") {
  if (!value) return fallback;
  if (typeof value === "string") {
    const match = value.match(DATE_PREFIX_PATTERN);
    if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const SUPPORTED_LOCALES = ['en', 'ms', 'zh-CN'];
const DEFAULT_LOCALE = 'en';

function normalizeLocale(value) {
  const locale = String(value || '').trim();
  const lower = locale.toLowerCase();

  if (locale === 'zh-CN' || lower === 'zh-cn') return 'zh-CN';
  if (lower === 'en' || lower.startsWith('en-')) return 'en';
  if (lower === 'ms' || lower.startsWith('ms-')) return 'ms';

  return DEFAULT_LOCALE;
}

function localeFromRequest(req) {
  const queryLocale = req?.query?.locale;
  if (queryLocale) return normalizeLocale(queryLocale);

  const acceptLanguage = String(req?.headers?.['accept-language'] || '');
  const candidates = acceptLanguage
    .split(',')
    .map(item => item.split(';')[0].trim())
    .filter(Boolean);

  for (const candidate of candidates) {
    const locale = normalizeLocale(candidate);
    if (locale !== DEFAULT_LOCALE || /^en($|-)/i.test(candidate)) {
      return locale;
    }
  }

  return DEFAULT_LOCALE;
}

module.exports = {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  localeFromRequest,
  normalizeLocale,
};

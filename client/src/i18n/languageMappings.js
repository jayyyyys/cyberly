export const SUPPORTED_LOCALES = [
  "en",
  "ms",
  "zh-CN",
];

const PROFILE_TO_LOCALE = {
  english: "en",
  bahasa_melayu: "ms",
  chinese: "zh-CN",
  mixed: "en",
};

const LOCALE_TO_PROFILE = {
  en: "english",
  ms: "bahasa_melayu",
  "zh-CN": "chinese",
};

export function normalizeLocale(value) {
  const locale = String(value || "").trim();

  return SUPPORTED_LOCALES.includes(locale)
    ? locale
    : "en";
}

export function isSupportedLocale(value) {
  return SUPPORTED_LOCALES.includes(
    String(value || "").trim()
  );
}

export function profileLanguageToLocale(value) {
  return (
    PROFILE_TO_LOCALE[
      String(value || "").trim()
    ] || "en"
  );
}

export function localeToProfileLanguage(value) {
  return (
    LOCALE_TO_PROFILE[normalizeLocale(value)] ||
    "english"
  );
}
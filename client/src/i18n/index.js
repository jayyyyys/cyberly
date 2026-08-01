import i18n from "i18next";
import {
  initReactI18next,
} from "react-i18next";

import en from "./locales/en.json";
import ms from "./locales/ms.json";
import zhCN from "./locales/zh-CN.json";

import {
  isSupportedLocale,
  normalizeLocale,
} from "./languageMappings";

export const STORAGE_KEY =
  "cyberly.uiLanguage";

function getStoredLanguage() {
  try {
    const stored =
      window.localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return null;
    }

    if (!isSupportedLocale(stored)) {
      window.localStorage.removeItem(
        STORAGE_KEY
      );
      return null;
    }

    return stored;
  } catch {
    return null;
  }
}

const storedLanguage = getStoredLanguage();

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: en,
      },
      ms: {
        translation: ms,
      },
      "zh-CN": {
        translation: zhCN,
      },
    },

    lng: storedLanguage || "en",

    fallbackLng: "en",

    supportedLngs: [
      "en",
      "ms",
      "zh-CN",
    ],

    interpolation: {
      escapeValue: false,
    },

    returnNull: false,
  });

function updateDocumentLanguage(locale) {
  document.documentElement.lang =
    normalizeLocale(locale);
}

updateDocumentLanguage(
  i18n.resolvedLanguage ||
  i18n.language
);

i18n.on(
  "languageChanged",
  updateDocumentLanguage
);

export function getStoredUiLanguage() {
  return getStoredLanguage();
}

export default i18n;
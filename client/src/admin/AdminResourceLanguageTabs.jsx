import { useTranslation } from "react-i18next";
import { buildTranslationCoverage } from "./adminContentState";
import AdminTranslationTabs, { adminLocaleLabel } from "./AdminTranslationTabs";

export const RESOURCE_EDITOR_LOCALES = ["en", "ms", "zh-CN"];

export function localeLabel(t, locale) {
  return adminLocaleLabel(t, locale);
}

export default function AdminResourceLanguageTabs({ activeLocale, dirtyLocale, onSelect, translations }) {
  const { t } = useTranslation();
  const coverage = buildTranslationCoverage({ type: "resource", translations, dirtyLocale });

  return (
    <AdminTranslationTabs
      activeLocale={activeLocale}
      ariaLabel={t("admin.resourceEditor.languageTabs")}
      coverage={coverage}
      onSelect={onSelect}
    />
  );
}

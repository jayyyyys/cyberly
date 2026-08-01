import { useTranslation } from "react-i18next";
import { ADMIN_CONTENT_LOCALES } from "./adminContentState";

export function adminLocaleLabel(t, locale) {
  return t(`admin.translation.locales.${locale}`, {
    defaultValue: t(`admin.resourceEditor.locales.${locale}`, { defaultValue: locale }),
  });
}

export function translationStatusLabel(t, status) {
  return t(`admin.translation.status.${status}`, {
    defaultValue: t(`admin.resourceEditor.status.${status === "complete" ? "exists" : status}`, { defaultValue: status }),
  });
}

export default function AdminTranslationTabs({
  activeLocale,
  ariaLabel,
  coverage,
  onSelect,
}) {
  const { t } = useTranslation();
  const items = coverage?.items || ADMIN_CONTENT_LOCALES.map(locale => ({
    locale,
    required: locale === "en",
    status: "missing",
  }));

  return (
    <div className="admin-translation-tabs" role="tablist" aria-label={ariaLabel || t("admin.translation.tabsLabel")}>
      {items.map(item => {
        const active = activeLocale === item.locale;
        return (
          <button
            key={item.locale}
            type="button"
            role="tab"
            aria-selected={active}
            className={`admin-translation-tab${active ? " active" : ""}${item.dirty ? " dirty" : ""} ${item.status}`}
            onClick={() => onSelect(item.locale)}
          >
            <span className="admin-translation-tab-language">{adminLocaleLabel(t, item.locale)}</span>
            <span className="admin-translation-tab-meta">
              <span>{item.required ? t("admin.translation.required") : t("admin.translation.optional")}</span>
              <span aria-hidden="true">·</span>
              <strong>{translationStatusLabel(t, item.status)}</strong>
            </span>
          </button>
        );
      })}
    </div>
  );
}

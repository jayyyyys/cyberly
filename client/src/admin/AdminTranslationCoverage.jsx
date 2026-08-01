import { useTranslation } from "react-i18next";
import { adminLocaleLabel, translationStatusLabel } from "./AdminTranslationTabs";

export default function AdminTranslationCoverage({ coverage }) {
  const { t } = useTranslation();
  if (!coverage?.items?.length) return null;

  return (
    <section className="admin-translation-coverage" aria-label={t("admin.translation.coverage")}>
      <div className="admin-translation-coverage-head">
        <div>
          <p className="res-tag">{t("admin.translation.coverage")}</p>
          <h3>{t("admin.translation.coverageValue", { complete: coverage.completeCount, total: coverage.totalCount })}</h3>
        </div>
        <span className={coverage.requiredComplete ? "admin-status-badge publication-published" : "admin-status-badge publication-draft"}>
          {coverage.requiredComplete ? t("admin.translation.requiredReady") : t("admin.translation.requiredMissing")}
        </span>
      </div>
      <dl className="admin-translation-coverage-list">
        {coverage.items.map(item => (
          <div key={item.locale}>
            <dt>{adminLocaleLabel(t, item.locale)}</dt>
            <dd>
              <span>{item.required ? t("admin.translation.required") : t("admin.translation.optional")}</span>
              <strong>{translationStatusLabel(t, item.status)}</strong>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

import { useTranslation } from "react-i18next";

function optionLabel(t, prefix, option) {
  if (!option) return "";
  const value = option.value || option.code || option;
  return t(`${prefix}.${value}`, { defaultValue: option.label || value });
}

export default function AdminResourceSourceForm({
  form,
  options,
  onChange,
  onMarkCheckedToday,
  errors = {},
}) {
  const { t } = useTranslation();
  const sourceUrl = String(form.sourceUrl || "").trim();
  const canOpenSource = /^https?:\/\//i.test(sourceUrl);

  return (
    <div className="admin-resource-form admin-resource-source-form">
      <section>
        <h3>{t("admin.resourceMetadata.sourceInformation")}</h3>
        <div className="admin-resource-form-grid">
          <label>
            <span>{t("admin.resourceMetadata.sourceLabel")}</span>
            <input value={form.sourceLabel || ""} onChange={event => onChange("sourceLabel", event.target.value)} />
            {errors.sourceLabel && <small className="field-error">{errors.sourceLabel}</small>}
          </label>
          <label>
            <span>{t("admin.resourceMetadata.sourceUrl")}</span>
            <input value={form.sourceUrl || ""} onChange={event => onChange("sourceUrl", event.target.value)} placeholder="https://..." />
            {errors.sourceUrl && <small className="field-error">{errors.sourceUrl}</small>}
          </label>
        </div>
        <div className="admin-resource-source-actions">
          {canOpenSource ? (
            <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary">
              {t("admin.resourceMetadata.openSource")}
            </a>
          ) : (
            <span className="admin-resource-source-missing">{t("admin.resourceMetadata.missingSource")}</span>
          )}
        </div>
      </section>

      <section>
        <h3>{t("admin.resourceMetadata.sourceClassification")}</h3>
        <div className="admin-resource-form-grid three">
          <label>
            <span>{t("admin.resourceMetadata.sourceType")}</span>
            <select value={form.sourceType || ""} onChange={event => onChange("sourceType", event.target.value)}>
              <option value="">{t("common.notSet")}</option>
              {(options.sourceTypes || []).map(option => (
                <option key={option.value} value={option.value}>{optionLabel(t, "admin.resourceMetadata.sourceTypes", option)}</option>
              ))}
            </select>
          </label>
          <label>
            <span>{t("admin.resourceMetadata.sourceCountry")}</span>
            <select value={form.sourceCountry || ""} onChange={event => onChange("sourceCountry", event.target.value)}>
              <option value="">{t("common.notSet")}</option>
              {(options.sourceCountries || []).map(option => (
                <option key={option.value} value={option.value}>{optionLabel(t, "admin.resourceMetadata.sourceCountries", option)}</option>
              ))}
            </select>
          </label>
          <label>
            <span>{t("admin.resourceMetadata.authorityLevel")}</span>
            <select value={form.sourceAuthorityLevel || ""} onChange={event => onChange("sourceAuthorityLevel", event.target.value)}>
              <option value="">{t("common.notSet")}</option>
              {(options.sourceAuthorityLevels || []).map(option => (
                <option key={option.value} value={option.value}>{optionLabel(t, "admin.resourceMetadata.authorityLevels", option)}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section>
        <h3>{t("admin.resourceMetadata.sourceMaintenance")}</h3>
        <div className="admin-resource-form-grid">
          <label>
            <span>{t("admin.resourceMetadata.lastSourceChecked")}</span>
            <input type="date" value={form.lastSourceCheckedAt || ""} onChange={event => onChange("lastSourceCheckedAt", event.target.value)} />
          </label>
          <div className="admin-resource-form-action">
            <button type="button" className="btn-secondary" onClick={onMarkCheckedToday}>
              {t("admin.resourceMetadata.markCheckedToday")}
            </button>
            <small>{t("admin.resourceMetadata.markCheckedTodayHint")}</small>
          </div>
        </div>
        <label className="admin-resource-checkbox">
          <input type="checkbox" checked={Boolean(form.replacementSourceNeeded)} onChange={event => onChange("replacementSourceNeeded", event.target.checked)} />
          <span>{t("admin.resourceMetadata.replacementSourceNeeded")}</span>
        </label>
        {form.replacementSourceNeeded && (
          <p className="admin-resource-warning">{t("admin.resourceMetadata.replacementWarning")}</p>
        )}
      </section>

      <section>
        <h3>{t("admin.resourceMetadata.safetyMetadata")}</h3>
        <div className="admin-resource-form-grid">
          <label>
            <span>{t("admin.resourceMetadata.ageSuitability")}</span>
            <select value={form.ageAppropriateness || ""} onChange={event => onChange("ageAppropriateness", event.target.value)}>
              <option value="">{t("common.notSet")}</option>
              {(options.ageSuitabilityOptions || []).map(option => (
                <option key={option.value} value={option.value}>{optionLabel(t, "admin.resourceMetadata.ageOptions", option)}</option>
              ))}
            </select>
          </label>
          <div className="admin-resource-checkbox-stack">
            <label className="admin-resource-checkbox">
              <input type="checkbox" checked={Boolean(form.sensitiveTopicFlag)} onChange={event => onChange("sensitiveTopicFlag", event.target.checked)} />
              <span>{t("admin.resourceMetadata.sensitiveTopic")}</span>
            </label>
            <label className="admin-resource-checkbox">
              <input type="checkbox" checked={Boolean(form.malaysiaGuidanceFlag)} onChange={event => onChange("malaysiaGuidanceFlag", event.target.checked)} />
              <span>{t("admin.resourceMetadata.malaysiaGuidance")}</span>
            </label>
          </div>
        </div>
      </section>
    </div>
  );
}

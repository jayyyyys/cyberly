import { useTranslation } from "react-i18next";

const LIMITS = {
  title: 180,
  summary: 500,
  body: 24000,
};

function counter(value, max) {
  return `${String(value || "").length}/${max}`;
}

export default function AdminResourceContentForm({
  dirty,
  errors,
  form,
  onChange,
  onReset,
  onSave,
  saveLabel,
  saveState,
}) {
  const { t } = useTranslation();

  return (
    <form className="admin-resource-content-form" onSubmit={event => {
      event.preventDefault();
      onSave();
    }}>
      <label>
        <span>{t("admin.resourceEditor.fields.title")} *</span>
        <input
          value={form.title}
          maxLength={LIMITS.title}
          onChange={event => onChange("title", event.target.value)}
          aria-invalid={Boolean(errors.title)}
        />
        <small>{errors.title || counter(form.title, LIMITS.title)}</small>
      </label>

      <label>
        <span>{t("admin.resourceEditor.fields.summary")} *</span>
        <textarea
          rows={3}
          value={form.summary}
          maxLength={LIMITS.summary}
          onChange={event => onChange("summary", event.target.value)}
          aria-invalid={Boolean(errors.summary)}
        />
        <small>{errors.summary || counter(form.summary, LIMITS.summary)}</small>
      </label>

      <label>
        <span>{t("admin.resourceEditor.fields.body")} *</span>
        <textarea
          className="admin-resource-body-textarea"
          rows={14}
          value={form.body}
          maxLength={LIMITS.body}
          onChange={event => onChange("body", event.target.value)}
          aria-invalid={Boolean(errors.body)}
        />
        <small>{errors.body || t("admin.resourceEditor.bodyHint", { count: String(form.body || "").length, max: LIMITS.body })}</small>
      </label>

      {saveState.error && <p className="field-error" role="alert">{saveState.error}</p>}
      {saveState.message && <p className="admin-resource-success" role="status">{saveState.message}</p>}

      <div className="admin-resource-editor-actions">
        <button type="button" className="btn-secondary" onClick={onReset} disabled={!dirty || saveState.saving}>
          {t("admin.resourceEditor.reset")}
        </button>
        <button type="submit" className="btn-primary" disabled={!dirty || saveState.saving}>
          {saveState.saving ? t("common.saving") : (saveLabel || t("admin.resourceEditor.save"))}
        </button>
      </div>
    </form>
  );
}

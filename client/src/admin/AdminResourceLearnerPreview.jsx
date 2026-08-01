import { useTranslation } from "react-i18next";

function bodyToParagraphs(body) {
  return String(body || "")
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map(part => part.trim())
    .filter(Boolean);
}

export default function AdminResourceLearnerPreview({ categoryLabel, form, localeLabel }) {
  const { t } = useTranslation();
  const paragraphs = bodyToParagraphs(form.body);

  return (
    <aside className="admin-resource-preview" aria-label={t("admin.resourceEditor.previewLabel")}>
      <div className="admin-resource-preview-head">
        <p className="res-tag">{t("admin.resourceEditor.previewOnly")}</p>
        <span>{localeLabel}</span>
      </div>
      <span className="admin-resource-preview-category">{categoryLabel}</span>
      <h2>{form.title || t("admin.resourceEditor.previewUntitled")}</h2>
      {form.summary && <p className="admin-resource-preview-summary">{form.summary}</p>}
      <div className="admin-resource-preview-body">
        {paragraphs.length ? paragraphs.map((paragraph, index) => (
          <p key={`${paragraph.slice(0, 20)}-${index}`}>{paragraph}</p>
        )) : (
          <p className="admin-resource-preview-empty">{t("admin.resourceEditor.previewEmpty")}</p>
        )}
      </div>
    </aside>
  );
}

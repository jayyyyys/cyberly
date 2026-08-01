import { useTranslation } from "react-i18next";
import AdminSidebar from "./AdminSidebar";

export default function AdminWorkspace({ onSectionNavigate, sections, activeSection, children, status }) {
  const { t } = useTranslation();

  return (
    <section className="admin-workspace admin-theme">
      <AdminSidebar sections={sections} activeSection={activeSection} onSectionNavigate={onSectionNavigate} />

      <main className="admin-workspace-main">
        <header className="admin-workspace-main-header">
          <div>
            <p className="res-tag">{t(activeSection.labelKey)}</p>
            <h1>{t(activeSection.labelKey)}</h1>
            <p>{t(activeSection.descriptionKey)}</p>
          </div>
          <div className="admin-workspace-status" role="status" aria-live="polite">
            <strong>{status?.role || "admin"}</strong>
            <span>{status?.message || t("admin.status.verified")}</span>
          </div>
        </header>

        <div className="admin-workspace-content">
          {children}
        </div>
      </main>
    </section>
  );
}

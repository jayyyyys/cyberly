import { useTranslation } from "react-i18next";

export default function AdminSidebar({ onSectionNavigate, sections, activeSection }) {
  const { t } = useTranslation();

  const navigate = (section) => {
    if (!section.enabled) return;
    if (onSectionNavigate && onSectionNavigate(section) === false) return;
    window.location.hash = section.path;
  };

  return (
    <aside className="admin-workspace-sidebar">
      <div className="admin-workspace-sidebar-heading">
        <p className="res-tag">{t("admin.workspace.badge")}</p>
        <h2>{t("admin.workspace.title")}</h2>
        <p>{t("admin.workspace.description")}</p>
      </div>

      <nav className="admin-section-nav" aria-label={t("admin.navigation.label")}>
        {sections.map(section => {
          const active = section.id === activeSection.id;
          return (
            <button
              key={section.id}
              type="button"
              className={`admin-section-nav-item${active ? " active" : ""}${section.enabled ? "" : " disabled"}`}
              onClick={() => navigate(section)}
              aria-current={active ? "page" : undefined}
              aria-disabled={!section.enabled}
              disabled={!section.enabled}
            >
              <span>{t(section.labelKey)}</span>
              {!section.enabled && <small>{t("admin.navigation.comingLater")}</small>}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

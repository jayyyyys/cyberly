import { useState } from "react";
import { useTranslation } from "react-i18next";
import AdminResourceLifecycleDialog from "./AdminResourceLifecycleDialog";
import { RESOURCE_SECTION_TABS } from "./resourceFormState";
import {
  getCyberGuardStatusDisplay,
  getPublicationStatusDisplay,
  getReviewStatusDisplay,
} from "./resourceDisplayState";

export function ResourceLifecycleIconButton({ className = "", labelKey = "admin.resourceLifecycle.archiveOrDelete", onClick }) {
  return <ResourceLifecycleButton className={className} compact labelKey={labelKey} onClick={onClick} />;
}

function StatusBadge({ display, value }) {
  const { t } = useTranslation();
  return (
    <span className={`admin-status-badge ${display.tone}`}>
      {t(display.labelKey, { defaultValue: value })}
    </span>
  );
}

function ArchiveBoxIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
      <path d="M4 5.5h16l-1.4 4H5.4L4 5.5Z" />
      <path d="M6 9.5h12v8.8a1.7 1.7 0 0 1-1.7 1.7H7.7A1.7 1.7 0 0 1 6 18.3V9.5Z" />
      <path d="M12 7v8" />
      <path d="m9 12 3 3 3-3" />
    </svg>
  );
}

export function ResourceLifecycleButton({ className = "", compact = false, labelKey = "admin.resourceLifecycle.archiveOrDelete", onClick }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className={`admin-lifecycle-trigger${compact ? " compact" : ""}${className ? ` ${className}` : ""}`}
      onClick={onClick}
      aria-label={t(labelKey)}
      title={t(labelKey)}
    >
      <ArchiveBoxIcon />
      {!compact && <span>{t("admin.resourceLifecycle.archiveDeleteShort")}</span>}
    </button>
  );
}

export default function AdminResourceActions({
  currentSection,
  onArchived,
  onDeleted,
  onLifecycleChange,
  requestGuardedAction,
  requestHashNavigation,
  resource,
  resourceId,
}) {
  const { t } = useTranslation();
  const [lifecycleDialogOpen, setLifecycleDialogOpen] = useState(false);

  if (!resource || !resourceId) return null;

  const title = resource.title || resource.slug;
  const publicationStatus = resource.publicationStatus || resource.status || "draft";
  const reviewStatus = resource.reviewStatus || "draft";
  const effectiveRagEligible = Boolean(resource.effectiveRagEligible);

  function goBack() {
    requestHashNavigation?.("/admin/resources");
  }

  function goTab(tab) {
    if (currentSection === tab.id) return;
    requestHashNavigation?.(`/admin/resources/${resourceId}/${tab.pathSuffix}`);
  }

  function openLifecycleDialog() {
    const open = () => setLifecycleDialogOpen(true);
    if (requestGuardedAction) {
      requestGuardedAction(open, { actionType: "resource-lifecycle" });
      return;
    }
    open();
  }

  return (
    <section className="admin-resource-action-header compact" aria-label={t("admin.resourceLifecycle.headerLabel")}>
      <div className="admin-resource-action-main">
        <div>
          <p className="res-tag">{resource.slug}</p>
          <h2>{title}</h2>
        </div>
        <div className="admin-resource-editor-badges">
          <StatusBadge display={getPublicationStatusDisplay(publicationStatus)} value={publicationStatus} />
          <StatusBadge display={getReviewStatusDisplay(reviewStatus)} value={reviewStatus} />
          <StatusBadge display={getCyberGuardStatusDisplay(effectiveRagEligible)} value={String(effectiveRagEligible)} />
        </div>
      </div>

      <div className="admin-resource-action-row compact">
        <button type="button" className="btn-secondary admin-resource-back-button" onClick={goBack}>
          ← {t("common.back")}
        </button>
        <div className="admin-resource-action-tabs" role="tablist" aria-label={t("admin.resourceLifecycle.tabsLabel")}>
          {RESOURCE_SECTION_TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={currentSection === tab.id}
              className={currentSection === tab.id ? "active" : ""}
              onClick={() => goTab(tab)}
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </div>
        <ResourceLifecycleButton onClick={openLifecycleDialog} />
      </div>

      {lifecycleDialogOpen && (
        <AdminResourceLifecycleDialog
          resource={{ ...resource, title }}
          resourceId={resourceId}
          onArchived={onArchived}
          onDeleted={onDeleted}
          onLifecycleChange={onLifecycleChange}
          onCancel={() => setLifecycleDialogOpen(false)}
        />
      )}
    </section>
  );
}

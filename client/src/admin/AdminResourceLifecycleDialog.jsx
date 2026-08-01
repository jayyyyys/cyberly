import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  archiveAdminResource,
  getAdminResourceLifecycle,
  permanentlyDeleteAdminResource,
  restoreAdminResource,
} from "./adminApi";
import {
  canConfirmPermanentDelete,
  isPermanentDeleteAvailable,
} from "./resourceFormState";
import {
  getLifecycleBlockingReasons,
  normalizeLifecycle,
} from "./resourceLifecycleState";

const COUNT_KEYS = ["translations", "ragDocuments", "ragChunks", "chatSourceReferences", "contentRelationships"];
const DEFAULT_LOAD_ERROR_KEY = "admin.resourceLifecycle.errors.loadFailed";

function DialogActionIcon({ type }) {
  if (type === "restore") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
        <path d="M7 7H4v-3" />
        <path d="M5 7a8 8 0 1 1-1 7" />
        <path d="M12 8v5l3 2" />
      </svg>
    );
  }
  if (type === "delete") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
        <path d="M4 7h16" />
        <path d="M10 11v6" />
        <path d="M14 11v6" />
        <path d="M6 7l1 13h10l1-13" />
        <path d="M9 7V4h6v3" />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
      <path d="M4 5.5h16l-1.4 4H5.4L4 5.5Z" />
      <path d="M6 9.5h12v8.8a1.7 1.7 0 0 1-1.7 1.7H7.7A1.7 1.7 0 0 1 6 18.3V9.5Z" />
      <path d="M12 7v8" />
      <path d="m9 12 3 3 3-3" />
    </svg>
  );
}

export default function AdminResourceLifecycleDialog({
  onArchived,
  onCancel,
  onDeleted,
  onLifecycleChange,
  resource,
  resourceId,
}) {
  const { t } = useTranslation();
  const cancelRef = useRef(null);
  const [lifecycle, setLifecycle] = useState(() => normalizeLifecycle(null));
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmationSlug, setConfirmationSlug] = useState("");

  const applyLifecycle = useCallback((value) => {
    const normalized = normalizeLifecycle(value);
    setLifecycle(normalized);
    onLifecycleChange?.(normalized);
  }, [onLifecycleChange]);

  useEffect(() => {
    const previous = document.activeElement;
    cancelRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (previous && typeof previous.focus === "function") previous.focus();
    };
  }, [onCancel]);

  useEffect(() => {
    let active = true;
    setLifecycle(normalizeLifecycle(null));
    setConfirmationSlug("");
    setError("");
    setLoadError("");
    setLoading(true);

    getAdminResourceLifecycle(resourceId).then(result => {
      if (!active) return;
      setLoading(false);
      if (!result.ok) {
        setLoadError(result.error || DEFAULT_LOAD_ERROR_KEY);
        return;
      }
      applyLifecycle(result.lifecycle);
    });

    return () => { active = false; };
  }, [applyLifecycle, resourceId]);

  async function retryLoad() {
    setLifecycle(normalizeLifecycle(null));
    setConfirmationSlug("");
    setError("");
    setLoadError("");
    setLoading(true);
    const result = await getAdminResourceLifecycle(resourceId);
    setLoading(false);
    if (!result.ok) {
      setLoadError(result.error || DEFAULT_LOAD_ERROR_KEY);
      return;
    }
    applyLifecycle(result.lifecycle);
  }

  async function archive() {
    setSaving(true);
    setError("");
    const result = await archiveAdminResource(resourceId);
    setSaving(false);
    if (!result.ok) {
      setError(result.error || t("admin.resourceLifecycle.errors.archive"));
      return;
    }
    applyLifecycle(result.lifecycle);
    onArchived?.(result.resource);
    onCancel();
  }

  async function restore() {
    setSaving(true);
    setError("");
    const result = await restoreAdminResource(resourceId);
    setSaving(false);
    if (!result.ok) {
      setError(result.error || t("admin.resourceLifecycle.errors.restore"));
      return;
    }
    applyLifecycle(result.lifecycle);
    onArchived?.(result.resource);
    onCancel();
  }

  async function permanentDelete() {
    setSaving(true);
    setError("");
    const result = await permanentlyDeleteAdminResource(resourceId, confirmationSlug);
    setSaving(false);
    if (!result.ok) {
      setError(result.code === "ADMIN_RESOURCE_DELETE_SLUG_MISMATCH"
        ? t("admin.resourceLifecycle.errors.slugMismatch")
        : result.code === "ADMIN_RESOURCE_DELETE_NOT_ELIGIBLE"
          ? t("admin.resourceLifecycle.errors.notEligible")
          : (result.error || t("admin.resourceLifecycle.errors.delete")));
      applyLifecycle({
        ...lifecycle,
        canPermanentlyDelete: false,
        canArchive: result.canArchive,
        canRestore: result.canRestore,
        counts: result.counts || lifecycle.counts,
        blockingReasons: result.blockingReasons || [],
        reasons: result.reasons,
        archiveAvailable: result.archiveAvailable,
      });
      return;
    }
    onDeleted?.(result);
    onCancel();
  }

  const title = resource?.title || resource?.slug;
  const deleteAvailable = isPermanentDeleteAvailable(lifecycle);
  const reasons = getLifecycleBlockingReasons(lifecycle);
  const canDelete = canConfirmPermanentDelete({
    lifecycle,
    slug: resource?.slug,
    confirmationSlug,
  });

  return (
    <div className="admin-confirm-backdrop" role="presentation">
      <div
        className="admin-confirm-dialog admin-lifecycle-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-lifecycle-dialog-title"
        aria-describedby="admin-lifecycle-dialog-description"
      >
        <p className="res-tag">{t("admin.resourceLifecycle.badge")}</p>
        <h3 id="admin-lifecycle-dialog-title">{t("admin.resourceLifecycle.manageTitle")}</h3>
        <p id="admin-lifecycle-dialog-description">{t("admin.resourceLifecycle.manageDescription")}</p>
        <p className="admin-confirm-resource">{title}</p>

        {loading ? (
          <p className="admin-resource-state" role="status">{t("admin.resourceLifecycle.loadingInformation")}</p>
        ) : loadError ? (
          <div className="admin-lifecycle-error">
            <p className="field-error" role="alert">
              {loadError === DEFAULT_LOAD_ERROR_KEY ? t(DEFAULT_LOAD_ERROR_KEY) : loadError}
            </p>
            <button type="button" className="btn-secondary" onClick={retryLoad}>
              {t("common.retry")}
            </button>
          </div>
        ) : (
          <>
            <div className="admin-lifecycle-operation-grid">
              {lifecycle.canArchive && (
                <section className="admin-lifecycle-operation">
                  <h4><DialogActionIcon type="archive" />{t("admin.resourceLifecycle.archiveTitle")}</h4>
                  <p>{t("admin.resourceLifecycle.archiveDescription")}</p>
                  <button type="button" className="btn-secondary" onClick={archive} disabled={saving}>
                    {saving ? t("common.saving") : t("admin.resourceLifecycle.archiveButton")}
                  </button>
                </section>
              )}
              {lifecycle.canRestore && (
                <section className="admin-lifecycle-operation">
                  <h4><DialogActionIcon type="restore" />{t("admin.resourceLifecycle.restoreTitle")}</h4>
                  <p>{t("admin.resourceLifecycle.restoreDescription")}</p>
                  <button type="button" className="btn-secondary" onClick={restore} disabled={saving}>
                    {saving ? t("common.saving") : t("admin.resourceLifecycle.restoreButton")}
                  </button>
                </section>
              )}
              <section className="admin-lifecycle-operation danger">
                <h4><DialogActionIcon type="delete" />{t("admin.resourceLifecycle.deleteTitle")}</h4>
                {deleteAvailable ? (
                  <>
                    <p>{t("admin.resourceLifecycle.deleteDescription")}</p>
                    <code className="admin-lifecycle-slug">{resource?.slug}</code>
                    <label className="admin-lifecycle-confirm-field">
                      <span>{t("admin.resourceLifecycle.confirmSlugLabel")}</span>
                      <input
                        value={confirmationSlug}
                        onChange={event => setConfirmationSlug(event.target.value)}
                        autoComplete="off"
                        placeholder={resource?.slug || ""}
                      />
                    </label>
                    <button type="button" className="btn-danger-muted" onClick={permanentDelete} disabled={!canDelete || saving}>
                      {saving ? t("common.saving") : t("admin.resourceLifecycle.deleteButton")}
                    </button>
                  </>
                ) : (
                  <>
                    <p>{t("admin.resourceLifecycle.deleteUnavailableDescription")}</p>
                    {reasons.length > 0 && (
                      <div>
                        <p className="admin-lifecycle-reason-heading">{t("admin.resourceLifecycle.blockingReasons")}</p>
                        <ul className="admin-lifecycle-reasons">
                          {reasons.map(reason => (
                            <li key={reason.code}>
                              {t(`admin.resourceLifecycle.reasons.${reason.code}`, {
                                count: reason.count,
                                defaultValue: reason.code,
                              })}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {lifecycle.canArchive && <p className="admin-lifecycle-helper">{t("admin.resourceLifecycle.archiveStillAvailable")}</p>}
                    {lifecycle.canRestore && <p className="admin-lifecycle-helper">{t("admin.resourceLifecycle.restoreStillAvailable")}</p>}
                  </>
                )}
              </section>
            </div>
            {lifecycle.loaded && (
              <dl className="admin-lifecycle-counts" aria-label={t("admin.resourceLifecycle.countsLabel")}>
                {COUNT_KEYS.map(key => (
                  <div key={key}>
                    <dt>{t(`admin.resourceLifecycle.counts.${key}`)}</dt>
                    <dd>{lifecycle.counts[key] || 0}</dd>
                  </div>
                ))}
              </dl>
            )}
          </>
        )}

        {error && <p className="field-error" role="alert">{error}</p>}

        <div className="admin-confirm-actions">
          <button type="button" className="btn-secondary" ref={cancelRef} onClick={onCancel} disabled={saving}>
            {t("common.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}

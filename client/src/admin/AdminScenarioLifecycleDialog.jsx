import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  archiveAdminScenario,
  getAdminScenarioLifecycle,
  permanentlyDeleteAdminScenario,
  restoreAdminScenario,
} from "./adminApi";
import { formatAdminDate } from "./adminDateFormat";
import {
  canConfirmScenarioDelete,
  normalizeScenarioLifecycle,
  SCENARIO_LIFECYCLE_COUNT_KEYS,
} from "./scenarioLifecycleState";

function DialogIcon({ type = "archive" }) {
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
  if (type === "restore") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
        <path d="M7 7H4v-3" />
        <path d="M5 7a8 8 0 1 1-1 7" />
        <path d="M12 8v5l3 2" />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
      <path d="M4 5.5h16l-1.4 4H5.4L4 5.5Z" />
      <path d="M6 9.5h12v8.8a1.7 1.7 0 0 1-1.7 1.7H7.7A1.7 1.7 0 0 1 6 18.3V9.5Z" />
      <path d="M8.5 13.5h7" />
    </svg>
  );
}

export default function AdminScenarioLifecycleDialog({
  dirty = false,
  onArchived,
  onCancel,
  onDeleted,
  onLifecycleChange,
  scenario,
  scenarioId,
}) {
  const { t } = useTranslation();
  const cancelRef = useRef(null);
  const tRef = useRef(t);
  const [lifecycle, setLifecycle] = useState(() => normalizeScenarioLifecycle(null));
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmationSlug, setConfirmationSlug] = useState("");

  const applyLifecycle = useCallback((value) => {
    const normalized = normalizeScenarioLifecycle(value);
    setLifecycle(normalized);
    onLifecycleChange?.(normalized);
  }, [onLifecycleChange]);

  useEffect(() => {
    tRef.current = t;
  }, [t]);

  const loadLifecycle = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    setError("");
    setConfirmationSlug("");
    setLifecycle(normalizeScenarioLifecycle(null));
    const result = await getAdminScenarioLifecycle(scenarioId);
    setLoading(false);
    if (!result.ok) {
      setLoadError(result.error || tRef.current("admin.scenarioLifecycle.errors.load"));
      return;
    }
    applyLifecycle(result.lifecycle);
  }, [applyLifecycle, scenarioId]);

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
    setLoading(true);
    setLoadError("");
    setError("");
    setConfirmationSlug("");
    setLifecycle(normalizeScenarioLifecycle(null));
    getAdminScenarioLifecycle(scenarioId).then(result => {
      if (!active) return;
      setLoading(false);
      if (!result.ok) {
        setLoadError(result.error || tRef.current("admin.scenarioLifecycle.errors.load"));
        return;
      }
      applyLifecycle(result.lifecycle);
    });
    return () => { active = false; };
  }, [applyLifecycle, scenarioId]);

  async function archive() {
    if (dirty) {
      setError(t("admin.scenarioLifecycle.errors.dirty"));
      return;
    }
    setSaving(true);
    setError("");
    const result = await archiveAdminScenario(scenarioId);
    setSaving(false);
    if (!result.ok) {
      setError(result.error || t("admin.scenarioLifecycle.errors.archive"));
      return;
    }
    onArchived?.(result.scenario);
    onCancel();
  }

  async function restore() {
    if (dirty) {
      setError(t("admin.scenarioLifecycle.errors.dirty"));
      return;
    }
    setSaving(true);
    setError("");
    const result = await restoreAdminScenario(scenarioId);
    setSaving(false);
    if (!result.ok) {
      setError(result.error || t("admin.scenarioLifecycle.errors.restore"));
      return;
    }
    onArchived?.(result.scenario);
    onCancel();
  }

  async function permanentDelete() {
    if (dirty) {
      setError(t("admin.scenarioLifecycle.errors.dirty"));
      return;
    }
    setSaving(true);
    setError("");
    const result = await permanentlyDeleteAdminScenario(scenarioId, confirmationSlug);
    setSaving(false);
    if (!result.ok) {
      setError(result.code === "ADMIN_SCENARIO_DELETE_CONFIRMATION_MISMATCH"
        ? t("admin.scenarioLifecycle.errors.slugMismatch")
        : result.code === "ADMIN_SCENARIO_DELETE_BLOCKED"
          ? t("admin.scenarioLifecycle.errors.notEligible")
          : (result.error || t("admin.scenarioLifecycle.errors.delete")));
      applyLifecycle(result.lifecycle || {
        ...lifecycle,
        canPermanentlyDelete: false,
        counts: result.counts || lifecycle.counts,
        blockingReasons: result.blockingReasons || lifecycle.blockingReasons,
      });
      return;
    }
    onDeleted?.(result.deletedScenario);
    onCancel();
  }

  const title = scenario?.title || lifecycle.title || scenario?.slug || lifecycle.slug;
  const slug = scenario?.slug || lifecycle.slug;
  const canDelete = canConfirmScenarioDelete({ lifecycle, slug, confirmationSlug });
  const firstPublished = lifecycle.firstPublishedAt
    ? formatAdminDate(lifecycle.firstPublishedAt)
    : t("admin.scenarioLifecycle.neverPublished");

  return (
    <div className="admin-confirm-backdrop" role="presentation">
      <div className="admin-confirm-dialog admin-lifecycle-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-scenario-lifecycle-title">
        <p className="res-tag">{t("admin.scenarioLifecycle.badge")}</p>
        <h3 id="admin-scenario-lifecycle-title">{lifecycle.canRestore ? t("admin.scenarioLifecycle.restoreDeleteTitle") : t("admin.scenarioLifecycle.archiveDeleteTitle")}</h3>
        <p>{t("admin.scenarioLifecycle.description")}</p>
        <p className="admin-confirm-resource">{title}</p>

        {loading ? (
          <p className="admin-resource-state" role="status">{t("admin.scenarioLifecycle.loading")}</p>
        ) : loadError ? (
          <div className="admin-lifecycle-error">
            <p className="field-error" role="alert">{loadError}</p>
            <button type="button" className="btn-secondary" onClick={loadLifecycle}>{t("common.retry")}</button>
          </div>
        ) : (
          <>
            <dl className="admin-lifecycle-counts">
              <div><dt>{t("admin.scenarioLifecycle.identity.slug")}</dt><dd>{slug || t("common.notSet")}</dd></div>
              <div><dt>{t("admin.scenarioLifecycle.identity.status")}</dt><dd>{t(`admin.scenarioManagement.status.${lifecycle.status}`, { defaultValue: lifecycle.status })}</dd></div>
              <div><dt>{t("admin.scenarioLifecycle.firstPublished")}</dt><dd>{firstPublished}</dd></div>
              <div><dt>{t("admin.scenarioLifecycle.availability")}</dt><dd>{lifecycle.status === "published" ? t("admin.scenarioLifecycle.learnerVisible") : t("admin.scenarioLifecycle.learnerHidden")}</dd></div>
            </dl>
            <div className="admin-lifecycle-operation-grid">
              {lifecycle.canArchive && (
                <section className="admin-lifecycle-operation">
                  <h4><DialogIcon />{t("admin.scenarioLifecycle.archiveTitle")}</h4>
                  <p>{t("admin.scenarioLifecycle.archiveDescription")}</p>
                  <button type="button" className="btn-secondary" onClick={archive} disabled={saving}>
                    {saving ? t("common.saving") : t("admin.scenarioLifecycle.archiveButton")}
                  </button>
                </section>
              )}
              {lifecycle.canRestore && (
                <section className="admin-lifecycle-operation">
                  <h4><DialogIcon type="restore" />{t("admin.scenarioLifecycle.restoreTitle")}</h4>
                  <p>{t("admin.scenarioLifecycle.restoreDescription")}</p>
                  <button type="button" className="btn-secondary" onClick={restore} disabled={saving}>
                    {saving ? t("common.saving") : t("admin.scenarioLifecycle.restoreButton")}
                  </button>
                </section>
              )}
              <section className="admin-lifecycle-operation danger">
                <h4><DialogIcon type="delete" />{t("admin.scenarioLifecycle.deleteTitle")}</h4>
                {lifecycle.canPermanentlyDelete ? (
                  <>
                    <p>{t("admin.scenarioLifecycle.deleteDescription")}</p>
                    <code className="admin-lifecycle-slug">{slug}</code>
                    <label className="admin-lifecycle-confirm-field">
                      <span>{t("admin.scenarioLifecycle.confirmSlugLabel")}</span>
                      <input value={confirmationSlug} onChange={event => setConfirmationSlug(event.target.value)} autoComplete="off" />
                    </label>
                    <button type="button" className="btn-danger-muted" onClick={permanentDelete} disabled={!canDelete || saving}>
                      {saving ? t("common.saving") : t("admin.scenarioLifecycle.deleteButton")}
                    </button>
                  </>
                ) : (
                  <>
                    <p>{t("admin.scenarioLifecycle.deleteUnavailableDescription")}</p>
                    {lifecycle.blockingReasons.length > 0 && (
                      <ul className="admin-lifecycle-reasons">
                        {lifecycle.blockingReasons.map(reason => (
                          <li key={reason.code}>{t(`admin.scenarioLifecycle.reasons.${reason.code}`, { count: reason.count || 0 })}</li>
                        ))}
                      </ul>
                    )}
                    <dl className="admin-lifecycle-counts">
                      {SCENARIO_LIFECYCLE_COUNT_KEYS.map(key => (
                        <div key={key}>
                          <dt>{t(`admin.scenarioLifecycle.counts.${key}`)}</dt>
                          <dd>{lifecycle.counts[key] ?? 0}</dd>
                        </div>
                      ))}
                    </dl>
                  </>
                )}
              </section>
            </div>
            {error && <p className="field-error" role="alert">{error}</p>}
          </>
        )}
        <div className="modal-actions">
          <button ref={cancelRef} type="button" className="modal-cancel" onClick={onCancel} disabled={saving}>{t("common.cancel")}</button>
        </div>
      </div>
    </div>
  );
}

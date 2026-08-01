import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getAdminResource,
  listAdminResources,
  updateAdminResourceGovernance,
} from "./adminApi";
import { formatAdminDate } from "./adminDateFormat";
import AdminQuickReviewActions from "./AdminQuickReviewActions";
import AdminResourceLifecycleDialog from "./AdminResourceLifecycleDialog";
import {
  getCyberGuardStatusDisplay,
  getPublicationStatusDisplay,
  getResourceRowActions,
  getReviewStatusDisplay,
} from "./resourceDisplayState";

const PUBLICATION_OPTIONS = ["", "published", "draft", "archived"];
const REVIEW_OPTIONS = ["", "approved", "needs_review", "draft", "rejected"];
const RAG_OPTIONS = ["", "true", "false"];

function StatusBadge({ children, tone = "neutral" }) {
  return <span className={`admin-status-badge ${tone}`}>{children}</span>;
}

function MetricCard({ label, value }) {
  return (
    <div className="admin-resource-metric">
      <p>{label}</p>
      <strong>{value ?? 0}</strong>
    </div>
  );
}

function labelFor(t, prefix, value) {
  if (!value) return t("common.notSet");
  return t(`${prefix}.${value}`, { defaultValue: value });
}

function displayLabel(t, display, fallback) {
  return t(display.labelKey, { defaultValue: fallback });
}

function formFromResource(resource) {
  return {
    publicationStatus: resource?.publicationStatus || "draft",
    reviewStatus: resource?.reviewStatus || "draft",
    ragReady: Boolean(resource?.ragReady),
    reviewNotes: resource?.reviewNotes || "",
    nextReviewAt: formatAdminDate(resource?.nextReviewAt, undefined, ""),
  };
}

function buildPayload(form, initial) {
  const payload = {};
  if (form.publicationStatus !== initial.publicationStatus) payload.publicationStatus = form.publicationStatus;
  if (form.reviewStatus !== initial.reviewStatus) payload.reviewStatus = form.reviewStatus;
  if (form.ragReady !== initial.ragReady) payload.ragReady = form.ragReady;
  if (form.reviewNotes !== initial.reviewNotes) payload.reviewNotes = form.reviewNotes;
  if (form.nextReviewAt !== initial.nextReviewAt) payload.nextReviewAt = form.nextReviewAt || null;
  return payload;
}

export default function AdminResourcePage({ initialQuickReviewId = null, requestHashNavigation }) {
  const { t } = useTranslation();
  const [filters, setFilters] = useState({
    search: "",
    publicationStatus: "",
    reviewStatus: "",
    ragReady: "",
    page: 1,
    pageSize: 20,
  });
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({});
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [form, setForm] = useState(null);
  const [saveState, setSaveState] = useState({ saving: false, message: "", error: "" });
  const [lifecycleDialogOpen, setLifecycleDialogOpen] = useState(false);

  const initialForm = useMemo(() => formFromResource(detail), [detail]);
  const dirty = Boolean(form && detail && Object.keys(buildPayload(form, initialForm)).length > 0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    listAdminResources(filters).then(result => {
      if (!active) return;
      if (result.ok) {
        setItems(result.items);
        setSummary(result.summary);
        setPagination(result.pagination);
        setError("");
      } else {
        setError(result.error || t("admin.resourceGovernance.errors.list"));
      }
      setLoading(false);
    });
    return () => { active = false; };
  }, [filters, t]);

  const openResource = useCallback(async (resourceId) => {
    setSelectedId(resourceId);
    setDetailLoading(true);
    setDetailError("");
    setSaveState({ saving: false, message: "", error: "" });
    setLifecycleDialogOpen(false);
    const result = await getAdminResource(resourceId);
    if (result.ok) {
      setDetail(result.resource);
      setForm(formFromResource(result.resource));
    } else {
      setDetail(null);
      setForm(null);
      setDetailError(result.error || t("admin.resourceGovernance.errors.detail"));
    }
    setDetailLoading(false);
  }, [t]);

  useEffect(() => {
    if (!initialQuickReviewId) return;
    openResource(initialQuickReviewId);
  }, [initialQuickReviewId, openResource]);

  const closeDrawer = useCallback(() => {
    setSelectedId(null);
    setDetail(null);
    setForm(null);
    setDetailError("");
    setLifecycleDialogOpen(false);
    setSaveState({ saving: false, message: "", error: "" });
  }, []);

  const openMetadataEditor = useCallback((resourceId) => {
    const navigate = () => {
      closeDrawer();
      if (requestHashNavigation) {
        requestHashNavigation(`/admin/resources/${resourceId}/metadata`);
      } else {
        window.location.hash = `/admin/resources/${resourceId}/metadata`;
      }
    };
    if (dirty) {
      requestHashNavigation?.(`/admin/resources/${resourceId}/metadata`, {
        guard: {
          title: t("admin.resourceGovernance.confirmation.discardTitle"),
          description: t("admin.resourceGovernance.confirmation.discardMessage"),
        },
      });
      return;
    }
    navigate();
  }, [closeDrawer, dirty, requestHashNavigation, t]);

  const openCreateResource = useCallback(() => {
    requestHashNavigation?.("/admin/resources/new");
  }, [requestHashNavigation]);

  const updateFilter = (field, value) => {
    setFilters(current => ({ ...current, [field]: value, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({ search: "", publicationStatus: "", reviewStatus: "", ragReady: "", page: 1, pageSize: 20 });
  };

  function updateForm(field, value) {
    setForm(current => ({ ...current, [field]: value }));
    setSaveState({ saving: false, message: "", error: "" });
  }

  async function save() {
    if (!detail || !form || !dirty) return;
    setSaveState({ saving: true, message: "", error: "" });
    const result = await updateAdminResourceGovernance(detail.id, buildPayload(form, initialForm));
    if (!result.ok) {
      setSaveState({ saving: false, message: "", error: result.error || t("admin.resourceGovernance.errors.save") });
      return;
    }
    setDetail(result.resource);
    setForm(formFromResource(result.resource));
    setSaveState({
      saving: false,
      message: result.automaticChanges?.includes("rag_ready_disabled")
        ? t("admin.resourceGovernance.savedWithRagDisabled")
        : t("admin.resourceGovernance.saved"),
      error: "",
    });
  }

  const rowActions = getResourceRowActions();

  return (
    <div className="admin-resource-governance" aria-labelledby="admin-resource-governance-title">
      <div className="admin-resource-header">
        <div>
          <p className="res-tag">{t("admin.resourceGovernance.badge")}</p>
          <h2 id="admin-resource-governance-title">{t("admin.resourceGovernance.title")}</h2>
          <p>{t("admin.resourceGovernance.description")}</p>
        </div>
        <button type="button" className="btn-primary" onClick={openCreateResource}>
          {t("admin.resourceCreate.createResource")}
        </button>
      </div>

      <div className="admin-resource-summary" aria-label={t("admin.resourceGovernance.summaryLabel")}>
        <MetricCard label={t("admin.resourceGovernance.metrics.total")} value={summary.total} />
        <MetricCard label={t("admin.resourceGovernance.metrics.published")} value={summary.published} />
        <MetricCard label={t("admin.resourceGovernance.metrics.needsReview")} value={summary.needsReview} />
        <MetricCard label={t("admin.resourceGovernance.metrics.approved")} value={summary.approved} />
        <MetricCard label={t("admin.resourceGovernance.metrics.ragReady")} value={summary.ragReady} />
        <MetricCard label={t("admin.resourceGovernance.metrics.effectivelyEligible")} value={summary.effectivelyRagEligible} />
      </div>
      <p className="admin-resource-summary-note">{t("admin.resourceGovernance.summaryScope")}</p>

      <div className="admin-resource-filters">
        <label>
          <span>{t("admin.resourceGovernance.filters.search")}</span>
          <input
            value={filters.search}
            onChange={event => updateFilter("search", event.target.value)}
            placeholder={t("admin.resourceGovernance.filters.searchPlaceholder")}
          />
        </label>
        <label>
          <span>{t("admin.resourceGovernance.filters.publicationStatus")}</span>
          <select value={filters.publicationStatus} onChange={event => updateFilter("publicationStatus", event.target.value)}>
            {PUBLICATION_OPTIONS.map(option => (
              <option key={option || "all"} value={option}>{option ? labelFor(t, "admin.resourceGovernance.publicationStatus", option) : t("admin.resourceGovernance.filters.all")}</option>
            ))}
          </select>
        </label>
        <label>
          <span>{t("admin.resourceGovernance.filters.reviewStatus")}</span>
          <select value={filters.reviewStatus} onChange={event => updateFilter("reviewStatus", event.target.value)}>
            {REVIEW_OPTIONS.map(option => (
              <option key={option || "all"} value={option}>{option ? labelFor(t, "admin.resourceGovernance.reviewStatus", option) : t("admin.resourceGovernance.filters.all")}</option>
            ))}
          </select>
        </label>
        <label>
          <span>{t("admin.resourceGovernance.filters.ragReady")}</span>
          <select value={filters.ragReady} onChange={event => updateFilter("ragReady", event.target.value)}>
            {RAG_OPTIONS.map(option => (
              <option key={option || "all"} value={option}>
                {option === "" ? t("admin.resourceGovernance.filters.all") : option === "true" ? t("admin.resourceGovernance.flags.ragReady") : t("admin.resourceGovernance.flags.notRagReady")}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="btn-secondary" onClick={clearFilters}>{t("admin.resourceGovernance.filters.clear")}</button>
      </div>

      {loading ? (
        <p className="admin-resource-state">{t("admin.resourceGovernance.loading")}</p>
      ) : error ? (
        <p className="field-error" role="alert">{error}</p>
      ) : items.length === 0 ? (
        <p className="admin-resource-state">{t("admin.resourceGovernance.empty")}</p>
      ) : (
        <div className="admin-resource-table-wrap" tabIndex={0} aria-label={t("admin.resourceGovernance.table.scrollLabel")}>
          <table className="admin-resource-table">
            <thead>
              <tr>
                <th>{t("admin.resourceGovernance.table.resource")}</th>
                <th>{t("admin.resourceGovernance.table.category")}</th>
                <th>{t("admin.resourceGovernance.table.publication")}</th>
                <th>{t("admin.resourceGovernance.table.review")}</th>
                <th>{t("admin.resourceGovernance.table.rag")}</th>
                <th>{t("admin.resourceGovernance.table.updated")}</th>
                <th>{t("admin.resourceGovernance.table.action")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map(resource => (
                <tr key={resource.id}>
                  <td>
                    <strong>{resource.title}</strong>
                    <span>{resource.slug}</span>
                  </td>
                  <td>{resource.displayCategory || resource.category}</td>
                  <td>
                    {(() => {
                      const display = getPublicationStatusDisplay(resource.publicationStatus);
                      return <StatusBadge tone={display.tone}>{displayLabel(t, display, resource.publicationStatus)}</StatusBadge>;
                    })()}
                  </td>
                  <td>
                    {(() => {
                      const display = getReviewStatusDisplay(resource.reviewStatus);
                      return <StatusBadge tone={display.tone}>{displayLabel(t, display, resource.reviewStatus)}</StatusBadge>;
                    })()}
                  </td>
                  <td>
                    {(() => {
                      const display = getCyberGuardStatusDisplay(resource.effectiveRagEligible);
                      return <StatusBadge tone={display.tone}>{displayLabel(t, display, "")}</StatusBadge>;
                    })()}
                  </td>
                  <td>{formatAdminDate(resource.updatedAt, undefined, t("common.notSet"))}</td>
                  <td>
                    <div className="admin-resource-row-actions">
                      {rowActions.map(action => (
                        action.id === "quickReview" ? (
                          <button key={action.id} type="button" className="btn-secondary" onClick={() => openResource(resource.id)}>
                            {t(action.labelKey)}
                          </button>
                        ) : (
                          <button key={action.id} type="button" className="btn-primary" onClick={() => openMetadataEditor(resource.id)}>
                            {t(action.labelKey)}
                          </button>
                        )
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="admin-resource-pagination">
        {t("admin.resourceGovernance.pagination", {
          page: pagination.page || 1,
          totalPages: pagination.totalPages || 1,
          totalItems: pagination.totalItems || 0,
        })}
      </p>

      {selectedId && (
        <div className="admin-resource-drawer-backdrop" role="presentation" onMouseDown={event => {
          if (event.target === event.currentTarget) closeDrawer();
        }}>
          <aside className="admin-resource-drawer" aria-label={t("admin.resourceGovernance.drawerLabel")} aria-modal="true" role="dialog">
            <div className="admin-resource-drawer-head">
              <div>
                <p className="res-tag">{t("admin.resourceGovernance.drawerBadge")}</p>
                <h3>{detail?.title || t("admin.resourceGovernance.loading")}</h3>
              </div>
              <button type="button" className="btn-secondary" onClick={closeDrawer}>{t("common.close")}</button>
            </div>

            {detailLoading ? (
              <p className="admin-resource-state">{t("admin.resourceGovernance.loadingDetail")}</p>
            ) : detailError ? (
              <p className="field-error" role="alert">{detailError}</p>
            ) : detail && form ? (
              <div className="admin-resource-drawer-body">
                <AdminQuickReviewActions
                  lifecycleLabelKey="admin.resourceLifecycle.archiveOrDelete"
                  onEdit={() => openMetadataEditor(detail.id)}
                  onLifecycle={() => setLifecycleDialogOpen(true)}
                />

                <section>
                  <h4>{t("admin.resourceGovernance.detail.overview")}</h4>
                  <p><strong>{detail.slug}</strong></p>
                  <p>{detail.summary || t("common.notSet")}</p>
                  <dl className="admin-lifecycle-counts">
                    <div><dt>{t("admin.resourceGovernance.filters.publicationStatus")}</dt><dd>{labelFor(t, "admin.resourceGovernance.publicationStatus", detail.publicationStatus)}</dd></div>
                    <div><dt>{t("admin.resourceGovernance.filters.reviewStatus")}</dt><dd>{labelFor(t, "admin.resourceGovernance.reviewStatus", detail.reviewStatus)}</dd></div>
                    <div><dt>{t("admin.resourceLifecycle.cyberGuardStatus")}</dt><dd>{detail.effectiveRagEligible ? t("admin.resourceGovernance.flags.cyberGuardEnabled") : t("admin.resourceGovernance.flags.cyberGuardDisabled")}</dd></div>
                  </dl>
                </section>

                <section>
                  <h4>{t("admin.resourceGovernance.detail.source")}</h4>
                  <p>{detail.sourceLabel || t("common.notSet")}</p>
                  <p>{detail.sourceType || t("common.notSet")} / {detail.sourceCountry || t("common.notSet")} / {detail.sourceAuthorityLevel || t("common.notSet")}</p>
                  <p>{t("admin.resourceGovernance.detail.retrievableChunks", { count: detail.retrievableChunkCount || 0 })}</p>
                </section>

                <section className="admin-resource-form">
                  <h4>{t("admin.resourceGovernance.detail.controls")}</h4>
                  <label>
                    <span>{t("admin.resourceGovernance.filters.publicationStatus")}</span>
                    <select value={form.publicationStatus} onChange={event => updateForm("publicationStatus", event.target.value)}>
                      {PUBLICATION_OPTIONS.filter(Boolean).map(option => <option key={option} value={option}>{labelFor(t, "admin.resourceGovernance.publicationStatus", option)}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>{t("admin.resourceGovernance.filters.reviewStatus")}</span>
                    <select value={form.reviewStatus} onChange={event => updateForm("reviewStatus", event.target.value)}>
                      {REVIEW_OPTIONS.filter(Boolean).map(option => <option key={option} value={option}>{labelFor(t, "admin.resourceGovernance.reviewStatus", option)}</option>)}
                    </select>
                  </label>
                  <label className="admin-resource-checkbox">
                    <input type="checkbox" checked={form.ragReady} onChange={event => updateForm("ragReady", event.target.checked)} />
                    <span>{t("admin.resourceGovernance.fields.ragReady")}</span>
                  </label>
                  <label>
                    <span>{t("admin.resourceGovernance.fields.nextReviewAt")}</span>
                    <input type="date" value={form.nextReviewAt} onChange={event => updateForm("nextReviewAt", event.target.value)} />
                  </label>
                  <label>
                    <span>{t("admin.resourceGovernance.fields.reviewNotes")}</span>
                    <textarea rows={5} value={form.reviewNotes} onChange={event => updateForm("reviewNotes", event.target.value)} />
                  </label>
                </section>

                {saveState.error && <p className="field-error" role="alert">{saveState.error}</p>}
                {saveState.message && <p className="admin-resource-success" role="status">{saveState.message}</p>}

                <div className="admin-resource-drawer-actions">
                  <button type="button" className="btn-secondary" onClick={() => setForm(initialForm)} disabled={!dirty || saveState.saving}>{t("admin.resourceEditor.reset")}</button>
                  <button type="button" className="btn-primary" onClick={save} disabled={!dirty || saveState.saving}>{saveState.saving ? t("common.saving") : t("common.save")}</button>
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      )}

      {lifecycleDialogOpen && detail && (
        <AdminResourceLifecycleDialog
          resource={detail}
          resourceId={detail.id}
          onArchived={(resource) => {
            setDetail(resource);
            setForm(formFromResource(resource));
            setItems(current => current.map(item => Number(item.id) === Number(resource.id) ? { ...item, ...resource } : item));
          }}
          onDeleted={() => {
            closeDrawer();
            setItems(current => current.filter(item => Number(item.id) !== Number(detail.id)));
          }}
          onCancel={() => setLifecycleDialogOpen(false)}
        />
      )}
    </div>
  );
}

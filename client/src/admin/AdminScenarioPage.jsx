import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getAdminScenario, listAdminScenarios } from "./adminApi";
import { formatAdminDate } from "./adminDateFormat";
import AdminQuickReviewActions from "./AdminQuickReviewActions";
import AdminScenarioLifecycleDialog from "./AdminScenarioLifecycleDialog";

const STATUS_OPTIONS = ["", "published", "draft", "archived"];
const TOPIC_OPTIONS = ["", "phishing_and_scams", "password_and_account_security", "privacy_and_personal_information", "misinformation_and_deepfakes"];
const DIFFICULTY_OPTIONS = ["", "beginner", "developing", "intermediate", "advanced"];

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

function statusTone(status) {
  if (status === "published") return "publication-published";
  if (status === "archived") return "publication-archived";
  return "publication-draft";
}

export default function AdminScenarioPage({ requestHashNavigation }) {
  const { t } = useTranslation();
  const [filters, setFilters] = useState({ search: "", status: "", topicCode: "", difficulty: "", page: 1, pageSize: 20 });
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({});
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const [lifecycleTarget, setLifecycleTarget] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    listAdminScenarios(filters).then(result => {
      if (!active) return;
      if (result.ok) {
        setItems(result.items);
        setSummary(result.summary);
        setPagination(result.pagination);
        setError("");
      } else {
        setError(result.error || t("admin.scenarioManagement.errors.list"));
      }
      setLoading(false);
    });
    return () => { active = false; };
  }, [filters, reloadToken, t]);

  const openScenario = useCallback(async (scenarioId) => {
    setSelectedId(scenarioId);
    setDetailLoading(true);
    setDetailError("");
    const result = await getAdminScenario(scenarioId);
    if (result.ok) {
      setDetail({ scenario: result.scenario, steps: result.steps });
    } else {
      setDetail(null);
      setDetailError(result.error || t("admin.scenarioManagement.errors.detail"));
    }
    setDetailLoading(false);
  }, [t]);

  const updateFilter = (field, value) => {
    setFilters(current => ({ ...current, [field]: value, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({ search: "", status: "", topicCode: "", difficulty: "", page: 1, pageSize: 20 });
  };

  const closeDrawer = () => {
    setSelectedId(null);
    setDetail(null);
    setDetailError("");
  };

  const openEditor = (scenarioId) => {
    requestHashNavigation?.(`/admin/scenarios/${scenarioId}/edit`);
  };

  const openLifecycle = (scenario) => {
    if (!scenario) return;
    setLifecycleTarget(scenario);
  };

  const handleLifecycleChanged = (nextScenario) => {
    if (!nextScenario) return;
    setItems(current => current.map(item => item.id === nextScenario.id ? { ...item, ...nextScenario } : item));
    setDetail(current => {
      if (!current?.scenario || current.scenario.id !== nextScenario.id) return current;
      return { ...current, scenario: { ...current.scenario, ...nextScenario } };
    });
    setReloadToken(current => current + 1);
  };

  const handleScenarioDeleted = (deletedScenario) => {
    const deletedId = deletedScenario?.id || lifecycleTarget?.id;
    setLifecycleTarget(null);
    setItems(current => current.filter(item => item.id !== deletedId));
    if (selectedId === deletedId) closeDrawer();
    setReloadToken(current => current + 1);
  };

  return (
    <div className="admin-resource-governance" aria-labelledby="admin-scenario-management-title">
      <div className="admin-resource-header">
        <div>
          <p className="res-tag">{t("admin.scenarioManagement.badge")}</p>
          <h2 id="admin-scenario-management-title">{t("admin.scenarioManagement.title")}</h2>
          <p>{t("admin.scenarioManagement.description")}</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => requestHashNavigation?.("/admin/scenarios/new")}>
          {t("admin.scenarioManagement.create")}
        </button>
      </div>

      {!loading && !error && (
        <div className="admin-resource-summary" aria-label={t("admin.scenarioManagement.summaryLabel")}>
          <MetricCard label={t("admin.scenarioManagement.metrics.total")} value={summary.total} />
          <MetricCard label={t("admin.scenarioManagement.metrics.published")} value={summary.published} />
          <MetricCard label={t("admin.scenarioManagement.metrics.draft")} value={summary.draft} />
          <MetricCard label={t("admin.scenarioManagement.metrics.archived")} value={summary.archived} />
          <MetricCard label={t("admin.scenarioManagement.metrics.incomplete")} value={summary.incomplete} />
        </div>
      )}

      <div className="admin-resource-filters">
        <label>
          <span>{t("admin.scenarioManagement.filters.search")}</span>
          <input value={filters.search} onChange={event => updateFilter("search", event.target.value)} placeholder={t("admin.scenarioManagement.filters.searchPlaceholder")} />
        </label>
        <label>
          <span>{t("admin.scenarioManagement.filters.status")}</span>
          <select value={filters.status} onChange={event => updateFilter("status", event.target.value)}>
            {STATUS_OPTIONS.map(option => <option key={option || "all"} value={option}>{option ? t(`admin.scenarioManagement.status.${option}`) : t("admin.scenarioManagement.filters.all")}</option>)}
          </select>
        </label>
        <label>
          <span>{t("admin.scenarioManagement.filters.topic")}</span>
          <select value={filters.topicCode} onChange={event => updateFilter("topicCode", event.target.value)}>
            {TOPIC_OPTIONS.map(option => <option key={option || "all"} value={option}>{option ? t(`topics.${option}`) : t("admin.scenarioManagement.filters.all")}</option>)}
          </select>
        </label>
        <label>
          <span>{t("admin.scenarioManagement.filters.difficulty")}</span>
          <select value={filters.difficulty} onChange={event => updateFilter("difficulty", event.target.value)}>
            {DIFFICULTY_OPTIONS.map(option => <option key={option || "all"} value={option}>{option ? t(`levels.${option}`) : t("admin.scenarioManagement.filters.all")}</option>)}
          </select>
        </label>
        <button type="button" className="btn-secondary" onClick={clearFilters}>{t("admin.scenarioManagement.filters.clear")}</button>
      </div>

      {loading ? (
        <p className="admin-resource-state" role="status">{t("admin.scenarioManagement.loading")}</p>
      ) : error ? (
        <div className="admin-resource-editor-empty">
          <p className="field-error" role="alert">{error}</p>
          <button type="button" className="btn-secondary" onClick={() => setReloadToken(current => current + 1)}>{t("common.retry")}</button>
        </div>
      ) : items.length === 0 ? (
        <p className="admin-resource-state">{t("admin.scenarioManagement.empty")}</p>
      ) : (
        <div className="admin-resource-table-wrap" tabIndex={0} aria-label={t("admin.scenarioManagement.table.scrollLabel")}>
          <table className="admin-resource-table">
            <thead>
              <tr>
                <th>{t("admin.scenarioManagement.table.scenario")}</th>
                <th>{t("admin.scenarioManagement.table.topic")}</th>
                <th>{t("admin.scenarioManagement.table.difficulty")}</th>
                <th>{t("admin.scenarioManagement.table.status")}</th>
                <th>{t("admin.scenarioManagement.table.updated")}</th>
                <th>{t("admin.scenarioManagement.table.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.title}</strong>
                    <span>{item.slug}</span>
                    <span className={`admin-scenario-structure-badge ${item.structuralValidation?.valid ? "ready" : "needs-work"}`}>
                      {item.structuralValidation?.valid ? t("admin.scenarioManagement.structure.ready") : t("admin.scenarioManagement.structure.needsWork")}
                    </span>
                  </td>
                  <td>{t(`topics.${item.topicCode}`)}</td>
                  <td>{t(`levels.${item.difficulty}`)}</td>
                  <td><StatusBadge tone={statusTone(item.status)}>{t(`admin.scenarioManagement.status.${item.status}`)}</StatusBadge></td>
                  <td>{formatAdminDate(item.updatedAt)}</td>
                  <td>
                    <div className="admin-resource-row-actions">
                      <button type="button" className="btn-secondary" onClick={() => openScenario(item.id)}>{t("admin.scenarioManagement.quickReview")}</button>
                      <button type="button" className="btn-primary" onClick={() => openEditor(item.id)}>{t("admin.scenarioManagement.edit")}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="admin-resource-pagination">{t("admin.scenarioManagement.pagination", { page: pagination.page || 1, totalPages: pagination.totalPages || 1 })}</p>

      {selectedId && (
        <div className="admin-resource-drawer-backdrop" role="presentation" onMouseDown={event => {
          if (event.target === event.currentTarget) closeDrawer();
        }}>
          <aside className="admin-resource-drawer" aria-label={t("admin.scenarioManagement.drawerLabel")} aria-modal="true" role="dialog">
            <div className="admin-resource-drawer-head">
              <div>
                <p className="res-tag">{t("admin.scenarioManagement.quickReview")}</p>
                <h3>{detail?.scenario?.title || t("admin.scenarioManagement.preview")}</h3>
              </div>
              <div className="admin-resource-drawer-top-actions">
                <button type="button" className="btn-secondary" onClick={closeDrawer}>{t("common.close")}</button>
              </div>
            </div>
            {detailLoading ? (
              <p className="admin-resource-state" role="status">{t("admin.scenarioManagement.loadingDetail")}</p>
            ) : detailError ? (
              <p className="field-error" role="alert">{detailError}</p>
            ) : detail ? (
              <div className="admin-resource-drawer-body">
                <AdminQuickReviewActions
                  editLabelKey="admin.scenarioManagement.edit"
                  lifecycleLabelKey="admin.scenarioLifecycle.archiveOrDelete"
                  onEdit={() => openEditor(selectedId)}
                  onLifecycle={() => openLifecycle(detail.scenario)}
                />
                <section>
                  <h4>{t("admin.scenarioManagement.previewHeading")}</h4>
                  <p>{detail.scenario.summary}</p>
                  <div className="admin-scenario-preview-metadata">
                    <span>{t(`topics.${detail.scenario.topicCode}`)}</span>
                    <span>{t(`levels.${detail.scenario.difficulty}`)}</span>
                    <span>{t("admin.scenarioManagement.minutes", { count: detail.scenario.estimatedMinutes })}</span>
                    <span>{t("admin.scenarioManagement.updatedAt", { date: formatAdminDate(detail.scenario.updatedAt) })}</span>
                    <span>{t("admin.scenarioEditor.attempts", { count: detail.scenario.attemptCount || 0 })}</span>
                    <span>{detail.scenario.structuralValidation?.valid ? t("admin.scenarioManagement.structure.ready") : t("admin.scenarioManagement.structure.needsWork")}</span>
                  </div>
                </section>
                <section>
                  <h4>{t("admin.scenarioManagement.stepsHeading")}</h4>
                  <ol>
                    {detail.steps.map(step => (
                      <li key={step.id || step.stepOrder}>
                        <strong>{step.promptText}</strong>
                        <p>{step.situationText}</p>
                      </li>
                    ))}
                  </ol>
                </section>
              </div>
            ) : null}
          </aside>
        </div>
      )}
      {lifecycleTarget && (
        <AdminScenarioLifecycleDialog
          onArchived={handleLifecycleChanged}
          onCancel={() => setLifecycleTarget(null)}
          onDeleted={handleScenarioDeleted}
          scenario={lifecycleTarget}
          scenarioId={lifecycleTarget.id}
        />
      )}
    </div>
  );
}

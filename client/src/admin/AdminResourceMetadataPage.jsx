import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getAdminResourceMetadata,
  getAdminResourceOptions,
  updateAdminResourceMetadata,
} from "./adminApi";
import AdminResourceActions from "./AdminResourceActions";
import AdminResourceSourceForm from "./AdminResourceSourceForm";
import {
  createMetadataSnapshot,
  isFormDirty,
  normalizeMetadataFormValues,
} from "./resourceFormState";

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function formFromResource(resource) {
  return normalizeMetadataFormValues({
    categoryCode: resource?.categoryCode || "Scams",
    sourceLabel: resource?.sourceLabel || "",
    sourceUrl: resource?.sourceUrl || "",
    sourceType: resource?.sourceType || "",
    sourceCountry: resource?.sourceCountry || "",
    sourceAuthorityLevel: resource?.sourceAuthorityLevel || "",
    lastSourceCheckedAt: resource?.lastSourceCheckedAt || "",
    replacementSourceNeeded: Boolean(resource?.replacementSourceNeeded),
    ageAppropriateness: resource?.ageAppropriateness || "",
    sensitiveTopicFlag: Boolean(resource?.sensitiveTopicFlag),
    malaysiaGuidanceFlag: Boolean(resource?.malaysiaGuidanceFlag),
  });
}

function buildMetadataPayload(form, initial, expectedUpdatedAt) {
  const payload = { expectedUpdatedAt };
  for (const key of Object.keys(form)) {
    if (form[key] !== initial[key]) payload[key] = form[key] === "" ? null : form[key];
  }
  return payload;
}

export default function AdminResourceMetadataPage({
  registerActivityGuard,
  requestGuardedAction,
  requestHashNavigation,
  resourceId,
}) {
  const { t } = useTranslation();
  const [options, setOptions] = useState({ categories: [] });
  const [resource, setResource] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formStatus, setFormStatus] = useState("idle");
  const [error, setError] = useState("");
  const [saveState, setSaveState] = useState({ saving: false, message: "", error: "" });

  const initialForm = useMemo(() => formFromResource(resource), [resource]);
  const currentSnapshot = useMemo(() => createMetadataSnapshot(form || {}), [form]);
  const savedSnapshot = useMemo(() => createMetadataSnapshot(initialForm), [initialForm]);
  const dirty = Boolean(form && resource && isFormDirty({
    status: formStatus,
    currentSnapshot,
    savedSnapshot,
  }));

  useEffect(() => {
    let active = true;
    setLoading(true);
    setFormStatus("loading");
    setError("");
    Promise.all([getAdminResourceMetadata(resourceId), getAdminResourceOptions()]).then(([resourceResult, optionsResult]) => {
      if (!active) return;
      if (!resourceResult.ok) {
        setError(resourceResult.error || t("admin.resourceMetadata.errors.load"));
        setResource(null);
        setForm(null);
        setFormStatus("error");
      } else {
        setFormStatus("hydrating");
        setResource(resourceResult.resource);
        setForm(formFromResource(resourceResult.resource));
        setFormStatus("ready");
      }
      if (optionsResult.ok) setOptions(optionsResult);
      setLoading(false);
    });
    return () => { active = false; };
  }, [resourceId, t]);

  useEffect(() => {
    if (!dirty || !registerActivityGuard) return undefined;
    return registerActivityGuard({
      source: "resource-metadata",
      key: `resource-metadata:${resourceId}`,
      title: t("admin.resourceMetadata.unsavedTitle"),
      description: t("admin.resourceMetadata.unsavedMessage"),
      logoutDescription: t("admin.resourceMetadata.unsavedLogoutMessage"),
      cancelLabel: t("admin.resourceEditor.continueEditing"),
      confirmLabel: t("admin.resourceEditor.discardChanges"),
    });
  }, [dirty, registerActivityGuard, resourceId, t]);

  function updateForm(field, value) {
    setForm(current => ({ ...current, [field]: value }));
    setSaveState({ saving: false, message: "", error: "" });
  }

  function reset() {
    setForm(initialForm);
    setSaveState({ saving: false, message: "", error: "" });
  }

  async function save() {
    if (!resource || !form || !dirty) return;
    setSaveState({ saving: true, message: "", error: "" });
    setFormStatus("saving");
    const result = await updateAdminResourceMetadata(resourceId, buildMetadataPayload(form, initialForm, resource.updatedAt));
    if (!result.ok) {
      setSaveState({
        saving: false,
        message: "",
        error: result.code === "ADMIN_RESOURCE_METADATA_STALE"
          ? t("admin.resourceMetadata.errors.stale")
          : (result.error || t("admin.resourceMetadata.errors.save")),
      });
      setFormStatus("ready");
      return;
    }
    setResource(result.resource);
    setForm(formFromResource(result.resource));
    setSaveState({ saving: false, message: t("admin.resourceMetadata.saved"), error: "" });
    setFormStatus("ready");
  }

  if (loading) {
    return <p className="admin-resource-state" role="status">{t("admin.resourceMetadata.loading")}</p>;
  }

  if (error || !resource || !form) {
    return (
      <div className="admin-resource-editor-empty">
        <p className="field-error" role="alert">{error || t("admin.resourceMetadata.errors.load")}</p>
        <button type="button" className="btn-secondary" onClick={() => requestHashNavigation?.("/admin/resources")}>
          {t("admin.resourceEditor.backToResources")}
        </button>
      </div>
    );
  }

  const categoryLabel = options.categories?.find(category => category.code === form.categoryCode)?.label || form.categoryCode;

  return (
    <div className="admin-resource-metadata">
      <AdminResourceActions
        currentSection="metadata"
        onArchived={setResource}
        onDeleted={() => requestHashNavigation?.("/admin/resources", { replace: true, bypassGuard: true })}
        requestGuardedAction={requestGuardedAction}
        requestHashNavigation={requestHashNavigation}
        resource={resource}
        resourceId={resourceId}
      />

      {dirty && <span className="admin-resource-editor-dirty">{t("admin.resourceEditor.unsavedChanges")}</span>}

      <div className="admin-resource-form">
        <section>
          <h3>{t("admin.resourceCreate.classification")}</h3>
          <label>
            <span>{t("admin.resourceCreate.classification")}</span>
            <select value={form.categoryCode} onChange={event => updateForm("categoryCode", event.target.value)}>
              {(options.categories || []).map(category => (
                <option key={category.code} value={category.code}>{category.label}</option>
              ))}
            </select>
          </label>
          <p className="admin-resource-summary-note">{categoryLabel}</p>
        </section>
      </div>

      <AdminResourceSourceForm
        form={form}
        onChange={updateForm}
        onMarkCheckedToday={() => updateForm("lastSourceCheckedAt", todayIsoDate())}
        options={options}
      />

      {saveState.error && <p className="field-error" role="alert">{saveState.error}</p>}
      {saveState.message && <p className="admin-resource-success" role="status">{saveState.message}</p>}

      <div className="admin-resource-create-actions">
        <button type="button" className="btn-secondary" onClick={reset} disabled={!dirty || saveState.saving}>
          {t("admin.resourceEditor.reset")}
        </button>
        <button type="button" className="btn-primary" onClick={save} disabled={!dirty || saveState.saving}>
          {saveState.saving ? t("common.saving") : t("admin.resourceMetadata.saveMetadata")}
        </button>
      </div>
    </div>
  );
}

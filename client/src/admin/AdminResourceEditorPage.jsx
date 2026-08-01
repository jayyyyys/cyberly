import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getAdminResourceContent, publishAdminResource, unpublishAdminResource, updateAdminResourceContent } from "./adminApi";
import { buildTranslationCoverage, getResourcePublishReadiness } from "./adminContentState";
import AdminPublicationControl from "./AdminPublicationControl";
import AdminResourceActions from "./AdminResourceActions";
import AdminResourceContentForm from "./AdminResourceContentForm";
import AdminResourceLanguageTabs, { localeLabel, RESOURCE_EDITOR_LOCALES } from "./AdminResourceLanguageTabs";
import AdminResourceLearnerPreview from "./AdminResourceLearnerPreview";
import AdminTranslationCoverage from "./AdminTranslationCoverage";
import {
  createContentSnapshot,
  isFormDirty,
  normalizeContentFormValues,
} from "./resourceFormState";

function emptyTranslation(locale) {
  return {
    locale,
    title: "",
    summary: "",
    body: "",
    updatedAt: null,
    exists: false,
  };
}

function formFromTranslation(locale, translation) {
  const item = translation || emptyTranslation(locale);
  const normalized = normalizeContentFormValues(locale, item);
  return {
    title: normalized.title,
    summary: normalized.summary,
    body: normalized.body,
  };
}

function validateForm(t, form) {
  const errors = {};
  if (!form.title.trim()) errors.title = t("admin.resourceEditor.validation.titleRequired");
  if (form.title.trim().length > 180) errors.title = t("admin.resourceEditor.validation.titleTooLong", { max: 180 });
  if (!form.summary.trim()) errors.summary = t("admin.resourceEditor.validation.summaryRequired");
  if (form.summary.trim().length > 500) errors.summary = t("admin.resourceEditor.validation.summaryTooLong", { max: 500 });
  if (!form.body.trim()) errors.body = t("admin.resourceEditor.validation.bodyRequired");
  if (form.body.trim().length > 24000) errors.body = t("admin.resourceEditor.validation.bodyTooLong", { max: 24000 });
  return errors;
}

export default function AdminResourceEditorPage({
  registerActivityGuard,
  requestGuardedAction,
  requestHashNavigation,
  resourceId,
}) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [formStatus, setFormStatus] = useState("idle");
  const [error, setError] = useState("");
  const [resource, setResource] = useState(null);
  const [translations, setTranslations] = useState({});
  const [activeLocale, setActiveLocale] = useState("en");
  const [form, setForm] = useState(emptyTranslation("en"));
  const [saveState, setSaveState] = useState({ saving: false, message: "", error: "" });
  const [validationErrors, setValidationErrors] = useState({});

  const activeTranslation = translations[activeLocale] || null;
  const savedForm = useMemo(() => formFromTranslation(activeLocale, activeTranslation), [activeLocale, activeTranslation]);
  const currentSnapshot = useMemo(() => createContentSnapshot({ locale: activeLocale, ...form }), [activeLocale, form]);
  const savedSnapshot = useMemo(() => createContentSnapshot({ locale: activeLocale, ...savedForm }), [activeLocale, savedForm]);
  const dirty = isFormDirty({
    status: formStatus,
    currentSnapshot,
    savedSnapshot,
  });
  const coverage = useMemo(() => buildTranslationCoverage({
    type: "resource",
    translations,
    dirtyLocale: dirty ? activeLocale : null,
  }), [activeLocale, dirty, translations]);
  const publishReadiness = useMemo(() => getResourcePublishReadiness(resource, translations), [resource, translations]);

  useEffect(() => {
    if (!dirty || !registerActivityGuard) return undefined;
    return registerActivityGuard({
      source: "resource-content",
      resourceId,
      locale: activeLocale,
      key: `resource-content:${resourceId}:${activeLocale}`,
      title: t("admin.resourceEditor.discardTitle"),
      description: t("admin.resourceEditor.discardLocaleMessage", { locale: localeLabel(t, activeLocale) }),
      logoutDescription: t("admin.resourceEditor.logoutMessage"),
      messageKey: "admin.resourceEditor.discardLocaleMessage",
    });
  }, [activeLocale, dirty, registerActivityGuard, resourceId, t]);

  const load = useCallback(async () => {
    setLoading(true);
    setFormStatus("loading");
    setError("");
    const result = await getAdminResourceContent(resourceId);
    if (!result.ok) {
      setResource(null);
      setTranslations({});
      setError(result.error || t("admin.resourceEditor.errors.load"));
      setLoading(false);
      setFormStatus("error");
      return;
    }
    setFormStatus("hydrating");
    setResource(result.resource);
    setTranslations(result.translations || {});
    const nextLocale = RESOURCE_EDITOR_LOCALES.includes(activeLocale) ? activeLocale : "en";
    setForm(formFromTranslation(nextLocale, result.translations?.[nextLocale]));
    setSaveState({ saving: false, message: "", error: "" });
    setValidationErrors({});
    setLoading(false);
    setFormStatus("ready");
  }, [activeLocale, resourceId, t]);

  useEffect(() => {
    load();
  }, [load]);

  const switchLocale = (locale) => {
    if (locale === activeLocale) return;
    const perform = () => {
      setActiveLocale(locale);
      setForm(formFromTranslation(locale, translations[locale]));
      setValidationErrors({});
      setSaveState({ saving: false, message: "", error: "" });
    };
    if (dirty) {
      requestGuardedAction?.(perform, {
        actionType: "locale-switch",
        guard: {
          key: `resource-content:${resourceId}:${activeLocale}`,
          title: t("admin.resourceEditor.discardTitle"),
          description: t("admin.resourceEditor.discardLocaleMessage", { locale: localeLabel(t, activeLocale) }),
        },
      });
      return;
    }
    perform();
  };

  const goBack = () => {
    requestHashNavigation?.("/admin/resources", {
      guard: {
        title: t("admin.resourceEditor.discardTitle"),
        description: t("admin.resourceEditor.discardBackMessage", { locale: localeLabel(t, activeLocale) }),
      },
    });
  };

  const reset = () => {
    setForm(savedForm);
    setValidationErrors({});
    setSaveState({ saving: false, message: "", error: "" });
  };

  const save = async () => {
    const errors = validateForm(t, form);
    setValidationErrors(errors);
    if (Object.keys(errors).length) return;

    setSaveState({ saving: true, message: "", error: "" });
    setFormStatus("saving");
    const result = await updateAdminResourceContent(resourceId, {
      locale: activeLocale,
      title: form.title,
      summary: form.summary,
      body: form.body,
      expectedUpdatedAt: activeTranslation?.updatedAt || null,
    });

    if (!result.ok) {
      const stale = result.code === "ADMIN_RESOURCE_CONTENT_STALE";
      setSaveState({
        saving: false,
        message: "",
        error: stale ? t("admin.resourceEditor.errors.stale") : (result.error || t("admin.resourceEditor.errors.save")),
      });
      setFormStatus("ready");
      return;
    }

    setResource(result.resource || resource);
    const normalizedForm = formFromTranslation(activeLocale, result.translation);
    setTranslations(current => ({
      ...current,
      [activeLocale]: {
        ...result.translation,
        ...normalizedForm,
      },
    }));
    setForm(normalizedForm);
    setValidationErrors({});
    setSaveState({
      saving: false,
      message: result.ragSync?.attempted && !result.ragSync?.succeeded
        ? t("admin.resourceEditor.savedRagFailed")
        : result.ragSync?.attempted
          ? t("admin.resourceEditor.savedRagSynced")
          : t("admin.resourceEditor.saved"),
      error: "",
    });
    setFormStatus("ready");
  };

  async function publishResource() {
    setSaveState({ saving: true, message: "", error: "" });
    const result = await publishAdminResource(resourceId);
    if (!result.ok) {
      setSaveState({ saving: false, message: "", error: result.error || t("admin.publication.errors.publishResource") });
      return;
    }
    setResource(result.resource || resource);
    setSaveState({ saving: false, message: t("admin.publication.publishedResource"), error: "" });
  }

  async function returnResourceToDraft() {
    setSaveState({ saving: true, message: "", error: "" });
    const result = await unpublishAdminResource(resourceId);
    if (!result.ok) {
      setSaveState({ saving: false, message: "", error: result.error || t("admin.publication.errors.unpublishResource") });
      return;
    }
    setResource(result.resource || resource);
    setSaveState({ saving: false, message: t("admin.publication.returnedResourceToDraft"), error: "" });
  }

  if (loading) {
    return <p className="admin-resource-state" role="status">{t("admin.resourceEditor.loading")}</p>;
  }

  if (error || !resource) {
    return (
      <div className="admin-resource-editor-empty">
        <p className="field-error" role="alert">{error || t("admin.resourceEditor.errors.notFound")}</p>
        <button type="button" className="btn-secondary" onClick={goBack}>
          {t("admin.resourceEditor.backToResources")}
        </button>
      </div>
    );
  }

  const categoryLabel = t(`resources.categories.${resource.categoryCode}`, { defaultValue: resource.category || resource.categoryCode });
  const resourceTitle = translations.en?.title || activeTranslation?.title || resource.slug;

  return (
    <div className="admin-resource-editor">
      <AdminResourceActions
        currentSection="content"
        onArchived={setResource}
        onDeleted={() => requestHashNavigation?.("/admin/resources", { replace: true, bypassGuard: true })}
        requestGuardedAction={requestGuardedAction}
        requestHashNavigation={requestHashNavigation}
        resource={{ ...resource, title: resourceTitle }}
        resourceId={resourceId}
      />

      {dirty && <span className="admin-resource-editor-dirty">{t("admin.resourceEditor.unsavedChanges")}</span>}

      <AdminResourceLanguageTabs
        activeLocale={activeLocale}
        dirtyLocale={dirty ? activeLocale : null}
        onSelect={switchLocale}
        translations={translations}
      />

      <div className="admin-editor-status-grid">
        <AdminTranslationCoverage coverage={coverage} />
        <AdminPublicationControl
          busy={saveState.saving || dirty}
          itemType="resource"
          onPublish={publishResource}
          onReturnToDraft={returnResourceToDraft}
          readiness={publishReadiness}
          status={resource.publicationStatus || resource.status || "draft"}
        />
      </div>

      <div className="admin-resource-editor-grid">
        <AdminResourceContentForm
          dirty={dirty}
          errors={validationErrors}
          form={form}
          onChange={(field, value) => {
            setForm(current => ({ ...current, [field]: value }));
            setSaveState(current => ({ ...current, message: "", error: "" }));
          }}
          onReset={reset}
          onSave={save}
          saveState={saveState}
        />
        <AdminResourceLearnerPreview
          categoryLabel={categoryLabel}
          form={form}
          localeLabel={localeLabel(t, activeLocale)}
        />
      </div>

      {saveState.error && saveState.error === t("admin.resourceEditor.errors.stale") && (
        <button type="button" className="btn-secondary" onClick={load}>
          {t("admin.resourceEditor.reloadLatest")}
        </button>
      )}
    </div>
  );
}

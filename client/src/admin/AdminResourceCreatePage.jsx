import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { createAdminResource, getAdminResourceOptions } from "./adminApi";
import AdminResourceContentForm from "./AdminResourceContentForm";
import AdminResourceLearnerPreview from "./AdminResourceLearnerPreview";
import AdminResourceSourceForm from "./AdminResourceSourceForm";
import {
  areSnapshotsEqual,
  createMetadataSnapshot,
  normalizeContentFormValues,
} from "./resourceFormState";

const INITIAL_FORM = {
  title: "",
  slug: "",
  categoryCode: "Scams",
  summary: "",
  body: "",
  sourceLabel: "",
  sourceUrl: "",
  sourceType: "",
  sourceCountry: "MY",
  sourceAuthorityLevel: "",
  lastSourceCheckedAt: "",
  replacementSourceNeeded: false,
  ageAppropriateness: "13-17",
  sensitiveTopicFlag: false,
  malaysiaGuidanceFlag: false,
};

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function creationSnapshot(form) {
  return {
    ...createMetadataSnapshot(form),
    ...normalizeContentFormValues("en", form),
    slug: String(form.slug || "").trim(),
  };
}

function validateClientForm(t, form) {
  const errors = {};
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug)) errors.slug = t("admin.resourceCreate.invalidSlug");
  if (!form.title.trim()) errors.title = t("admin.resourceEditor.validation.titleRequired");
  if (form.title.trim().length > 180) errors.title = t("admin.resourceEditor.validation.titleTooLong", { max: 180 });
  if (!form.summary.trim()) errors.summary = t("admin.resourceEditor.validation.summaryRequired");
  if (form.summary.trim().length > 500) errors.summary = t("admin.resourceEditor.validation.summaryTooLong", { max: 500 });
  if (!form.body.trim()) errors.body = t("admin.resourceEditor.validation.bodyRequired");
  if (form.body.trim().length > 24000) errors.body = t("admin.resourceEditor.validation.bodyTooLong", { max: 24000 });
  if (form.sourceUrl && !/^https?:\/\//i.test(form.sourceUrl.trim())) errors.sourceUrl = t("admin.resourceCreate.invalidSourceUrl");
  return errors;
}

export default function AdminResourceCreatePage({
  registerActivityGuard,
  requestHashNavigation,
}) {
  const { t } = useTranslation();
  const [options, setOptions] = useState({ categories: [] });
  const [optionsError, setOptionsError] = useState("");
  const [form, setForm] = useState(INITIAL_FORM);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [errors, setErrors] = useState({});
  const [saveState, setSaveState] = useState({ saving: false, message: "", error: "" });
  const [created, setCreated] = useState(false);

  const dirty = !created && !areSnapshotsEqual(creationSnapshot(form), creationSnapshot(INITIAL_FORM));
  const categoryLabel = options.categories?.find(category => category.code === form.categoryCode)?.label || form.categoryCode;

  useEffect(() => {
    let active = true;
    getAdminResourceOptions().then(result => {
      if (!active) return;
      if (result.ok) {
        setOptions(result);
        if (result.categories?.length && !result.categories.some(category => category.code === form.categoryCode)) {
          setForm(current => ({ ...current, categoryCode: result.categories[0].code }));
        }
      } else {
        setOptionsError(result.error || t("admin.resourceCreate.errors.options"));
      }
    });
    return () => { active = false; };
  }, [form.categoryCode, t]);

  useEffect(() => {
    if (!dirty || !registerActivityGuard) return undefined;
    return registerActivityGuard({
      source: "resource-create",
      key: "resource-create:new",
      title: t("admin.resourceCreate.unsavedTitle"),
      description: t("admin.resourceCreate.unsavedMessage"),
      logoutDescription: t("admin.resourceCreate.unsavedLogoutMessage"),
      cancelLabel: t("admin.resourceEditor.continueEditing"),
      confirmLabel: t("admin.resourceEditor.discardChanges"),
    });
  }, [dirty, registerActivityGuard, t]);

  function updateForm(field, value) {
    setForm(current => {
      const next = { ...current, [field]: value };
      if (field === "title" && !slugManuallyEdited) next.slug = slugify(value);
      return next;
    });
    setSaveState({ saving: false, message: "", error: "" });
  }

  function updateContent(field, value) {
    updateForm(field, value);
  }

  function updateSlug(value) {
    setSlugManuallyEdited(true);
    updateForm("slug", value);
  }

  function reset() {
    setForm(INITIAL_FORM);
    setSlugManuallyEdited(false);
    setErrors({});
    setSaveState({ saving: false, message: "", error: "" });
  }

  async function submit() {
    const nextErrors = validateClientForm(t, form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSaveState({ saving: true, message: "", error: "" });
    const result = await createAdminResource({
      slug: form.slug,
      categoryCode: form.categoryCode,
      source: {
        label: form.sourceLabel,
        url: form.sourceUrl,
        type: form.sourceType,
        country: form.sourceCountry,
        authorityLevel: form.sourceAuthorityLevel,
        lastCheckedAt: form.lastSourceCheckedAt,
        replacementNeeded: form.replacementSourceNeeded,
      },
      safety: {
        ageAppropriateness: form.ageAppropriateness,
        sensitiveTopic: form.sensitiveTopicFlag,
        malaysiaGuidance: form.malaysiaGuidanceFlag,
      },
      translation: {
        locale: "en",
        title: form.title,
        summary: form.summary,
        body: form.body,
        sourceLabel: form.sourceLabel,
      },
    });

    if (!result.ok) {
      setSaveState({
        saving: false,
        message: "",
        error: result.code === "ADMIN_RESOURCE_DUPLICATE_SLUG"
          ? t("admin.resourceCreate.duplicateSlug")
          : (result.error || t("admin.resourceCreate.errors.create")),
      });
      return;
    }

    setCreated(true);
    setSaveState({ saving: false, message: t("admin.resourceCreate.created"), error: "" });
    requestHashNavigation?.(`/admin/resources/${result.resource.id}/edit`, { replace: true, bypassGuard: true });
  }

  const contentForm = useMemo(() => ({
    title: form.title,
    summary: form.summary,
    body: form.body,
  }), [form.body, form.summary, form.title]);

  return (
    <div className="admin-resource-create">
      <div className="admin-resource-editor-toolbar">
        <button type="button" className="btn-secondary" onClick={() => requestHashNavigation?.("/admin/resources")}>
          {t("admin.resourceEditor.backToResources")}
        </button>
        {dirty && <span className="admin-resource-editor-dirty">{t("admin.resourceEditor.unsavedChanges")}</span>}
      </div>

      <section className="admin-resource-editor-identity">
        <div>
          <p className="res-tag">{t("admin.resourceCreate.draftPreview")}</p>
          <h2>{t("admin.resourceCreate.title")}</h2>
          <p>{t("admin.resourceCreate.description")}</p>
        </div>
        <div className="admin-resource-editor-badges">
          <span className="admin-status-badge warn">{t("admin.resourceGovernance.publicationStatus.draft")}</span>
          <span className="admin-status-badge warn">{t("admin.resourceGovernance.reviewStatus.draft")}</span>
          <span className="admin-status-badge warn">{t("admin.resourceGovernance.flags.notEffective")}</span>
        </div>
      </section>

      {optionsError && <p className="field-error" role="alert">{optionsError}</p>}

      <div className="admin-resource-create-grid">
        <div className="admin-resource-create-form">
          <section className="admin-resource-form">
            <h3>{t("admin.resourceCreate.identity")}</h3>
            <div className="admin-resource-form-grid">
              <label>
                <span>{t("admin.resourceCreate.slug")}</span>
                <input value={form.slug} onChange={event => updateSlug(event.target.value)} />
                <small>{t("admin.resourceCreate.slugHint")}</small>
                {errors.slug && <small className="field-error">{errors.slug}</small>}
              </label>
              <label>
                <span>{t("admin.resourceCreate.classification")}</span>
                <select value={form.categoryCode} onChange={event => updateForm("categoryCode", event.target.value)}>
                  {(options.categories || []).map(category => (
                    <option key={category.code} value={category.code}>{category.label}</option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <AdminResourceSourceForm
            errors={errors}
            form={form}
            onChange={updateForm}
            onMarkCheckedToday={() => updateForm("lastSourceCheckedAt", todayIsoDate())}
            options={options}
          />

          <section>
            <h3>{t("admin.resourceCreate.englishContent")}</h3>
            <AdminResourceContentForm
              dirty={dirty}
              errors={errors}
              form={contentForm}
              onChange={updateContent}
              onReset={reset}
              onSave={submit}
              saveLabel={t("admin.resourceCreate.createDraft")}
              saveState={saveState}
            />
          </section>
        </div>

        <aside className="admin-resource-create-preview">
          <AdminResourceLearnerPreview
            categoryLabel={categoryLabel}
            form={contentForm}
            localeLabel={t("admin.resourceEditor.locales.en")}
          />
          <div className="admin-resource-next-steps">
            <h3>{t("admin.resourceCreate.nextStepsTitle")}</h3>
            <ul>
              <li>{t("admin.resourceCreate.addMalay")}</li>
              <li>{t("admin.resourceCreate.addChinese")}</li>
              <li>{t("admin.resourceCreate.reviewMetadata")}</li>
              <li>{t("admin.resourceCreate.reviewBeforePublishing")}</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

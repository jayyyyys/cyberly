import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  createAdminScenario,
  getAdminScenario,
  publishAdminScenario,
  unpublishAdminScenario,
  updateAdminScenarioMetadata,
  updateAdminScenarioSteps,
  updateAdminScenarioTranslation,
} from "./adminApi";
import { buildTranslationCoverage, getScenarioPublishReadiness } from "./adminContentState";
import { formatAdminDate } from "./adminDateFormat";
import AdminPublicationControl from "./AdminPublicationControl";
import AdminScenarioLifecycleDialog from "./AdminScenarioLifecycleDialog";
import AdminTranslationCoverage from "./AdminTranslationCoverage";
import AdminTranslationTabs from "./AdminTranslationTabs";
import {
  createScenarioCreateForm,
  mapScenarioCreateApiError,
  validateScenarioCreateForm,
} from "./adminScenarioFormState";

const TOPIC_OPTIONS = ["phishing_and_scams", "password_and_account_security", "privacy_and_personal_information", "misinformation_and_deepfakes"];
const DIFFICULTY_OPTIONS = ["beginner", "developing", "intermediate", "advanced"];
const OPTION_KEYS = ["A", "B", "C"];
const CONTENT_LOCALES = ["en", "ms", "zh-CN"];

function emptyOption(key, index, nextStepOrder = null) {
  return {
    key,
    text: "",
    score: index === 1 ? 2 : 0,
    outcomeCode: key.toLowerCase(),
    feedback: "",
    safetyExplanation: "",
    nextStepOrder,
  };
}

function emptyStep(stepOrder, totalSteps = 3) {
  const nextStepOrder = stepOrder < totalSteps ? stepOrder + 1 : null;
  return {
    stepOrder,
    situationText: "",
    promptText: "",
    options: OPTION_KEYS.map((key, index) => emptyOption(key, index, nextStepOrder)),
  };
}

function normalizeStep(step, index, totalSteps) {
  const stepOrder = Number(step.stepOrder || index + 1);
  const nextStepOrder = stepOrder < totalSteps ? stepOrder + 1 : null;
  const sourceOptions = Array.isArray(step.options) ? step.options : [];
  return {
    stepOrder,
    situationText: step.situationText || "",
    promptText: step.promptText || "",
    options: OPTION_KEYS.map((key, optionIndex) => {
      const existing = sourceOptions.find(option => option.key === key) || sourceOptions[optionIndex] || {};
      return {
        key,
        text: existing.text || "",
        score: Number.isFinite(Number(existing.score)) ? Number(existing.score) : (optionIndex === 1 ? 2 : 0),
        outcomeCode: existing.outcomeCode || key.toLowerCase(),
        feedback: existing.feedback || "",
        safetyExplanation: existing.safetyExplanation || "",
        nextStepOrder: existing.nextStepOrder === undefined ? nextStepOrder : existing.nextStepOrder,
      };
    }),
  };
}

function stepTranslationFor(step, locale) {
  const translation = Array.isArray(step.translations)
    ? step.translations.find(item => item.locale === locale)
    : null;
  return {
    situationText: translation?.situationText || "",
    promptText: translation?.promptText || "",
  };
}

function optionTranslationFor(step, optionKey, locale) {
  return Array.isArray(step.optionTranslations)
    ? step.optionTranslations.find(item => item.locale === locale && item.optionKey === optionKey)
    : null;
}

function localizedStepsFromDetail(scenario, steps, locale) {
  const structuralSteps = stepsFromDetail(scenario, steps);
  return structuralSteps.map((step, stepIndex) => {
    const sourceStep = Array.isArray(steps) ? steps[stepIndex] || {} : {};
    const translatedStep = stepTranslationFor(sourceStep, locale);
    return {
      ...step,
      situationText: translatedStep.situationText || (locale === "en" ? step.situationText : ""),
      promptText: translatedStep.promptText || (locale === "en" ? step.promptText : ""),
      options: step.options.map(option => {
        const translatedOption = optionTranslationFor(sourceStep, option.key, locale);
        return {
          ...option,
          text: translatedOption?.text || (locale === "en" ? option.text : ""),
          feedback: translatedOption?.feedback || (locale === "en" ? option.feedback : ""),
          safetyExplanation: translatedOption?.safetyExplanation || (locale === "en" ? option.safetyExplanation : ""),
        };
      }),
    };
  });
}

function metadataFromScenario(scenario) {
  return {
    slug: scenario?.slug || "",
    title: scenario?.title || "",
    summary: scenario?.summary || "",
    topicCode: scenario?.topicCode || "phishing_and_scams",
    difficulty: scenario?.difficulty || "beginner",
    estimatedMinutes: scenario?.estimatedMinutes || 5,
    totalSteps: scenario?.totalSteps || 3,
    expectedUpdatedAt: scenario?.updatedAt || null,
  };
}

function localizedMetadataFromScenario(scenario, locale) {
  const translation = scenario?.translations?.[locale] || null;
  return {
    ...metadataFromScenario(scenario),
    title: translation?.title || (locale === "en" ? scenario?.title || "" : ""),
    summary: translation?.summary || (locale === "en" ? scenario?.summary || "" : ""),
  };
}

function stepsFromDetail(scenario, steps) {
  const totalSteps = Number(scenario?.totalSteps || 3);
  if (!Array.isArray(steps) || steps.length === 0) {
    return Array.from({ length: totalSteps }, (_, index) => emptyStep(index + 1, totalSteps));
  }
  return steps.map((step, index) => normalizeStep(step, index, totalSteps));
}

function compactScenarioPayload(form) {
  return {
    slug: form.slug,
    title: form.title,
    summary: form.summary,
    topicCode: form.topicCode,
    difficulty: form.difficulty,
    estimatedMinutes: Number(form.estimatedMinutes),
    totalSteps: Number(form.totalSteps),
  };
}

function stepPayload(steps) {
  return steps.map(step => ({
    stepOrder: Number(step.stepOrder),
    situationText: step.situationText,
    promptText: step.promptText,
    options: step.options.map(option => ({
      key: option.key,
      text: option.text,
      score: Number(option.score),
      outcomeCode: option.outcomeCode,
      feedback: option.feedback,
      safetyExplanation: option.safetyExplanation,
      nextStepOrder: option.nextStepOrder === "" ? null : option.nextStepOrder,
    })),
  }));
}

function translationPayload(locale, metadataForm, steps) {
  return {
    title: metadataForm.title,
    summary: metadataForm.summary,
    steps: steps.map(step => ({
      stepOrder: Number(step.stepOrder),
      situationText: step.situationText,
      promptText: step.promptText,
      options: step.options.map(option => ({
        key: option.key,
        text: option.text,
        feedback: option.feedback,
        safetyExplanation: option.safetyExplanation,
      })),
    })),
  };
}

function statusTone(status) {
  if (status === "published") return "publication-published";
  if (status === "archived") return "publication-archived";
  return "publication-draft";
}

function isStepReady(step) {
  return Boolean(
    String(step?.situationText || "").trim()
    && String(step?.promptText || "").trim()
    && Array.isArray(step?.options)
    && step.options.length === 3
    && step.options.every(option => String(option.text || "").trim())
  );
}

function structureCompleteness(steps, totalSteps) {
  const expected = Number(totalSteps || steps.length || 0);
  const ready = steps.filter(isStepReady).length;
  const percentage = expected > 0 ? Math.round((ready / expected) * 100) : 0;
  return { ready, total: expected, percentage };
}

export default function AdminScenarioEditorPage({
  completeGuardedActivity,
  creating = false,
  registerActivityGuard,
  requestGuardedAction,
  requestHashNavigation,
  scenarioId,
}) {
  const { t } = useTranslation();
  const [scenario, setScenario] = useState(null);
  const [detailSteps, setDetailSteps] = useState([]);
  const [steps, setSteps] = useState(() => stepsFromDetail({ totalSteps: 3 }, []));
  const [metadataForm, setMetadataForm] = useState(() => createScenarioCreateForm().values);
  const [savedMetadata, setSavedMetadata] = useState(() => createScenarioCreateForm().values);
  const [savedSteps, setSavedSteps] = useState([]);
  const [loading, setLoading] = useState(!creating);
  const [error, setError] = useState("");
  const [saveState, setSaveState] = useState({ saving: false, message: "", error: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [activeTab, setActiveTab] = useState("overview");
  const [activeContentLocale, setActiveContentLocale] = useState("en");
  const [lifecycleDialogOpen, setLifecycleDialogOpen] = useState(false);
  const [structuralSaveConfirmOpen, setStructuralSaveConfirmOpen] = useState(false);
  const [previewStepIndex, setPreviewStepIndex] = useState(0);
  const fieldRefs = useRef({});
  const createInFlightRef = useRef(false);
  const blockerKey = creating ? "scenario-create:new" : `scenario-content:${scenarioId}:${activeContentLocale}`;

  const metadataDirty = JSON.stringify(compactScenarioPayload(metadataForm)) !== JSON.stringify(compactScenarioPayload(savedMetadata));
  const stepsDirty = JSON.stringify(stepPayload(steps)) !== JSON.stringify(stepPayload(savedSteps));
  const dirty = creating ? metadataDirty : metadataDirty || stepsDirty;
  const activeTranslationExists = creating || Boolean(scenario?.translations?.[activeContentLocale]);
  const editingStructuralLocale = activeContentLocale === "en";
  const completeness = structureCompleteness(steps, metadataForm.totalSteps);
  const previewStep = steps[Math.min(previewStepIndex, Math.max(steps.length - 1, 0))] || steps[0];
  const translationCoverage = useMemo(() => buildTranslationCoverage({
    type: "scenario",
    scenario,
    steps: detailSteps,
    dirtyLocale: dirty ? activeContentLocale : null,
  }), [activeContentLocale, detailSteps, dirty, scenario]);
  const publishReadiness = useMemo(() => getScenarioPublishReadiness(scenario, detailSteps), [detailSteps, scenario]);

  useEffect(() => {
    if (!dirty || !registerActivityGuard) return undefined;
    return registerActivityGuard({
      key: blockerKey,
      source: "scenario-content",
      locale: activeContentLocale,
      title: t("admin.scenarioEditor.discardTitle"),
      description: t("admin.scenarioEditor.discardDescription"),
      logoutDescription: t("admin.scenarioEditor.logoutDescription"),
    });
  }, [activeContentLocale, blockerKey, dirty, registerActivityGuard, t]);

  const hydrate = useCallback((detail, locale = activeContentLocale) => {
    setScenario(detail.scenario);
    setDetailSteps(Array.isArray(detail.steps) ? detail.steps : []);
    const nextMetadata = localizedMetadataFromScenario(detail.scenario, locale);
    const nextSteps = localizedStepsFromDetail(detail.scenario, detail.steps, locale);
    setMetadataForm(nextMetadata);
    setSavedMetadata(nextMetadata);
    setSteps(nextSteps);
    setSavedSteps(nextSteps);
  }, [activeContentLocale]);

  const load = useCallback(async () => {
    if (creating) return;
    setLoading(true);
    setError("");
    const result = await getAdminScenario(scenarioId);
    if (result.ok) {
      hydrate(result, activeContentLocale);
    } else {
      setError(result.error || t("admin.scenarioEditor.errors.load"));
    }
    setLoading(false);
  }, [activeContentLocale, creating, hydrate, scenarioId, t]);

  useEffect(() => {
    load();
  }, [load]);

  function errorText(field, code = fieldErrors[field]) {
    if (!code) return "";
    return t(`admin.scenarioEditor.validation.${field}.${code}`, {
      defaultValue: t(`admin.scenarioEditor.validation.${code}`, { defaultValue: code }),
    });
  }

  const updateMetadata = (field, value) => {
    setMetadataForm(current => {
      const next = { ...current, [field]: value };
      if (field === "totalSteps") {
        const total = Math.min(5, Math.max(3, Number(value) || 3));
        setSteps(currentSteps => Array.from({ length: total }, (_, index) => normalizeStep(currentSteps[index] || emptyStep(index + 1, total), index, total)));
      }
      return next;
    });
    setFieldErrors(current => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
    setSaveState({ saving: false, message: "", error: "" });
  };

  function applyContentLocale(nextLocale) {
    if (!scenario || !CONTENT_LOCALES.includes(nextLocale)) return;
    setActiveContentLocale(nextLocale);
    const nextMetadata = localizedMetadataFromScenario(scenario, nextLocale);
    const nextSteps = localizedStepsFromDetail(scenario, detailSteps, nextLocale);
    setMetadataForm(nextMetadata);
    setSavedMetadata(nextMetadata);
    setSteps(nextSteps);
    setSavedSteps(nextSteps);
    setFieldErrors({});
    setSaveState({ saving: false, message: "", error: "" });
  }

  function switchContentLocale(nextLocale) {
    if (nextLocale === activeContentLocale || creating) return;
    const execute = () => applyContentLocale(nextLocale);
    if (!dirty || !requestGuardedAction) {
      execute();
      return;
    }
    requestGuardedAction(execute, {
      actionType: "scenario-translation-locale-change",
      guard: {
        source: "scenario-content",
        key: blockerKey,
        title: t("admin.scenarioEditor.discardTitle"),
        description: t("admin.scenarioEditor.discardDescription"),
        cancelLabel: t("admin.scenarioEditor.continueEditing"),
        confirmLabel: t("admin.scenarioEditor.discardAndSwitchTranslation"),
      },
      meta: {
        scenarioId,
        currentLocale: activeContentLocale,
        nextLocale,
      },
    });
  }

  useEffect(() => {
    setPreviewStepIndex(current => Math.min(current, Math.max(steps.length - 1, 0)));
  }, [steps.length]);

  const updateStep = (stepIndex, field, value) => {
    setSteps(current => current.map((step, index) => index === stepIndex ? { ...step, [field]: value } : step));
    setSaveState({ saving: false, message: "", error: "" });
  };

  const updateOption = (stepIndex, optionIndex, field, value) => {
    setSteps(current => current.map((step, index) => {
      if (index !== stepIndex) return step;
      return {
        ...step,
        options: step.options.map((option, currentOptionIndex) => currentOptionIndex === optionIndex ? { ...option, [field]: value } : option),
      };
    }));
    setSaveState({ saving: false, message: "", error: "" });
  };

  async function createDraft() {
    if (createInFlightRef.current) return;
    const nextValidation = validateScenarioCreateForm(metadataForm, { showUntouched: true });
    setFieldErrors(nextValidation.errors);
    if (!nextValidation.valid) {
      setSaveState({ saving: false, message: "", error: t("admin.scenarioEditor.validation.correctFields") });
      if (nextValidation.firstInvalidField) {
        fieldRefs.current[nextValidation.firstInvalidField]?.focus();
      }
      return;
    }
    createInFlightRef.current = true;
    setSaveState({ saving: true, message: "", error: "" });
    const result = await createAdminScenario(compactScenarioPayload(metadataForm));
    if (!result.ok) {
      createInFlightRef.current = false;
      const mapped = mapScenarioCreateApiError(result);
      setFieldErrors(mapped.fieldErrors);
      setSaveState({ saving: false, message: "", error: mapped.formError || t("admin.scenarioEditor.errors.create") });
      const firstField = Object.keys(mapped.fieldErrors)[0];
      if (firstField) fieldRefs.current[firstField]?.focus();
      return;
    }
    hydrate(result);
    setFieldErrors({});
    setSaveState({ saving: false, message: t("admin.scenarioEditor.createDraftSaved"), error: "" });
    createInFlightRef.current = false;
    const destinationHash = `#/admin/scenarios/${result.scenario.id}/edit`;
    if (completeGuardedActivity) {
      completeGuardedActivity({
        blockerKey,
        destinationHash,
        replace: true,
      });
    } else {
      requestHashNavigation?.(destinationHash, { replace: true });
    }
  }

  async function saveMetadata() {
    if (!editingStructuralLocale) {
      await saveActiveTranslation();
      return;
    }
    setSaveState({ saving: true, message: "", error: "" });
    const result = await updateAdminScenarioMetadata(scenario.id, {
      ...compactScenarioPayload(metadataForm),
      expectedUpdatedAt: metadataForm.expectedUpdatedAt,
    });
    if (!result.ok) {
      setSaveState({ saving: false, message: "", error: result.error || t("admin.scenarioEditor.errors.saveMetadata") });
      return;
    }
    hydrate(result);
    setSaveState({ saving: false, message: t("admin.scenarioEditor.savedMetadata"), error: "" });
  }

  async function performSaveSteps() {
    if (!editingStructuralLocale) {
      await saveActiveTranslation();
      return;
    }
    setSaveState({ saving: true, message: "", error: "" });
    const result = await updateAdminScenarioSteps(scenario.id, { steps: stepPayload(steps) });
    if (!result.ok) {
      setSaveState({ saving: false, message: "", error: result.error || t("admin.scenarioEditor.errors.saveSteps") });
      return;
    }
    hydrate(result);
    setSaveState({ saving: false, message: t("admin.scenarioEditor.savedSteps"), error: "" });
  }

  async function saveSteps() {
    if (editingStructuralLocale && scenario?.status === "published") {
      setStructuralSaveConfirmOpen(true);
      return;
    }
    await performSaveSteps();
  }

  async function saveActiveTranslation() {
    if (!scenario) return;
    setSaveState({ saving: true, message: "", error: "" });
    const result = await updateAdminScenarioTranslation(
      scenario.id,
      activeContentLocale,
      translationPayload(activeContentLocale, metadataForm, steps)
    );
    if (!result.ok) {
      setSaveState({ saving: false, message: "", error: result.error || t("admin.scenarioEditor.errors.saveTranslation") });
      return;
    }
    hydrate(result, activeContentLocale);
    setSaveState({ saving: false, message: t("admin.scenarioEditor.savedTranslation"), error: "" });
  }

  async function publishScenario() {
    setSaveState({ saving: true, message: "", error: "" });
    const result = await publishAdminScenario(scenario.id);
    if (!result.ok) {
      setSaveState({ saving: false, message: "", error: result.error || t("admin.scenarioEditor.errors.lifecycle") });
      return;
    }
    hydrate(result);
    setSaveState({ saving: false, message: t("admin.scenarioEditor.lifecycle.publish"), error: "" });
  }

  async function returnScenarioToDraft() {
    setSaveState({ saving: true, message: "", error: "" });
    const result = await unpublishAdminScenario(scenario.id);
    if (!result.ok) {
      setSaveState({ saving: false, message: "", error: result.error || t("admin.scenarioEditor.errors.lifecycle") });
      return;
    }
    hydrate(result);
    setSaveState({ saving: false, message: t("admin.publication.returnedScenarioToDraft"), error: "" });
  }

  function handleLifecycleChanged(nextScenario) {
    if (!nextScenario) return;
    setScenario(current => current ? { ...current, ...nextScenario } : nextScenario);
    setMetadataForm(current => ({
      ...current,
      expectedUpdatedAt: nextScenario.updatedAt || current.expectedUpdatedAt,
    }));
  }

  function handleScenarioDeleted() {
    if (completeGuardedActivity) {
      completeGuardedActivity({
        blockerKey,
        destinationHash: "#/admin/scenarios",
        replace: true,
      });
      return;
    }
    requestHashNavigation?.("/admin/scenarios", { replace: true });
  }

  if (loading) return <p className="admin-resource-state" role="status">{t("admin.scenarioEditor.loading")}</p>;
  if (error) {
    return (
      <div className="admin-resource-editor-empty">
        <p className="field-error" role="alert">{error}</p>
        <button type="button" className="btn-secondary" onClick={() => requestHashNavigation?.("/admin/scenarios")}>{t("admin.scenarioEditor.back")}</button>
      </div>
    );
  }

  const lifecycleActions = !creating && scenario ? (
    <div className="admin-scenario-lifecycle-actions" aria-label={t("admin.scenarioEditor.scenarioActions")}>
      <button type="button" className="admin-lifecycle-trigger" onClick={() => setLifecycleDialogOpen(true)} disabled={saveState.saving}>
        <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
          <path d="M4 5.5h16l-1.4 4H5.4L4 5.5Z" />
          <path d="M6 9.5h12v8.8a1.7 1.7 0 0 1-1.7 1.7H7.7A1.7 1.7 0 0 1 6 18.3V9.5Z" />
          <path d="M8.5 13.5h7" />
        </svg>
        <span>{scenario.status === "archived" ? t("admin.scenarioLifecycle.restoreDeleteShort") : t("admin.scenarioLifecycle.archiveDeleteShort")}</span>
      </button>
    </div>
  ) : null;

  return (
    <div className="admin-resource-editor" aria-labelledby="admin-scenario-editor-title">
      <header className="admin-scenario-editor-header">
        <div className="admin-scenario-editor-header-main">
          <button type="button" className="btn-secondary admin-scenario-back-button" onClick={() => requestHashNavigation?.("/admin/scenarios")}>
            {creating ? t("admin.scenarioEditor.backToScenarios") : t("admin.scenarioEditor.back")}
          </button>
          {!creating && (
            <div className="admin-scenario-editor-tabs" role="tablist" aria-label={t("admin.scenarioEditor.tabsLabel")}>
              {["overview", "steps", "preview"].map(tab => (
                <button
                  key={tab}
                  type="button"
                  className={activeTab === tab ? "active" : ""}
                  role="tab"
                  aria-selected={activeTab === tab}
                  onClick={() => setActiveTab(tab)}
                >
                  {t(`admin.scenarioEditor.tabs.${tab}`)}
                </button>
              ))}
            </div>
          )}
          {dirty && <span className="admin-resource-editor-dirty">{t("admin.resourceEditor.unsavedChanges")}</span>}
        </div>
        <div className="admin-scenario-editor-header-actions">
          {lifecycleActions || (!creating && <span className="admin-status-badge neutral">{t("admin.scenarioEditor.scenarioActions")}</span>)}
        </div>
      </header>

      <section className="admin-resource-editor-identity">
        <div>
          <p className="res-tag">{creating ? t("admin.scenarioEditor.createBadge") : t("admin.scenarioEditor.editBadge")}</p>
          <h2 id="admin-scenario-editor-title">{creating ? t("admin.scenarioEditor.createScenarioTitle") : metadataForm.title}</h2>
          <p>{creating ? t("admin.scenarioEditor.createDescription") : t("admin.scenarioEditor.description")}</p>
        </div>
        <div className="admin-resource-editor-badges">
          {creating ? (
            <>
              <span className="admin-status-badge publication-draft">{t("admin.scenarioManagement.status.draft")}</span>
              <span className="admin-status-badge neutral">{t("admin.scenarioEditor.learnerHidden")}</span>
            </>
          ) : scenario && (
            <>
              <span className={`admin-status-badge ${statusTone(scenario.status)}`}>{t(`admin.scenarioManagement.status.${scenario.status}`)}</span>
              <span className="admin-status-badge neutral">{t("admin.scenarioEditor.attempts", { count: scenario.attemptCount || 0 })}</span>
            </>
          )}
        </div>
      </section>

      {!creating && (
        <AdminTranslationTabs
          activeLocale={activeContentLocale}
          ariaLabel={t("admin.scenarioEditor.translationTabsLabel")}
          coverage={translationCoverage}
          onSelect={switchContentLocale}
        />
      )}

      {!creating && !activeTranslationExists && (
        <p className="admin-resource-warning" role="status">
          {t("admin.scenarioEditor.missingTranslationNotice")}
        </p>
      )}

      {!creating && (
        <div className="admin-editor-status-grid">
          <AdminTranslationCoverage coverage={translationCoverage} />
          <AdminPublicationControl
            busy={saveState.saving || dirty}
            itemType="scenario"
            onPublish={publishScenario}
            onReturnToDraft={returnScenarioToDraft}
            readiness={publishReadiness}
            status={scenario?.status || "draft"}
          />
        </div>
      )}

      <div
        className={`admin-resource-create-grid admin-scenario-create-grid${creating ? " creating" : ""}${!creating && activeTab === "preview" ? " preview-only" : ""}`}
        data-testid={!creating && activeTab === "preview" ? "scenario-preview-stage" : undefined}
      >
        <div className="admin-resource-create-form admin-scenario-create-form">
          {(creating || activeTab === "overview") && (
          <section className="admin-resource-form" role={!creating ? "tabpanel" : undefined} aria-label={!creating ? t("admin.scenarioEditor.tabs.overview") : undefined}>
            <h3>{creating ? t("admin.scenarioEditor.identityHeading") : t("admin.scenarioEditor.overviewHeading")}</h3>
            <div className="admin-resource-form-grid">
              <label>
                <span>{t("admin.scenarioEditor.fields.slug")} <strong aria-hidden="true">*</strong></span>
                <input ref={element => { fieldRefs.current.slug = element; }} value={metadataForm.slug} onChange={event => updateMetadata("slug", event.target.value)} disabled={!creating} aria-required="true" aria-invalid={Boolean(fieldErrors.slug)} />
                <small>{t("admin.scenarioEditor.slugHelp")}</small>
                {fieldErrors.slug && <p className="field-error" role="alert">{errorText("slug")}</p>}
              </label>
              <label>
                <span>{t("admin.scenarioEditor.fields.title")} <strong aria-hidden="true">*</strong></span>
                <input ref={element => { fieldRefs.current.title = element; }} value={metadataForm.title} onChange={event => updateMetadata("title", event.target.value)} aria-required="true" aria-invalid={Boolean(fieldErrors.title)} />
                {fieldErrors.title && <p className="field-error" role="alert">{errorText("title")}</p>}
              </label>
            </div>
            <label>
              <span>{t("admin.scenarioEditor.fields.summary")} <strong aria-hidden="true">*</strong></span>
              <textarea ref={element => { fieldRefs.current.summary = element; }} rows={3} value={metadataForm.summary} onChange={event => updateMetadata("summary", event.target.value)} aria-required="true" aria-invalid={Boolean(fieldErrors.summary)} />
              {fieldErrors.summary && <p className="field-error" role="alert">{errorText("summary")}</p>}
            </label>
            {creating && <h3 className="admin-scenario-section-heading">{t("admin.scenarioEditor.classificationHeading")}</h3>}
            <div className="admin-resource-form-grid three">
              <label>
                <span>{t("admin.scenarioEditor.fields.topic")} <strong aria-hidden="true">*</strong></span>
                <select ref={element => { fieldRefs.current.topicCode = element; }} value={metadataForm.topicCode} onChange={event => updateMetadata("topicCode", event.target.value)} disabled={!editingStructuralLocale} aria-required="true" aria-invalid={Boolean(fieldErrors.topicCode)}>
                  {TOPIC_OPTIONS.map(option => <option key={option} value={option}>{t(`topics.${option}`)}</option>)}
                </select>
                {fieldErrors.topicCode && <p className="field-error" role="alert">{errorText("topicCode")}</p>}
              </label>
              <label>
                <span>{t("admin.scenarioEditor.fields.difficulty")} <strong aria-hidden="true">*</strong></span>
                <select ref={element => { fieldRefs.current.difficulty = element; }} value={metadataForm.difficulty} onChange={event => updateMetadata("difficulty", event.target.value)} disabled={!editingStructuralLocale} aria-required="true" aria-invalid={Boolean(fieldErrors.difficulty)}>
                  {DIFFICULTY_OPTIONS.map(option => <option key={option} value={option}>{t(`levels.${option}`)}</option>)}
                </select>
                {fieldErrors.difficulty && <p className="field-error" role="alert">{errorText("difficulty")}</p>}
              </label>
              <label>
                <span>{t("admin.scenarioEditor.fields.minutes")} <strong aria-hidden="true">*</strong></span>
                <input ref={element => { fieldRefs.current.estimatedMinutes = element; }} type="number" min="1" value={metadataForm.estimatedMinutes} onChange={event => updateMetadata("estimatedMinutes", event.target.value)} disabled={!editingStructuralLocale} aria-required="true" aria-invalid={Boolean(fieldErrors.estimatedMinutes)} />
                {fieldErrors.estimatedMinutes && <p className="field-error" role="alert">{errorText("estimatedMinutes")}</p>}
              </label>
            </div>
            {creating && <h3 className="admin-scenario-section-heading">{t("admin.scenarioEditor.structureHeading")}</h3>}
            <div className="admin-resource-form-grid three">
              <label>
                <span>{t("admin.scenarioEditor.fields.totalSteps")} <strong aria-hidden="true">*</strong></span>
                <input ref={element => { fieldRefs.current.totalSteps = element; }} type="number" min="3" max="5" value={metadataForm.totalSteps} onChange={event => updateMetadata("totalSteps", event.target.value)} disabled={!editingStructuralLocale || (!creating && (scenario?.attemptCount || 0) > 0)} aria-required="true" aria-invalid={Boolean(fieldErrors.totalSteps)} />
                {fieldErrors.totalSteps && <p className="field-error" role="alert">{errorText("totalSteps")}</p>}
              </label>
            </div>
            {creating ? (
              <div className="admin-scenario-create-actions">
                <button type="button" className="btn-primary" onClick={createDraft} disabled={saveState.saving}>{saveState.saving ? t("admin.scenarioEditor.creating") : t("admin.scenarioEditor.createDraft")}</button>
              </div>
            ) : (
              <button type="button" className="btn-primary" onClick={saveMetadata} disabled={!metadataDirty || saveState.saving}>{editingStructuralLocale ? t("admin.scenarioEditor.saveMetadata") : t("admin.scenarioEditor.saveTranslation")}</button>
            )}
          </section>
          )}

          {!creating && activeTab === "steps" && (
            <section className="admin-resource-form" role="tabpanel" aria-label={t("admin.scenarioEditor.tabs.steps")}>
              <h3>{t("admin.scenarioEditor.stepsHeading")}</h3>
              {(scenario?.attemptCount || 0) > 0 && <p className="admin-resource-warning">{t("admin.scenarioEditor.attemptsLock")}</p>}
              <div className="admin-scenario-completeness" aria-label={t("admin.scenarioEditor.structureCompleteness")}>
                <strong>{t("admin.scenarioEditor.structureCompleteness")}</strong>
                <span>{t("admin.scenarioEditor.structureCompletenessValue", completeness)}</span>
                <span>{completeness.percentage}%</span>
              </div>
              {steps.map((step, stepIndex) => (
                <div className="admin-scenario-step-card" key={step.stepOrder}>
                  <h4>{t("admin.scenarioEditor.stepTitle", { number: step.stepOrder })}</h4>
                  <label>
                    <span>{t("admin.scenarioEditor.fields.situation")}</span>
                    <textarea rows={2} value={step.situationText} onChange={event => updateStep(stepIndex, "situationText", event.target.value)} disabled={(scenario?.attemptCount || 0) > 0} />
                  </label>
                  <label>
                    <span>{t("admin.scenarioEditor.fields.prompt")}</span>
                    <input value={step.promptText} onChange={event => updateStep(stepIndex, "promptText", event.target.value)} disabled={(scenario?.attemptCount || 0) > 0} />
                  </label>
                  {step.options.map((option, optionIndex) => (
                    <div className="admin-scenario-option-card" key={option.key}>
                      <strong>{t("admin.scenarioEditor.optionTitle", { key: option.key })}</strong>
                      <div className="admin-resource-form-grid three">
                        <label>
                          <span>{t("admin.scenarioEditor.fields.optionText")}</span>
                          <input value={option.text} onChange={event => updateOption(stepIndex, optionIndex, "text", event.target.value)} disabled={(scenario?.attemptCount || 0) > 0} />
                        </label>
                        <label>
                          <span>{t("admin.scenarioEditor.fields.score")}</span>
                          <select value={option.score} onChange={event => updateOption(stepIndex, optionIndex, "score", Number(event.target.value))} disabled={!editingStructuralLocale || (scenario?.attemptCount || 0) > 0}>
                            <option value={2}>{t("admin.scenarioEditor.scores.safest")}</option>
                            <option value={1}>{t("admin.scenarioEditor.scores.partial")}</option>
                            <option value={0}>{t("admin.scenarioEditor.scores.unsafe")}</option>
                          </select>
                        </label>
                        <label>
                          <span>{t("admin.scenarioEditor.fields.outcome")}</span>
                          <input value={option.outcomeCode} onChange={event => updateOption(stepIndex, optionIndex, "outcomeCode", event.target.value)} disabled={!editingStructuralLocale || (scenario?.attemptCount || 0) > 0} />
                        </label>
                      </div>
                      <label>
                        <span>{t("admin.scenarioEditor.fields.feedback")}</span>
                        <input value={option.feedback} onChange={event => updateOption(stepIndex, optionIndex, "feedback", event.target.value)} disabled={(scenario?.attemptCount || 0) > 0} />
                      </label>
                      <label>
                        <span>{t("admin.scenarioEditor.fields.safetyExplanation")}</span>
                        <input value={option.safetyExplanation} onChange={event => updateOption(stepIndex, optionIndex, "safetyExplanation", event.target.value)} disabled={(scenario?.attemptCount || 0) > 0} />
                      </label>
                    </div>
                  ))}
                </div>
              ))}
              <button type="button" className="btn-primary" onClick={saveSteps} disabled={!stepsDirty || saveState.saving || (editingStructuralLocale && (scenario?.attemptCount || 0) > 0)}>{editingStructuralLocale ? t("admin.scenarioEditor.saveSteps") : t("admin.scenarioEditor.saveTranslation")}</button>
            </section>
          )}
        </div>

        {(creating || activeTab === "preview") && (
        <aside
          className="admin-resource-create-preview admin-scenario-create-preview"
          data-testid={!creating && activeTab === "preview" ? "scenario-preview-shell" : undefined}
          role={!creating ? "tabpanel" : undefined}
          aria-label={!creating ? t("admin.scenarioEditor.tabs.preview") : undefined}
        >
          <h3>{creating ? t("admin.scenarioEditor.draftPreview") : t("admin.scenarioEditor.previewHeading")}</h3>
          <p className="admin-lifecycle-helper">{t("admin.scenarioEditor.previewOnly")}</p>
          <p className="res-tag">{t(`topics.${metadataForm.topicCode}`)} · {t(`levels.${metadataForm.difficulty}`)}</p>
          <h2>{metadataForm.title || t("admin.scenarioEditor.previewTitlePlaceholder")}</h2>
          <p>{metadataForm.summary || t("admin.scenarioEditor.previewSummaryPlaceholder")}</p>
          <div className="admin-scenario-preview-metadata">
            <span>{t("admin.scenarioManagement.minutes", { count: metadataForm.estimatedMinutes })}</span>
            <span>{t("admin.scenarioEditor.decisionsCount", { count: metadataForm.totalSteps })}</span>
            <span>{t("admin.scenarioEditor.structureCompletenessValue", completeness)}</span>
            {!creating && scenario?.updatedAt && <span>{t("admin.scenarioManagement.updatedAt", { date: formatAdminDate(scenario.updatedAt) })}</span>}
          </div>
          <div className="admin-scenario-preview-progress">
            <span>{t("admin.scenarioEditor.previewStepProgress", { current: previewStepIndex + 1, total: steps.length })}</span>
            <progress max={steps.length || 1} value={previewStepIndex + 1} />
          </div>
          <section className="admin-scenario-learner-preview-card">
            <p className="res-tag">{t("admin.scenarioEditor.currentStep")}</p>
            <h4>{previewStep?.promptText || t("admin.scenarioEditor.previewPromptPlaceholder")}</h4>
            <p>{previewStep?.situationText || t("admin.scenarioEditor.previewSituationPlaceholder")}</p>
            <div className="admin-scenario-preview-choices">
              {(previewStep?.options || []).map(option => (
                <button type="button" key={option.key} disabled>
                  <strong>{option.key}</strong>
                  <span>{option.text || t("admin.scenarioEditor.previewChoicePlaceholder")}</span>
                </button>
              ))}
            </div>
            <div className="admin-scenario-preview-feedback" aria-live="polite">
              {t("admin.scenarioEditor.previewFeedbackPlaceholder")}
            </div>
          </section>
          <div className="admin-scenario-preview-nav">
            <button type="button" className="btn-secondary" onClick={() => setPreviewStepIndex(current => Math.max(0, current - 1))} disabled={previewStepIndex === 0}>
              {t("common.back")}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setPreviewStepIndex(current => Math.min(steps.length - 1, current + 1))} disabled={previewStepIndex >= steps.length - 1}>
              {t("common.next")}
            </button>
          </div>
          <p className="admin-resource-warning">{t("admin.scenarioEditor.previewSubmissionDisabled")}</p>
        </aside>
        )}
      </div>
      {saveState.message && <p className="admin-resource-success" role="status">{saveState.message}</p>}
      {saveState.error && <p className="field-error" role="alert">{saveState.error}</p>}
      {lifecycleDialogOpen && scenario && (
        <AdminScenarioLifecycleDialog
          dirty={dirty}
          onArchived={handleLifecycleChanged}
          onCancel={() => setLifecycleDialogOpen(false)}
          onDeleted={handleScenarioDeleted}
          scenario={scenario}
          scenarioId={scenario.id}
        />
      )}
      {structuralSaveConfirmOpen && (
        <div className="admin-confirm-backdrop" role="presentation">
          <div className="admin-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-structural-save-title">
            <h3 id="admin-structural-save-title">{t("admin.scenarioEditor.structuralDraftTitle")}</h3>
            <p>{t("admin.scenarioEditor.structuralDraftDescription")}</p>
            <div className="admin-confirm-actions">
              <button type="button" className="btn-secondary" onClick={() => setStructuralSaveConfirmOpen(false)}>
                {t("common.cancel")}
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={async () => {
                  setStructuralSaveConfirmOpen(false);
                  await performSaveSteps();
                }}
              >
                {t("admin.scenarioEditor.saveAndReturnToDraft")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

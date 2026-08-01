import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { getAdminAiProviders, getAdminAgenticTrace, listAdminAgenticTraces, testAdminAiProvider } from "./adminApi";

const PROVIDER_LABELS = {
  openai: "OpenAI",
  gemini: "Gemini",
  ilmu: "ILMU",
};

const CAPABILITIES = [
  ["chat", "admin.ai.capabilities.chat"],
  ["structuredOutput", "admin.ai.capabilities.structuredOutput"],
  ["toolCalling", "admin.ai.capabilities.toolCalling"],
  ["streaming", "admin.ai.capabilities.streaming"],
  ["usageReporting", "admin.ai.capabilities.usageReporting"],
];

const PURPOSE_KEYS = {
  cyberguard_chat: "admin.ai.purposes.cyberguard",
  agent_route_planning: "admin.ai.purposes.agentRouter",
  lightweight_tool_selection: "admin.ai.purposes.lightweight",
  translation_assistance: "admin.ai.purposes.translation",
  safety_evaluation: "admin.ai.purposes.safety",
};

function statusClass(configured, runtimeAvailable) {
  if (!configured) return "admin-status-badge review-draft";
  return runtimeAvailable === false ? "admin-status-badge publication-draft" : "admin-status-badge review-approved";
}

function runtimeReasonKey(provider) {
  if (!provider.configured) return "admin.ai.providers.notConfigured";
  if (provider.runtimeAvailable !== false) return "admin.ai.providers.runtimeAvailable";
  if (provider.lastRuntimeError === "AI_AUTH_FAILED") return "admin.ai.providers.runtimeAuthFailed";
  return "admin.ai.providers.runtimeUnavailable";
}

function ProviderTestResult({ result }) {
  const { t } = useTranslation();
  if (!result) return null;
  const success = result.status === "success";
  return (
    <div className={`admin-ai-test-result ${success ? "success" : "failed"}`} role="status" aria-live="polite">
      <strong>{success ? t("admin.ai.providers.connectionSuccessful") : t("admin.ai.providers.connectionFailed")}</strong>
      {success ? (
        <span>{t("admin.ai.providers.testLatency", { latency: result.latencyMs ?? 0 })}</span>
      ) : (
        <span>{result.code || result.error || t("admin.ai.providers.safeFailure")}</span>
      )}
      <dl className="admin-ai-runtime-details">
        <div>
          <dt>{t("admin.ai.providers.runtimeOk")}</dt>
          <dd>{success ? t("common.yes") : t("common.no")}</dd>
        </div>
        <div>
          <dt>{t("admin.ai.providers.lastTest")}</dt>
          <dd>{result.testedAt ? new Date(result.testedAt).toLocaleString() : t("admin.ai.providers.notTested")}</dd>
        </div>
        {success && (
          <>
            <div>
              <dt>{t("admin.ai.providers.finishReason")}</dt>
              <dd>{result.finishReason || t("common.notSet")}</dd>
            </div>
            <div>
              <dt>{t("admin.ai.providers.requestIdAvailable")}</dt>
              <dd>{result.providerRequestId ? t("common.yes") : t("common.no")}</dd>
            </div>
          </>
        )}
      </dl>
      {success && result.textPreview && <small>{result.textPreview}</small>}
    </div>
  );
}

function ProviderCard({ provider, onTest, testing, result }) {
  const { t } = useTranslation();
  const label = PROVIDER_LABELS[provider.id] || provider.id;
  const runtimeUnavailable = provider.configured && provider.runtimeAvailable === false;
  return (
    <article className="admin-ai-provider-card">
      <div className="admin-ai-provider-head">
        <div>
          <p className="res-tag">{t("admin.ai.providers.provider")}</p>
          <h3>{label}</h3>
        </div>
        <div className="admin-ai-provider-statuses" aria-label={t("admin.ai.providers.status")}>
          <span className={statusClass(provider.configured, provider.runtimeAvailable)}>
            {provider.configured ? t("admin.ai.providers.configured") : t("admin.ai.providers.notConfigured")}
          </span>
          {provider.configured && (
            <span className={statusClass(provider.configured, provider.runtimeAvailable)}>
              {provider.runtimeAvailable === false
                ? t("admin.ai.providers.runtimeUnavailable")
                : t("admin.ai.providers.runtimeAvailable")}
            </span>
          )}
        </div>
      </div>
      <dl className="admin-ai-provider-meta">
        <div>
          <dt>{t("admin.ai.providers.model")}</dt>
          <dd>{provider.model || t("common.notSet")}</dd>
        </div>
      </dl>
      <div className="admin-ai-capability-list" aria-label={t("admin.ai.providers.capabilities")}>
        {CAPABILITIES.map(([key, labelKey]) => {
          const implemented = Boolean(provider.capabilities?.[key]);
          return (
            <span key={key} className={implemented ? "implemented" : "not-implemented"}>
              {t(labelKey)}
              <strong>{implemented ? t("common.yes") : t("common.no")}</strong>
            </span>
          );
        })}
      </div>
      <dl className="admin-ai-runtime-summary">
        <div>
          <dt>{t("admin.ai.providers.runtimeOk")}</dt>
          <dd>
            {result
              ? (result.status === "success" ? t("common.yes") : t("common.no"))
              : (provider.runtimeAvailable === false ? t("common.no") : t("admin.ai.providers.notTested"))}
          </dd>
        </div>
        {provider.configured && (
          <div>
            <dt>{t("admin.ai.providers.runtimeState")}</dt>
            <dd>{t(runtimeReasonKey(provider))}</dd>
          </div>
        )}
        <div>
          <dt>{t("admin.ai.providers.lastTest")}</dt>
          <dd>{result?.testedAt ? new Date(result.testedAt).toLocaleString() : t("admin.ai.providers.notTested")}</dd>
        </div>
        <div>
          <dt>{t("admin.ai.providers.latency")}</dt>
          <dd>{Number.isFinite(Number(result?.latencyMs)) ? t("admin.ai.providers.testLatency", { latency: result.latencyMs }) : t("admin.ai.providers.notTested")}</dd>
        </div>
      </dl>
      {provider.effectivePurposes?.length > 0 && (
        <p className="admin-ai-purpose-note">
          {t("admin.ai.providers.usedFor", {
            purposes: provider.effectivePurposes.map(purpose => t(PURPOSE_KEYS[purpose], { defaultValue: purpose })).join(", "),
          })}
        </p>
      )}
      <button
        type="button"
        className="btn-secondary"
        onClick={() => onTest(provider.id)}
        disabled={!provider.configured || testing}
      >
        {testing ? t("admin.ai.providers.testing") : t("admin.ai.providers.testConnection")}
      </button>
      {!provider.configured && <p className="admin-resource-summary-note">{t("admin.ai.providers.notConfiguredHelp")}</p>}
      {runtimeUnavailable && (
        <p className="admin-resource-summary-note">
          {provider.id === "gemini"
            ? t("admin.ai.providers.geminiRuntimeUnavailableNote")
            : t("admin.ai.providers.runtimeUnavailableNote")}
        </p>
      )}
      <ProviderTestResult result={result} />
    </article>
  );
}

function ControlledAgenticRuntime({ runtime }) {
  const { t } = useTranslation();
  if (!runtime) return null;
  const tools = Array.isArray(runtime.allowedTools) ? runtime.allowedTools : [];
  return (
    <section className="admin-ai-panel" aria-labelledby="admin-agentic-runtime-title">
      <p className="res-tag">{t("admin.ai.agentic.badge")}</p>
      <h3 id="admin-agentic-runtime-title">{t("admin.ai.agentic.title")}</h3>
      <p>{t("admin.ai.agentic.description")}</p>
      <dl className="admin-ai-purpose-list">
        <div>
          <dt>{t("admin.ai.agentic.productionRouter")}</dt>
          <dd>{PROVIDER_LABELS[runtime.productionRouter] || runtime.productionRouter || "OpenAI"}</dd>
        </div>
        <div>
          <dt>{t("admin.ai.agentic.executionMode")}</dt>
          <dd>{t("admin.ai.agentic.singleStep")}</dd>
        </div>
        <div>
          <dt>{t("admin.ai.agentic.maxModelCalls")}</dt>
          <dd>{runtime.maxModelCalls ?? 2}</dd>
        </div>
        <div>
          <dt>{t("admin.ai.agentic.maxToolExecutions")}</dt>
          <dd>{runtime.maxToolExecutions ?? 1}</dd>
        </div>
        <div>
          <dt>{t("admin.ai.agentic.approvedTools")}</dt>
          <dd>{tools.length}</dd>
        </div>
        <div>
          <dt>{t("admin.ai.agentic.autonomousLoop")}</dt>
          <dd>{t("admin.ai.agentic.disabled")}</dd>
        </div>
        <div>
          <dt>{t("admin.ai.agentic.writeActions")}</dt>
          <dd>{t("admin.ai.agentic.disabled")}</dd>
        </div>
      </dl>
      <ul className="admin-ai-safety-list">
        <li>{t("admin.ai.agentic.readOnly")}</li>
        <li>{t("admin.ai.agentic.backendControlled")}</li>
        <li>{t("admin.ai.agentic.deterministicFallback")}</li>
        <li>{t("admin.ai.agentic.toolValidation")}</li>
        <li>{t("admin.ai.agentic.secureSessionIdentity")}</li>
        <li>{t("admin.ai.agentic.noAutomaticProgressChanges")}</li>
      </ul>
      <div className="admin-ai-tool-list" aria-label={t("admin.ai.agentic.toolListLabel")}>
        {tools.map(tool => (
          <article key={tool.name} className="admin-ai-tool-card">
            <h4>{tool.name}</h4>
            <p>{tool.description}</p>
            <dl>
              <div>
                <dt>{t("admin.ai.agentic.mode")}</dt>
                <dd>{t("admin.ai.agentic.readOnlyShort")}</dd>
              </div>
              <div>
                <dt>{t("admin.ai.agentic.allowedRole")}</dt>
                <dd>{(tool.allowedRoles || []).join(", ") || "user"}</dd>
              </div>
              <div>
                <dt>{t("admin.ai.agentic.riskLevel")}</dt>
                <dd>{tool.riskLevel}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}

function LearnerControlledActions({ runtime }) {
  const { t } = useTranslation();
  if (!runtime) return null;
  const enabledActions = Array.isArray(runtime.enabledActions) ? runtime.enabledActions : [];
  const deferredActions = Array.isArray(runtime.deferredActions) ? runtime.deferredActions : [];
  const prohibitedActions = Array.isArray(runtime.prohibitedActions) ? runtime.prohibitedActions : [];
  return (
    <section className="admin-ai-panel" aria-labelledby="admin-learner-actions-title">
      <p className="res-tag">{t("admin.ai.learnerActions.badge")}</p>
      <h3 id="admin-learner-actions-title">{t("admin.ai.learnerActions.title")}</h3>
      <p>{t("admin.ai.learnerActions.description")}</p>
      <dl className="admin-ai-purpose-list">
        <div>
          <dt>{t("admin.ai.learnerActions.status")}</dt>
          <dd>{t("admin.ai.learnerActions.enabled")}</dd>
        </div>
        <div>
          <dt>{t("admin.ai.learnerActions.executionAuthority")}</dt>
          <dd>{t("admin.ai.learnerActions.learnerConfirmation")}</dd>
        </div>
        <div>
          <dt>{t("admin.ai.learnerActions.automaticExecution")}</dt>
          <dd>{runtime.automaticExecution ? t("common.yes") : t("admin.ai.learnerActions.disabled")}</dd>
        </div>
        <div>
          <dt>{t("admin.ai.learnerActions.maxProposals")}</dt>
          <dd>{runtime.maximumProposalsPerResponse ?? 1}</dd>
        </div>
        <div>
          <dt>{t("admin.ai.learnerActions.writeToolsExposed")}</dt>
          <dd>{runtime.writeToolsExposedToModel ?? 0}</dd>
        </div>
        <div>
          <dt>{t("admin.ai.learnerActions.revalidation")}</dt>
          <dd>{runtime.confirmationRevalidation ? t("admin.ai.learnerActions.enabled") : t("common.no")}</dd>
        </div>
        <div>
          <dt>{t("admin.ai.learnerActions.replayProtection")}</dt>
          <dd>{runtime.replayProtection ? t("admin.ai.learnerActions.enabled") : t("common.no")}</dd>
        </div>
        <div>
          <dt>{t("admin.ai.learnerActions.cancelAllowed")}</dt>
          <dd>{runtime.learnerMayCancel ? t("admin.ai.learnerActions.enabled") : t("common.no")}</dd>
        </div>
      </dl>
      <div className="admin-ai-tool-list" aria-label={t("admin.ai.learnerActions.enabledActions")}>
        {enabledActions.map(action => (
          <span key={action} className="admin-status-badge review-approved">
            {t(`admin.ai.learnerActions.actions.${action}`, { defaultValue: action })}
          </span>
        ))}
      </div>
      {deferredActions.length > 0 && (
        <p className="admin-resource-summary-note">
          {t("admin.ai.learnerActions.deferred")}: {deferredActions.map(action => t(`admin.ai.learnerActions.actions.${action}`, { defaultValue: action })).join(", ")}
        </p>
      )}
      <ul className="admin-ai-safety-list">
        <li>{t("admin.ai.learnerActions.noWriteTools")}</li>
        <li>{t("admin.ai.learnerActions.noAutomaticExecution")}</li>
        <li>{t("admin.ai.learnerActions.prohibitedSummary")}</li>
        <li>{prohibitedActions.slice(0, 6).map(action => t(`admin.ai.learnerActions.actions.${action}`, { defaultValue: action })).join(", ")}</li>
      </ul>
    </section>
  );
}

function AdaptiveLearningRuntime({ runtime }) {
  const { t } = useTranslation();
  if (!runtime) return null;
  const sources = Array.isArray(runtime.dataSources) ? runtime.dataSources : [];
  const rules = Array.isArray(runtime.rulesSummary) ? runtime.rulesSummary : [];
  return (
    <section className="admin-ai-panel" aria-labelledby="admin-adaptive-runtime-title">
      <p className="res-tag">{t("admin.ai.adaptive.badge")}</p>
      <h3 id="admin-adaptive-runtime-title">{t("admin.ai.adaptive.title")}</h3>
      <p>{t("admin.ai.adaptive.description")}</p>
      <dl className="admin-ai-purpose-list">
        <div>
          <dt>{t("admin.ai.adaptive.status")}</dt>
          <dd>{t("admin.ai.adaptive.enabled")}</dd>
        </div>
        <div>
          <dt>{t("admin.ai.adaptive.mode")}</dt>
          <dd>{t("admin.ai.adaptive.deterministicExplainable")}</dd>
        </div>
        <div>
          <dt>{t("admin.ai.adaptive.persistentAiRecommendations")}</dt>
          <dd>{runtime.persistentAiRecommendations ? t("admin.ai.adaptive.enabled") : t("admin.ai.adaptive.disabled")}</dd>
        </div>
        <div>
          <dt>{t("admin.ai.adaptive.automaticDifficultyChanges")}</dt>
          <dd>{runtime.automaticDifficultyChanges ? t("admin.ai.adaptive.enabled") : t("admin.ai.adaptive.disabled")}</dd>
        </div>
        <div>
          <dt>{t("admin.ai.adaptive.automaticScoreChanges")}</dt>
          <dd>{runtime.automaticScoreChanges ? t("admin.ai.adaptive.enabled") : t("admin.ai.adaptive.disabled")}</dd>
        </div>
        <div>
          <dt>{t("admin.ai.adaptive.learnerChoiceRequired")}</dt>
          <dd>{runtime.learnerChoiceRequired ? t("admin.ai.adaptive.enabled") : t("common.no")}</dd>
        </div>
      </dl>
      <div className="admin-ai-tool-list" aria-label={t("admin.ai.adaptive.dataSources")}>
        {sources.map(source => (
          <span key={source} className="admin-status-badge publication-draft">
            {t(`admin.ai.adaptive.sources.${source}`, { defaultValue: source })}
          </span>
        ))}
      </div>
      <ul className="admin-ai-safety-list">
        {rules.map(rule => (
          <li key={rule}>{t(`admin.ai.adaptive.rules.${rule}`, { defaultValue: rule })}</li>
        ))}
        <li>{t("admin.ai.adaptive.basedOnAvailableRecords")}</li>
        <li>{t("admin.ai.adaptive.youAreAlwaysInControl")}</li>
      </ul>
    </section>
  );
}

function CyberWellnessRuntime({ runtime }) {
  const { t } = useTranslation();
  if (!runtime) return null;
  const domains = Array.isArray(runtime.domains) ? runtime.domains : [];
  return (
    <section className="admin-ai-panel" aria-labelledby="admin-cyber-wellness-title">
      <p className="res-tag">{t("admin.ai.wellness.badge")}</p>
      <h3 id="admin-cyber-wellness-title">{t("admin.ai.wellness.title")}</h3>
      <p>{t("admin.ai.wellness.description")}</p>
      <dl className="admin-ai-purpose-list">
        <div>
          <dt>{t("admin.ai.wellness.status")}</dt>
          <dd>{t("admin.ai.wellness.enabled")}</dd>
        </div>
        <div>
          <dt>{t("admin.ai.wellness.mode")}</dt>
          <dd>{t("admin.ai.wellness.deterministicNonDiagnostic")}</dd>
        </div>
        <div>
          <dt>{t("admin.ai.wellness.targetUsers")}</dt>
          <dd>{t("admin.ai.wellness.teenagers13To17")}</dd>
        </div>
        <div>
          <dt>{t("admin.ai.wellness.highRiskSafetyHandling")}</dt>
          <dd>{t("admin.ai.wellness.existingSafetyPathway")}</dd>
        </div>
      </dl>
      <div className="admin-ai-tool-list" aria-label={t("admin.ai.wellness.domainListLabel")}>
        {domains.map(domain => (
          <span key={domain} className="admin-status-badge publication-draft">
            {t(`admin.ai.wellness.domains.${domain}`, { defaultValue: domain })}
          </span>
        ))}
      </div>
      <ul className="admin-ai-safety-list">
        <li>{t("admin.ai.wellness.psychologicalDiagnosisDisabled")}</li>
        <li>{t("admin.ai.wellness.riskScoringDisabled")}</li>
        <li>{t("admin.ai.wellness.automaticInterventionDisabled")}</li>
        <li>{t("admin.ai.wellness.learnerChoiceRequired")}</li>
      </ul>
    </section>
  );
}

function AiServiceStatusOverview({ providers, defaultProvider, testResults }) {
  const { t } = useTranslation();
  const currentProvider = providers.find(provider => provider.id === defaultProvider) || providers.find(provider => provider.effectivePurposes?.includes("cyberguard_chat")) || providers[0];
  const backupProviders = providers.filter(provider => provider.id !== currentProvider?.id);
  const gemini = providers.find(provider => provider.id === "gemini");
  const latestTest = Object.values(testResults || {}).filter(Boolean).sort((a, b) => Date.parse(b.testedAt || 0) - Date.parse(a.testedAt || 0))[0];
  return (
    <section className="admin-ai-panel" aria-labelledby="admin-ai-service-status-title">
      <p className="res-tag">{t("admin.ai.overview.badge")}</p>
      <h3 id="admin-ai-service-status-title">{t("admin.ai.overview.serviceStatus")}</h3>
      <dl className="admin-ai-purpose-list">
        <div>
          <dt>{t("admin.ai.overview.cyberGuardStatus")}</dt>
          <dd>{currentProvider?.configured ? t("admin.ai.overview.readyWithSafeguards") : t("admin.ai.overview.needsProvider")}</dd>
        </div>
        <div>
          <dt>{t("admin.ai.overview.currentProvider")}</dt>
          <dd>{PROVIDER_LABELS[currentProvider?.id] || currentProvider?.id || t("common.notSet")}</dd>
        </div>
        <div>
          <dt>{t("admin.ai.overview.backupProviders")}</dt>
          <dd>{backupProviders.some(provider => provider.configured && provider.runtimeAvailable !== false) ? t("admin.ai.overview.available") : t("admin.ai.overview.notAvailable")}</dd>
        </div>
        <div>
          <dt>{t("admin.ai.overview.geminiStatus")}</dt>
          <dd>{gemini?.runtimeAvailable === false ? t("admin.ai.overview.geminiUnavailable") : gemini?.configured ? t("admin.ai.overview.available") : t("admin.ai.overview.notConfigured")}</dd>
        </div>
        <div>
          <dt>{t("admin.ai.overview.lastProviderTest")}</dt>
          <dd>{latestTest?.testedAt ? new Date(latestTest.testedAt).toLocaleString() : t("admin.ai.providers.notTested")}</dd>
        </div>
        <div>
          <dt>{t("admin.ai.overview.responseStatus")}</dt>
          <dd>{latestTest ? `${latestTest.status || "unknown"} · ${latestTest.latencyMs ?? 0} ms` : t("admin.ai.providers.notTested")}</dd>
        </div>
      </dl>
    </section>
  );
}

function CyberGuardCapabilitiesOverview() {
  const { t } = useTranslation();
  return (
    <section className="admin-ai-panel" aria-labelledby="admin-ai-capabilities-title">
      <p className="res-tag">{t("admin.ai.overview.capabilityBadge")}</p>
      <h3 id="admin-ai-capabilities-title">{t("admin.ai.overview.whatCyberGuardCanDo")}</h3>
      <ul className="admin-ai-safety-list">
        <li>{t("admin.ai.overview.answerCyberSafetyQuestions")}</li>
        <li>{t("admin.ai.overview.recommendLearningContent")}</li>
        <li>{t("admin.ai.overview.useLearningRecords")}</li>
        <li>{t("admin.ai.overview.provideWellnessGuidance")}</li>
        <li>{t("admin.ai.overview.prepareConfirmedActions")}</li>
      </ul>
    </section>
  );
}

function CyberGuardSafetyBoundaries() {
  const { t } = useTranslation();
  return (
    <section className="admin-ai-panel" aria-labelledby="admin-ai-boundaries-title">
      <p className="res-tag">{t("admin.ai.overview.boundaryBadge")}</p>
      <h3 id="admin-ai-boundaries-title">{t("admin.ai.overview.safetyBoundaries")}</h3>
      <ul className="admin-ai-safety-list">
        <li>{t("admin.ai.overview.cannotChangeScores")}</li>
        <li>{t("admin.ai.overview.cannotChangeMastery")}</li>
        <li>{t("admin.ai.overview.cannotChangeProgress")}</li>
        <li>{t("admin.ai.overview.cannotCompleteScenarios")}</li>
        <li>{t("admin.ai.overview.cannotAccessOtherLearners")}</li>
        <li>{t("admin.ai.overview.confirmationRequired")}</li>
        <li>{t("admin.ai.overview.nonDiagnostic")}</li>
        <li>{t("admin.ai.overview.focusedDomain")}</li>
      </ul>
    </section>
  );
}

function TraceValue({ value }) {
  return <span>{value || "n/a"}</span>;
}

function AgenticTraceInspector() {
  const { t } = useTranslation();
  const [filters, setFilters] = useState({ status: "", proposalStatus: "" });
  const [state, setState] = useState({
    loading: true,
    error: "",
    items: [],
    pagination: { limit: 10, offset: 0, total: 0, hasMore: false },
  });
  const [detail, setDetail] = useState({ loading: false, error: "", trace: null });

  async function loadTraces(next = filters, offset = 0) {
    setState(current => ({ ...current, loading: true, error: "" }));
    const result = await listAdminAgenticTraces({ ...next, limit: 10, offset });
    if (!result.ok) {
      setState(current => ({ ...current, loading: false, error: result.error || t("admin.ai.traces.error") }));
      return;
    }
    setState({
      loading: false,
      error: "",
      items: result.items,
      pagination: result.pagination || { limit: 10, offset, total: result.items.length, hasMore: false },
    });
  }

  useEffect(() => {
    let active = true;
    listAdminAgenticTraces({ limit: 10 }).then(result => {
      if (!active) return;
      if (!result.ok) {
        setState(current => ({ ...current, loading: false, error: result.error || t("admin.ai.traces.error") }));
        return;
      }
      setState({
        loading: false,
        error: "",
        items: result.items,
        pagination: result.pagination || { limit: 10, offset: 0, total: result.items.length, hasMore: false },
      });
    });
    return () => { active = false; };
  }, [t]);

  async function openDetail(traceId) {
    setDetail({ loading: true, error: "", trace: null });
    const result = await getAdminAgenticTrace(traceId);
    if (!result.ok) {
      setDetail({ loading: false, error: result.error || t("admin.ai.traces.detailError"), trace: null });
      return;
    }
    setDetail({ loading: false, error: "", trace: result.trace });
  }

  function updateFilter(key, value) {
    const next = { ...filters, [key]: value };
    setFilters(next);
    loadTraces(next, 0);
  }

  const offset = Number(state.pagination.offset || 0);
  const limit = Number(state.pagination.limit || 10);

  return (
    <section className="admin-ai-panel admin-ai-traces" aria-labelledby="admin-ai-traces-title">
      <div className="admin-ai-provider-head">
        <div>
          <p className="res-tag">{t("admin.ai.traces.badge")}</p>
          <h3 id="admin-ai-traces-title">{t("admin.ai.traces.title")}</h3>
          <p>{t("admin.ai.traces.description")}</p>
        </div>
        <button type="button" className="btn-secondary" onClick={() => loadTraces(filters, offset)}>
          {t("admin.ai.traces.refresh")}
        </button>
      </div>

      <div className="admin-ai-trace-filters" aria-label={t("admin.ai.traces.filters")}>
        <label>
          {t("admin.ai.traces.status")}
          <select value={filters.status} onChange={event => updateFilter("status", event.target.value)}>
            <option value="">{t("admin.ai.traces.all")}</option>
            <option value="completed">{t("admin.ai.traces.statuses.completed")}</option>
            <option value="completed_with_fallback">{t("admin.ai.traces.statuses.completedWithFallback")}</option>
            <option value="safety_blocked">{t("admin.ai.traces.statuses.safetyBlocked")}</option>
            <option value="failed_safely">{t("admin.ai.traces.statuses.failedSafely")}</option>
          </select>
        </label>
        <label>
          {t("admin.ai.traces.proposalStatus")}
          <select value={filters.proposalStatus} onChange={event => updateFilter("proposalStatus", event.target.value)}>
            <option value="">{t("admin.ai.traces.all")}</option>
            <option value="pending">{t("admin.ai.traces.proposals.pending")}</option>
            <option value="completed">{t("admin.ai.traces.proposals.completed")}</option>
            <option value="cancelled">{t("admin.ai.traces.proposals.cancelled")}</option>
            <option value="expired">{t("admin.ai.traces.proposals.expired")}</option>
            <option value="rejected">{t("admin.ai.traces.proposals.rejected")}</option>
          </select>
        </label>
      </div>

      {state.loading && <p className="admin-resource-state" role="status">{t("admin.ai.traces.loading")}</p>}
      {state.error && <p className="field-error" role="alert">{state.error}</p>}
      {!state.loading && !state.error && state.items.length === 0 && (
        <p className="admin-resource-state">{t("admin.ai.traces.empty")}</p>
      )}
      {!state.loading && state.items.length > 0 && (
        <div className="admin-ai-trace-list" role="table" aria-label={t("admin.ai.traces.tableLabel")}>
          <div className="admin-ai-trace-row heading" role="row">
            <span role="columnheader">{t("admin.ai.traces.status")}</span>
            <span role="columnheader">{t("admin.ai.traces.learner")}</span>
            <span role="columnheader">{t("admin.ai.traces.provider")}</span>
            <span role="columnheader">{t("admin.ai.traces.tool")}</span>
            <span role="columnheader">{t("admin.ai.traces.proposal")}</span>
            <span role="columnheader">{t("admin.ai.traces.actions")}</span>
          </div>
          {state.items.map(item => (
            <div key={item.traceId} className="admin-ai-trace-row" role="row">
              <span role="cell" className="admin-status-badge publication-draft">{item.safeStatus}</span>
              <span role="cell"><TraceValue value={item.learnerRef} /></span>
              <span role="cell"><TraceValue value={item.provider?.provider || item.provider?.model} /></span>
              <span role="cell"><TraceValue value={item.toolExecution?.toolName || item.planning?.decision} /></span>
              <span role="cell">
                <TraceValue value={item.actionProposal?.actionType || item.actionProposal?.status} />
                {item.wellness?.wellnessClassified && (
                  <small className="admin-resource-summary-note">
                    {t("admin.ai.traces.wellnessPrepared")}: {item.wellness.wellnessDomain}
                  </small>
                )}
                {item.scope?.classification && (
                  <small className="admin-resource-summary-note">
                    {t("admin.ai.traces.scope")}: {t(`admin.ai.traces.scopeTypes.${item.scope.classification}`, { defaultValue: item.scope.classification })}
                  </small>
                )}
              </span>
              <span role="cell">
                <button type="button" className="btn-secondary" onClick={() => openDetail(item.traceId)}>
                  {t("admin.ai.traces.viewDetails")}
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
      <div className="admin-ai-trace-pagination">
        <button type="button" className="btn-secondary" disabled={offset <= 0} onClick={() => loadTraces(filters, Math.max(0, offset - limit))}>
          {t("admin.ai.traces.previous")}
        </button>
        <span>{t("admin.ai.traces.total", { total: state.pagination.total || 0 })}</span>
        <button type="button" className="btn-secondary" disabled={!state.pagination.hasMore} onClick={() => loadTraces(filters, offset + limit)}>
          {t("admin.ai.traces.next")}
        </button>
      </div>

      {(detail.loading || detail.error || detail.trace) && (
        <aside className="admin-ai-trace-detail" aria-label={t("admin.ai.traces.detailLabel")}>
          <div className="admin-ai-provider-head">
            <h4>{t("admin.ai.traces.detailTitle")}</h4>
            <button type="button" className="btn-secondary" onClick={() => setDetail({ loading: false, error: "", trace: null })}>
              {t("common.close")}
            </button>
          </div>
          {detail.loading && <p role="status">{t("admin.ai.traces.loadingDetail")}</p>}
          {detail.error && <p className="field-error" role="alert">{detail.error}</p>}
          {detail.trace && (
            <>
              <dl className="admin-ai-purpose-list">
                <div><dt>{t("admin.ai.traces.status")}</dt><dd>{detail.trace.safeStatus}</dd></div>
                <div><dt>{t("admin.ai.traces.requestId")}</dt><dd>{detail.trace.requestId}</dd></div>
                <div><dt>{t("admin.ai.traces.proposal")}</dt><dd>{detail.trace.actionProposal?.status || "none"}</dd></div>
                <div>
                  <dt>{t("admin.ai.traces.wellness")}</dt>
                  <dd>
                    {detail.trace.wellness?.wellnessClassified
                      ? `${detail.trace.wellness.wellnessDomain || "n/a"} / ${detail.trace.wellness.wellnessConfidence || "n/a"} / ${detail.trace.wellness.wellnessGuidanceType || "n/a"}`
                      : "none"}
                  </dd>
                </div>
                <div>
                  <dt>{t("admin.ai.traces.scope")}</dt>
                  <dd>{detail.trace.scope?.classification ? t(`admin.ai.traces.scopeTypes.${detail.trace.scope.classification}`, { defaultValue: detail.trace.scope.classification }) : "n/a"}</dd>
                </div>
              </dl>
              <ol className="admin-ai-trace-timeline">
                {(detail.trace.timeline || []).map((event, index) => (
                  <li key={`${event.event}-${index}`}>
                    <strong>{event.event}</strong>
                    <span>{event.status}</span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </aside>
      )}
    </section>
  );
}

export default function AdminAiProvidersPage() {
  const { t } = useTranslation();
  const [state, setState] = useState({
    loading: true,
    error: "",
    providers: [],
    defaultProvider: null,
    purposeAssignments: {},
    controlledAgenticRuntime: null,
    adaptiveLearningRuntime: null,
    cyberWellnessRuntime: null,
    learnerControlledActions: null,
  });
  const [testingProvider, setTestingProvider] = useState(null);
  const testingProviderRef = useRef(null);
  const [testResults, setTestResults] = useState({});

  useEffect(() => {
    let active = true;
    getAdminAiProviders().then(result => {
      if (!active) return;
      if (!result.ok) {
        setState(current => ({ ...current, loading: false, error: result.error || t("admin.ai.providers.errors.load") }));
        return;
      }
      setState({
        loading: false,
        error: "",
        providers: result.providers,
        defaultProvider: result.defaultProvider,
        purposeAssignments: result.purposeAssignments,
        controlledAgenticRuntime: result.controlledAgenticRuntime,
        adaptiveLearningRuntime: result.adaptiveLearningRuntime,
        cyberWellnessRuntime: result.cyberWellnessRuntime,
        learnerControlledActions: result.learnerControlledActions,
      });
    });
    return () => { active = false; };
  }, [t]);

  const purposeRows = useMemo(() => Object.entries(state.purposeAssignments || {}), [state.purposeAssignments]);

  async function runProviderTest(providerId) {
    if (testingProviderRef.current) return;
    testingProviderRef.current = providerId;
    setTestingProvider(providerId);
    setTestResults(current => ({ ...current, [providerId]: null }));
    try {
      const result = await testAdminAiProvider(providerId);
      setTestResults(current => ({
        ...current,
        [providerId]: result.ok
          ? result.result
          : { status: "failed", code: result.code, error: result.error, httpStatus: result.status },
      }));
    } finally {
      testingProviderRef.current = null;
      setTestingProvider(null);
    }
  }

  if (state.loading) {
    return <p className="admin-resource-state" role="status">{t("admin.ai.providers.loading")}</p>;
  }
  if (state.error) {
    return <p className="field-error" role="alert">{state.error}</p>;
  }

  return (
    <div className="admin-ai-page" aria-labelledby="admin-ai-title">
      <section className="admin-ai-hero">
        <div>
          <p className="res-tag">{t("admin.ai.badge")}</p>
          <h2 id="admin-ai-title">{t("admin.ai.providers.title")}</h2>
          <p>{t("admin.ai.providers.description")}</p>
        </div>
        <span className="admin-status-badge publication-draft">
          {t("admin.ai.providers.defaultProvider", { provider: state.defaultProvider || t("common.notSet") })}
        </span>
      </section>

      <section className="admin-ai-cost-note" aria-label={t("admin.ai.providers.costNoteLabel")}>
        <strong>{t("admin.ai.providers.costNoteTitle")}</strong>
        <span>{t("admin.ai.providers.costNote")}</span>
      </section>

      <AiServiceStatusOverview providers={state.providers} defaultProvider={state.defaultProvider} testResults={testResults} />
      <CyberGuardCapabilitiesOverview />
      <CyberGuardSafetyBoundaries />
      <AgenticTraceInspector />

      <details className="admin-ai-panel">
        <summary className="admin-ai-advanced-summary">{t("admin.ai.overview.advancedTechnicalDetails")}</summary>
        <section className="admin-ai-provider-grid" aria-label={t("admin.ai.providers.configuration")}>
          {state.providers.map(provider => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              testing={testingProvider === provider.id}
              result={testResults[provider.id]}
              onTest={runProviderTest}
            />
          ))}
        </section>

        <section className="admin-ai-panel">
          <p className="res-tag">{t("admin.ai.purposes.title")}</p>
          <h3>{t("admin.ai.purposes.heading")}</h3>
          <dl className="admin-ai-purpose-list">
            {purposeRows.map(([purpose, provider]) => (
              <div key={purpose}>
                <dt>{t(PURPOSE_KEYS[purpose], { defaultValue: purpose })}</dt>
                <dd>{PROVIDER_LABELS[provider] || provider}</dd>
              </div>
            ))}
          </dl>
        </section>

        <ControlledAgenticRuntime runtime={state.controlledAgenticRuntime} />
        <LearnerControlledActions runtime={state.learnerControlledActions} />
        <AdaptiveLearningRuntime runtime={state.adaptiveLearningRuntime} />
        <CyberWellnessRuntime runtime={state.cyberWellnessRuntime} />

        <section className="admin-ai-panel">
          <p className="res-tag">{t("admin.ai.safety.badge")}</p>
          <h3>{t("admin.ai.safety.title")}</h3>
          <ul className="admin-ai-safety-list">
            <li>{t("admin.ai.safety.readOnlyTools")}</li>
            <li>{t("admin.ai.safety.backendControlled")}</li>
            <li>{t("admin.ai.safety.noScoreChanges")}</li>
            <li>{t("admin.ai.safety.noProgressMutation")}</li>
            <li>{t("admin.ai.safety.learnerControlled")}</li>
          </ul>
        </section>
      </details>
    </div>
  );
}

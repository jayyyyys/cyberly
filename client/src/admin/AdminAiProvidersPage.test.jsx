import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AdminAiProvidersPage from "./AdminAiProvidersPage";
import { getAdminAiProviders, getAdminAgenticTrace, listAdminAgenticTraces, testAdminAiProvider } from "./adminApi";

jest.mock("./adminApi", () => ({
  getAdminAiProviders: jest.fn(),
  getAdminAgenticTrace: jest.fn(),
  listAdminAgenticTraces: jest.fn(),
  testAdminAiProvider: jest.fn(),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, options = {}) => options.defaultValue || key,
  }),
}));

const providerPayload = {
  providers: [
    {
      id: "openai",
      configured: true,
      model: "gpt-test",
      capabilities: { chat: true, structuredOutput: true, toolCalling: true, streaming: false, usageReporting: true },
      effectivePurposes: ["cyberguard_chat"],
    },
    {
      id: "gemini",
      configured: true,
      runtimeAvailable: false,
      lastRuntimeStatus: "runtime_unavailable",
      lastRuntimeError: "AI_AUTH_FAILED",
      model: "gemini-test",
      capabilities: { chat: true, structuredOutput: true, toolCalling: true, streaming: false, usageReporting: true },
      effectivePurposes: [],
    },
    {
      id: "ilmu",
      configured: false,
      model: "nemo-test",
      capabilities: { chat: true, structuredOutput: false, toolCalling: true, streaming: false, usageReporting: true },
      effectivePurposes: ["agent_route_planning"],
    },
  ],
  defaultProvider: "openai",
  purposeAssignments: {
    cyberguard_chat: "openai",
    agent_route_planning: "openai",
    lightweight_tool_selection: "openai",
  },
  controlledAgenticRuntime: {
    productionRouter: "openai",
    executionMode: "single_step",
    maxModelCalls: 2,
    maxToolExecutions: 1,
    readOnlyOnly: true,
    autonomousLoop: false,
    writeActions: false,
    backendControlled: true,
    deterministicFallback: true,
    toolValidation: true,
    secureSessionIdentity: true,
    allowedTools: [
      {
        name: "get_learning_progress",
        description: "Return summarized learning progress signals for the authenticated learner.",
        mode: "read_only",
        readOnly: true,
        allowedRoles: ["user"],
        riskLevel: "low",
      },
      {
        name: "search_published_resources",
        description: "Search published reviewed learner-visible Cyberly resources.",
        mode: "read_only",
        readOnly: true,
        allowedRoles: ["user"],
        riskLevel: "low",
      },
    ],
  },
  adaptiveLearningRuntime: {
    status: "enabled",
    mode: "deterministic_explainable",
    dataSources: [
      "learner_profile",
      "initial_assessment",
      "topic_progress",
      "scenario_outcomes",
      "active_recommendations",
    ],
    persistentAiRecommendations: false,
    automaticDifficultyChanges: false,
    automaticScoreChanges: false,
    learnerChoiceRequired: true,
    rulesSummary: [
      "strengths",
      "support_priorities",
      "confidence_data_quality",
      "response_guidance",
      "suggested_next_steps",
    ],
  },
  cyberWellnessRuntime: {
    status: "enabled",
    mode: "deterministic_non_diagnostic",
    targetUsers: "teenagers_13_17",
    domains: [
      "digital_balance",
      "focus_and_distraction",
      "online_pressure_and_boundaries",
      "healthy_online_communication",
      "safe_help_seeking",
      "digital_resilience",
    ],
    psychologicalDiagnosis: false,
    wellnessRiskScoring: false,
    automaticIntervention: false,
    learnerChoiceRequired: true,
    highRiskSafetyHandling: "existing_safety_pathway",
  },
};

describe("AdminAiProvidersPage", () => {
  beforeEach(() => {
    getAdminAiProviders.mockResolvedValue({ ok: true, ...providerPayload });
    listAdminAgenticTraces.mockResolvedValue({
      ok: true,
      items: [
        {
          traceId: "agt_123",
          safeStatus: "completed",
          learnerRef: "learner:42",
          provider: { provider: "openai", model: "gpt-test", requestIdAvailable: true },
          planning: { used: true, provider: "openai", decision: "propose_action" },
          toolExecution: { toolName: "search_published_resources", status: "success" },
          actionProposal: { actionType: "open_resource", status: "pending", source: "model_suggested_action" },
          wellness: {
            wellnessClassified: true,
            wellnessDomain: "focus_and_distraction",
            wellnessConfidence: "high",
            wellnessGuidanceType: "focus_reset",
            wellnessStepCount: 3,
          },
          scope: {
            classification: "in_scope",
            allowed: true,
            reasonCode: "cyber_wellness_learning",
          },
          limits: { modelRequestCount: 1, toolExecutionCount: 0, maxModelCalls: 2, maxToolExecutions: 1 },
          createdAt: "2026-07-18T00:00:00.000Z",
        },
      ],
      pagination: { total: 1, limit: 10, offset: 0, hasMore: false },
    });
    getAdminAgenticTrace.mockResolvedValue({
      ok: true,
      trace: {
        traceId: "agt_123",
        safeStatus: "completed",
        wellness: {
          wellnessClassified: true,
          wellnessDomain: "focus_and_distraction",
          wellnessConfidence: "high",
          wellnessGuidanceType: "focus_reset",
          wellnessStepCount: 3,
        },
        scope: {
          classification: "in_scope",
          allowed: true,
          reasonCode: "cyber_wellness_learning",
        },
        timeline: [{ event: "trace_started", status: "started" }],
      },
    });
    testAdminAiProvider.mockResolvedValue({
      ok: true,
      result: {
        provider: "openai",
        status: "success",
        latencyMs: 42,
        textPreview: "OK",
        usage: { totalTokens: 5 },
        finishReason: "stop",
        providerRequestId: "req-test",
        testedAt: "2026-07-17T00:00:00.000Z",
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("loads provider metadata without automatically testing connections or rendering secrets", async () => {
    render(<AdminAiProvidersPage />);

    expect(await screen.findByText("admin.ai.providers.title")).toBeInTheDocument();
    expect(screen.getByText("admin.ai.overview.serviceStatus")).toBeInTheDocument();
    expect(screen.getByText("admin.ai.overview.whatCyberGuardCanDo")).toBeInTheDocument();
    expect(screen.getByText("admin.ai.overview.safetyBoundaries")).toBeInTheDocument();
    expect(screen.getByText("admin.ai.overview.advancedTechnicalDetails")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "OpenAI" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Gemini" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "ILMU" })).toBeInTheDocument();
    expect(screen.getByText("gpt-test")).toBeInTheDocument();
    expect(screen.getAllByText("admin.ai.providers.configured").length).toBeGreaterThan(0);
    expect(screen.getByText("admin.ai.providers.runtimeUnavailable")).toBeInTheDocument();
    expect(screen.getByText("admin.ai.providers.runtimeAuthFailed")).toBeInTheDocument();
    expect(screen.getByText("admin.ai.providers.geminiRuntimeUnavailableNote")).toBeInTheDocument();
    expect(screen.getByText("admin.ai.agentic.title")).toBeInTheDocument();
    expect(screen.getByText("admin.ai.agentic.singleStep")).toBeInTheDocument();
    expect(screen.getByText("admin.ai.agentic.readOnly")).toBeInTheDocument();
    expect(screen.getByText("admin.ai.agentic.backendControlled")).toBeInTheDocument();
    expect(screen.getByText("admin.ai.agentic.deterministicFallback")).toBeInTheDocument();
    expect(screen.getByText("admin.ai.agentic.toolValidation")).toBeInTheDocument();
    expect(screen.getByText("admin.ai.agentic.secureSessionIdentity")).toBeInTheDocument();
    expect(screen.getByText("get_learning_progress")).toBeInTheDocument();
    expect(screen.getAllByText("search_published_resources").length).toBeGreaterThan(0);
    expect(screen.getByText("admin.ai.adaptive.title")).toBeInTheDocument();
    expect(screen.getByText("admin.ai.adaptive.deterministicExplainable")).toBeInTheDocument();
    expect(screen.getByText("learner_profile")).toBeInTheDocument();
    expect(screen.getByText("initial_assessment")).toBeInTheDocument();
    expect(screen.getByText("topic_progress")).toBeInTheDocument();
    expect(screen.getByText("scenario_outcomes")).toBeInTheDocument();
    expect(screen.getByText("active_recommendations")).toBeInTheDocument();
    expect(screen.getByText("strengths")).toBeInTheDocument();
    expect(screen.getByText("support_priorities")).toBeInTheDocument();
    expect(screen.getByText("confidence_data_quality")).toBeInTheDocument();
    expect(screen.getByText("response_guidance")).toBeInTheDocument();
    expect(screen.getByText("suggested_next_steps")).toBeInTheDocument();
    expect(screen.getByText("admin.ai.adaptive.youAreAlwaysInControl")).toBeInTheDocument();
    expect(screen.getByText("admin.ai.wellness.title")).toBeInTheDocument();
    expect(screen.getByText("admin.ai.wellness.deterministicNonDiagnostic")).toBeInTheDocument();
    expect(screen.getByText("digital_balance")).toBeInTheDocument();
    expect(screen.getByText("focus_and_distraction")).toBeInTheDocument();
    expect(screen.getByText("online_pressure_and_boundaries")).toBeInTheDocument();
    expect(screen.getByText("healthy_online_communication")).toBeInTheDocument();
    expect(screen.getByText("safe_help_seeking")).toBeInTheDocument();
    expect(screen.getByText("digital_resilience")).toBeInTheDocument();
    expect(screen.getByText("admin.ai.wellness.psychologicalDiagnosisDisabled")).toBeInTheDocument();
    expect(screen.getByText("admin.ai.wellness.riskScoringDisabled")).toBeInTheDocument();
    expect(screen.getByText("admin.ai.wellness.automaticInterventionDisabled")).toBeInTheDocument();
    expect(screen.getByText("admin.ai.wellness.learnerChoiceRequired")).toBeInTheDocument();
    expect(screen.getAllByText("OpenAI").length).toBeGreaterThan(0);
    expect(JSON.stringify(document.body.textContent)).not.toContain("API_KEY");
    expect(JSON.stringify(document.body.textContent)).not.toContain("learner@example.com");
    expect(JSON.stringify(document.body.textContent)).not.toContain("password_hash");
    expect(testAdminAiProvider).not.toHaveBeenCalled();
    await waitFor(() => expect(listAdminAgenticTraces).toHaveBeenCalledTimes(1));
  });

  test("renders safe recent execution traces and opens sanitized details", async () => {
    render(<AdminAiProvidersPage />);

    expect(await screen.findByText("admin.ai.traces.title")).toBeInTheDocument();
    expect(await screen.findByText("learner:42")).toBeInTheDocument();
    expect(screen.getByText("open_resource")).toBeInTheDocument();
    expect(screen.getAllByText("search_published_resources").length).toBeGreaterThan(0);
    expect(screen.getByText(/admin\.ai\.traces\.wellnessPrepared/)).toBeInTheDocument();
    expect(screen.getByText(/admin\.ai\.traces\.scope/)).toBeInTheDocument();
    expect(screen.getByText("focus_and_distraction")).toBeInTheDocument();
    expect(JSON.stringify(document.body.textContent)).not.toContain("confirmationToken");
    expect(JSON.stringify(document.body.textContent)).not.toContain("systemPrompt");
    expect(JSON.stringify(document.body.textContent)).not.toContain("learner@example.com");
    expect(JSON.stringify(document.body.textContent)).not.toContain("Notifications keep distracting me");

    fireEvent.click(screen.getByRole("button", { name: "admin.ai.traces.viewDetails" }));

    await waitFor(() => expect(getAdminAgenticTrace).toHaveBeenCalledWith("agt_123"));
    expect(await screen.findByText("trace_started")).toBeInTheDocument();
    expect(screen.getByText("admin.ai.traces.wellness")).toBeInTheDocument();
    expect(screen.getAllByText("admin.ai.traces.scope").length).toBeGreaterThan(0);
  });

  test("runs one explicit provider test and prevents duplicate clicks while testing", async () => {
    render(<AdminAiProvidersPage />);

    await screen.findByRole("heading", { name: "OpenAI" });
    const button = screen.getAllByRole("button", { name: "admin.ai.providers.testConnection" })[0];
    fireEvent.click(button);
    fireEvent.click(button);

    await waitFor(() => expect(testAdminAiProvider).toHaveBeenCalledTimes(1));
    expect(testAdminAiProvider).toHaveBeenCalledWith("openai");
    expect(await screen.findByText("admin.ai.providers.connectionSuccessful")).toBeInTheDocument();
    expect(screen.getAllByText("admin.ai.providers.testLatency").length).toBeGreaterThan(0);
    expect(screen.getAllByText("admin.ai.providers.runtimeOk").length).toBeGreaterThan(0);
    expect(screen.getByText("admin.ai.providers.finishReason")).toBeInTheDocument();
    expect(screen.getByText("admin.ai.providers.requestIdAvailable")).toBeInTheDocument();
    expect(screen.getByText("stop")).toBeInTheDocument();
    expect(screen.getByText("OK")).toBeInTheDocument();
  });

  test("renders safe failure and read-only safety boundaries", async () => {
    testAdminAiProvider.mockResolvedValueOnce({
      ok: false,
      code: "AI_AUTH_FAILED",
      error: "AI_AUTH_FAILED (401)",
      status: 401,
    });
    render(<AdminAiProvidersPage />);

    await screen.findByRole("heading", { name: "OpenAI" });
    fireEvent.click(screen.getAllByRole("button", { name: "admin.ai.providers.testConnection" })[0]);

    expect(await screen.findByText("admin.ai.providers.connectionFailed")).toBeInTheDocument();
    expect(screen.getByText("AI_AUTH_FAILED")).toBeInTheDocument();
    expect(screen.getByText("admin.ai.safety.readOnlyTools")).toBeInTheDocument();
    expect(screen.getByText("admin.ai.safety.backendControlled")).toBeInTheDocument();
    expect(screen.getByText("admin.ai.safety.learnerControlled")).toBeInTheDocument();
  });
});

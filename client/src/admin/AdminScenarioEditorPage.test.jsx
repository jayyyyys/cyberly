import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import AdminScenarioEditorPage from "./AdminScenarioEditorPage";
import { createAdminScenario, getAdminScenario, getAdminScenarioLifecycle, updateAdminScenarioTranslation } from "./adminApi";

jest.mock("./adminApi", () => ({
  archiveAdminScenario: jest.fn(),
  createAdminScenario: jest.fn(),
  getAdminScenario: jest.fn(),
  getAdminScenarioLifecycle: jest.fn(),
  permanentlyDeleteAdminScenario: jest.fn(),
  publishAdminScenario: jest.fn(),
  restoreAdminScenario: jest.fn(),
  updateAdminScenarioMetadata: jest.fn(),
  updateAdminScenarioSteps: jest.fn(),
  updateAdminScenarioTranslation: jest.fn(),
}));

const mockT = (key, options = {}) => options.defaultValue || key;

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: mockT,
  }),
}));

function renderCreatePage(props = {}) {
  return render(
    <AdminScenarioEditorPage
      creating
      completeGuardedActivity={jest.fn()}
      requestHashNavigation={jest.fn()}
      registerActivityGuard={jest.fn()}
      {...props}
    />
  );
}

function renderEditPage(props = {}) {
  getAdminScenario.mockResolvedValue(props.detail || {
    ok: true,
    scenario: {
      id: 12,
      slug: "phishing-plan",
      title: "Phishing plan",
      summary: "Practice suspicious messages.",
      translations: {
        en: { locale: "en", title: "Phishing plan", summary: "Practice suspicious messages." },
      },
      topicCode: "phishing_and_scams",
      difficulty: "beginner",
      estimatedMinutes: 8,
      totalSteps: 3,
      status: props.status || "draft",
      attemptCount: 0,
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    steps: [
      {
        id: 91,
        stepOrder: 1,
        situationText: "English situation",
        promptText: "English prompt",
        translations: [{ locale: "en", situationText: "English situation", promptText: "English prompt" }],
        options: [
          { key: "A", text: "Unsafe", score: 0, outcomeCode: "unsafe", feedback: "No", safetyExplanation: "Risk", nextStepOrder: 2 },
          { key: "B", text: "Safe", score: 2, outcomeCode: "safe", feedback: "Yes", safetyExplanation: "Good", nextStepOrder: 2 },
          { key: "C", text: "Partial", score: 1, outcomeCode: "partial", feedback: "Maybe", safetyExplanation: "Check", nextStepOrder: 2 },
        ],
        optionTranslations: [
          { locale: "en", optionKey: "A", text: "Unsafe", feedback: "No", safetyExplanation: "Risk" },
          { locale: "en", optionKey: "B", text: "Safe", feedback: "Yes", safetyExplanation: "Good" },
          { locale: "en", optionKey: "C", text: "Partial", feedback: "Maybe", safetyExplanation: "Check" },
        ],
      },
    ],
  });
  return render(
    <AdminScenarioEditorPage
      scenarioId={12}
      completeGuardedActivity={jest.fn()}
      requestHashNavigation={jest.fn()}
      registerActivityGuard={jest.fn()}
      {...props}
    />
  );
}

function field(name) {
  return screen.getByLabelText(new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
}

describe("AdminScenarioEditorPage create validation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("required indicators render without immediate field errors", () => {
    renderCreatePage();
    expect(field("admin.scenarioEditor.fields.slug")).toHaveAttribute("aria-required", "true");
    expect(screen.getByText("admin.scenarioEditor.slugHelp")).toBeInTheDocument();
    expect(screen.queryByText("required")).not.toBeInTheDocument();
  });

  test("blank submit shows inline errors and focuses slug", () => {
    renderCreatePage();
    fireEvent.click(screen.getByRole("button", { name: "admin.scenarioEditor.createDraft" }));

    expect(screen.getAllByText("required").length).toBeGreaterThanOrEqual(3);
    expect(field("admin.scenarioEditor.fields.slug")).toHaveFocus();
  });

  test("duplicate slug API response maps to slug field and keeps values", async () => {
    createAdminScenario.mockResolvedValue({
      ok: false,
      status: 409,
      code: "ADMIN_SCENARIO_DUPLICATE_SLUG",
      errors: { slug: "duplicate" },
      error: "Scenario slug already exists. (409)",
    });
    renderCreatePage();
    fireEvent.change(field("admin.scenarioEditor.fields.slug"), { target: { value: "phishing-plan" } });
    fireEvent.change(field("admin.scenarioEditor.fields.title"), { target: { value: "Phishing plan" } });
    fireEvent.change(field("admin.scenarioEditor.fields.summary"), { target: { value: "Practice spotting phishing." } });
    fireEvent.click(screen.getByRole("button", { name: "admin.scenarioEditor.createDraft" }));

    await screen.findByText("duplicate");
    expect(field("admin.scenarioEditor.fields.slug")).toHaveValue("phishing-plan");
  });

  test("API 404 remains visible as a form error", async () => {
    createAdminScenario.mockResolvedValue({
      ok: false,
      status: 404,
      error: "Unable to create scenario. (404)",
      errors: {},
    });
    renderCreatePage();
    fireEvent.change(field("admin.scenarioEditor.fields.slug"), { target: { value: "fresh-plan" } });
    fireEvent.change(field("admin.scenarioEditor.fields.title"), { target: { value: "Fresh plan" } });
    fireEvent.change(field("admin.scenarioEditor.fields.summary"), { target: { value: "A safe practice plan." } });
    fireEvent.click(screen.getByRole("button", { name: "admin.scenarioEditor.createDraft" }));

    await screen.findByText("Unable to create scenario. (404)");
    expect(field("admin.scenarioEditor.fields.title")).toHaveValue("Fresh plan");
  });

  test("successful create clears owned blocker and redirects once to scenario editor", async () => {
    const requestHashNavigation = jest.fn();
    const completeGuardedActivity = jest.fn(() => true);
    let resolveCreate;
    createAdminScenario.mockReturnValue(new Promise(resolve => {
      resolveCreate = () => resolve({
        ok: true,
        scenario: {
          id: 55,
          slug: "fresh-plan",
          title: "Fresh plan",
          summary: "A safe practice plan.",
          topicCode: "phishing_and_scams",
          difficulty: "beginner",
          estimatedMinutes: 5,
          totalSteps: 3,
          status: "draft",
        },
        steps: [],
      });
    }));
    renderCreatePage({ completeGuardedActivity, requestHashNavigation });
    fireEvent.change(field("admin.scenarioEditor.fields.slug"), { target: { value: "fresh-plan" } });
    fireEvent.change(field("admin.scenarioEditor.fields.title"), { target: { value: "Fresh plan" } });
    fireEvent.change(field("admin.scenarioEditor.fields.summary"), { target: { value: "A safe practice plan." } });
    fireEvent.click(screen.getByRole("button", { name: "admin.scenarioEditor.createDraft" }));
    fireEvent.click(screen.getByRole("button", { name: "admin.scenarioEditor.creating" }));
    resolveCreate();

    await waitFor(() => expect(completeGuardedActivity).toHaveBeenCalledWith({
      blockerKey: "scenario-create:new",
      destinationHash: "#/admin/scenarios/55/edit",
      replace: true,
    }));
    expect(requestHashNavigation).not.toHaveBeenCalled();
    expect(createAdminScenario).toHaveBeenCalledTimes(1);
  });

  test("create failure keeps the dirty blocker registered", async () => {
    const registerActivityGuard = jest.fn(() => jest.fn());
    const completeGuardedActivity = jest.fn();
    createAdminScenario.mockResolvedValue({
      ok: false,
      status: 500,
      error: "Unable to create scenario. (500)",
      errors: {},
    });
    renderCreatePage({ completeGuardedActivity, registerActivityGuard });
    fireEvent.change(field("admin.scenarioEditor.fields.slug"), { target: { value: "fresh-plan" } });
    fireEvent.change(field("admin.scenarioEditor.fields.title"), { target: { value: "Fresh plan" } });
    fireEvent.change(field("admin.scenarioEditor.fields.summary"), { target: { value: "A safe practice plan." } });

    await waitFor(() => expect(registerActivityGuard).toHaveBeenCalledWith(expect.objectContaining({
      key: "scenario-create:new",
    })));
    fireEvent.click(screen.getByRole("button", { name: "admin.scenarioEditor.createDraft" }));

    await screen.findByText("Unable to create scenario. (500)");
    expect(registerActivityGuard).toHaveBeenLastCalledWith(expect.objectContaining({
      key: "scenario-create:new",
    }));
    expect(completeGuardedActivity).not.toHaveBeenCalled();
  });

  test("create page uses compact back header", () => {
    renderCreatePage();
    expect(screen.getByRole("button", { name: "admin.scenarioEditor.backToScenarios" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "admin.scenarioEditor.createScenarioTitle" })).toBeInTheDocument();
    expect(screen.getByText("admin.scenarioEditor.createDescription")).toBeInTheDocument();
    expect(screen.getByText("admin.scenarioEditor.learnerHidden")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "admin.scenarioEditor.draftPreview" })).toBeInTheDocument();
  });

  test("editor shows compact tabs and switches without navigation", async () => {
    const requestHashNavigation = jest.fn();
    renderEditPage({ requestHashNavigation });

    expect(await screen.findByRole("tab", { name: "admin.scenarioEditor.tabs.overview" })).toHaveAttribute("aria-selected", "true");
    const stepsTab = await screen.findByRole("tab", { name: "admin.scenarioEditor.tabs.steps" });
    fireEvent.click(stepsTab);
    await waitFor(() => expect(screen.getByRole("tab", { name: "admin.scenarioEditor.tabs.steps" })).toHaveAttribute("aria-selected", "true"));
    expect(requestHashNavigation).not.toHaveBeenCalled();
    const previewTab = screen.getByRole("tab", { name: "admin.scenarioEditor.tabs.preview" });
    fireEvent.click(previewTab);
    await waitFor(() => expect(screen.getByRole("tab", { name: "admin.scenarioEditor.tabs.preview" })).toHaveAttribute("aria-selected", "true"));
    expect(screen.getByTestId("scenario-preview-stage")).toBeInTheDocument();
    expect(screen.getByTestId("scenario-preview-shell")).toBeInTheDocument();
    expect(screen.getByText("admin.scenarioEditor.previewSubmissionDisabled")).toBeInTheDocument();
  });

  test("editor exposes Scenario translation tabs and saves a missing Malay translation", async () => {
    updateAdminScenarioTranslation.mockResolvedValue({
      ok: true,
      scenario: {
        id: 12,
        slug: "phishing-plan",
        title: "Phishing plan",
        summary: "Practice suspicious messages.",
        translations: {
          en: { locale: "en", title: "Phishing plan", summary: "Practice suspicious messages." },
          ms: { locale: "ms", title: "Pelan Phishing", summary: "Latihan mesej mencurigakan." },
        },
        topicCode: "phishing_and_scams",
        difficulty: "beginner",
        estimatedMinutes: 8,
        totalSteps: 3,
        status: "draft",
        attemptCount: 0,
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      steps: [],
    });
    renderEditPage();

    const translationTabs = await screen.findByRole("tablist", {
      name: "admin.scenarioEditor.translationTabsLabel",
    });
    expect(within(translationTabs).getByRole("tab", { name: /en/ })).toBeInTheDocument();
    expect(within(translationTabs).getByRole("tab", { name: /ms/ })).toBeInTheDocument();
    fireEvent.click(within(translationTabs).getByRole("tab", { name: /ms/ }));
    await screen.findByText("admin.scenarioEditor.missingTranslationNotice");
    fireEvent.change(field("admin.scenarioEditor.fields.title"), { target: { value: "Pelan Phishing" } });
    fireEvent.change(screen.getByLabelText(/^admin\.scenarioEditor\.fields\.summary/), { target: { value: "Latihan mesej mencurigakan." } });
    const stepsTab = screen.getByRole("tab", { name: "admin.scenarioEditor.tabs.steps" });
    fireEvent.click(stepsTab);
    fireEvent.change(screen.getByLabelText(/^admin\.scenarioEditor\.fields\.situation/), { target: { value: "Situasi MS" } });
    fireEvent.change(screen.getByLabelText(/^admin\.scenarioEditor\.fields\.prompt/), { target: { value: "Prompt MS" } });
    fireEvent.change(screen.getAllByLabelText(/^admin\.scenarioEditor\.fields\.optionText/)[0], { target: { value: "Pilihan A" } });
    fireEvent.change(screen.getAllByLabelText(/^admin\.scenarioEditor\.fields\.feedback/)[0], { target: { value: "Maklum balas A" } });
    fireEvent.change(screen.getAllByLabelText(/^admin\.scenarioEditor\.fields\.safetyExplanation/)[0], { target: { value: "Penjelasan A" } });
    fireEvent.click(screen.getByRole("button", { name: "admin.scenarioEditor.saveTranslation" }));

    await waitFor(() => expect(updateAdminScenarioTranslation).toHaveBeenCalledWith(
      12,
      "ms",
      expect.objectContaining({
        title: "Pelan Phishing",
        summary: "Latihan mesej mencurigakan.",
      })
    ));
  });

  test("dirty Scenario translation tab switch is guarded and does not switch immediately", async () => {
    const requestGuardedAction = jest.fn();
    renderEditPage({ requestGuardedAction });
    expect(await screen.findByDisplayValue("Phishing plan")).toBeInTheDocument();
    fireEvent.change(field("admin.scenarioEditor.fields.title"), { target: { value: "Changed English" } });
    fireEvent.click(screen.getByRole("tab", { name: /ms/ }));

    expect(requestGuardedAction).toHaveBeenCalledWith(expect.any(Function), expect.objectContaining({
      actionType: "scenario-translation-locale-change",
      guard: expect.objectContaining({ key: "scenario-content:12:en" }),
    }));
    expect(field("admin.scenarioEditor.fields.title")).toHaveValue("Changed English");
  });

  test.each([
    ["draft", "admin.publication.publishScenario", "admin.scenarioLifecycle.archiveDeleteShort"],
    ["published", null, "admin.scenarioLifecycle.archiveDeleteShort"],
    ["archived", null, "admin.scenarioLifecycle.restoreDeleteShort"],
  ])("editor lifecycle actions match %s status", async (status, primaryAction, lifecycleAction) => {
    renderEditPage({ status });
    expect(await screen.findByText("Phishing plan")).toBeInTheDocument();
    if (primaryAction) {
      expect(screen.getByRole("button", { name: primaryAction })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: lifecycleAction })).toBeInTheDocument();
  });

  test("dirty editor opens lifecycle dialog but blocks execution", async () => {
    getAdminScenarioLifecycle.mockResolvedValue({
      ok: true,
      lifecycle: {
        scenarioId: 12,
        slug: "phishing-plan",
        title: "Phishing plan",
        status: "draft",
        canArchive: true,
        canRestore: false,
        canPermanentlyDelete: true,
        counts: {},
        blockingReasons: [],
      },
    });
    renderEditPage();

    expect(await screen.findByText("Phishing plan")).toBeInTheDocument();
    fireEvent.change(field("admin.scenarioEditor.fields.title"), { target: { value: "Changed plan" } });
    fireEvent.click(screen.getByRole("button", { name: "admin.scenarioLifecycle.archiveDeleteShort" }));
    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: "admin.scenarioLifecycle.archiveButton" }));

    expect(await screen.findByText("admin.scenarioLifecycle.errors.dirty")).toBeInTheDocument();
  });
});

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AdminScenarioPage from "./AdminScenarioPage";
import { getAdminScenario, getAdminScenarioLifecycle, listAdminScenarios } from "./adminApi";

jest.mock("./adminApi", () => ({
  archiveAdminScenario: jest.fn(),
  getAdminScenario: jest.fn(),
  getAdminScenarioLifecycle: jest.fn(),
  listAdminScenarios: jest.fn(),
  permanentlyDeleteAdminScenario: jest.fn(),
  restoreAdminScenario: jest.fn(),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, options = {}) => options.defaultValue || key,
  }),
}));

const scenario = {
  id: 8,
  slug: "phishing-check",
  title: "Phishing Check",
  summary: "Practise spotting suspicious messages.",
  topicCode: "phishing_and_scams",
  difficulty: "beginner",
  status: "draft",
  estimatedMinutes: 7,
  totalSteps: 3,
  attemptCount: 0,
  updatedAt: "2026-01-01T00:00:00.000Z",
  structuralValidation: { valid: true },
};

describe("AdminScenarioPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    listAdminScenarios.mockResolvedValue({
      ok: true,
      items: [scenario],
      summary: { total: 1, draft: 1, published: 0, archived: 0, incomplete: 0 },
      pagination: { page: 1, totalPages: 1 },
    });
    getAdminScenario.mockResolvedValue({
      ok: true,
      scenario,
      steps: [
        { id: 11, stepOrder: 1, promptText: "What should you do?", situationText: "A message asks for your password." },
      ],
    });
    getAdminScenarioLifecycle.mockResolvedValue({
      ok: true,
      lifecycle: {
        scenarioId: scenario.id,
        slug: scenario.slug,
        title: scenario.title,
        status: scenario.status,
        canArchive: true,
        canRestore: false,
        canPermanentlyDelete: true,
        counts: { steps: 1 },
        blockingReasons: [],
      },
    });
  });

  test("uses approved table columns and row actions", async () => {
    render(<AdminScenarioPage requestHashNavigation={jest.fn()} />);

    expect(await screen.findByText("Phishing Check")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "admin.scenarioManagement.table.updated" })).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "admin.scenarioManagement.table.structure" })).not.toBeInTheDocument();
    expect(screen.getByText("admin.scenarioManagement.structure.ready")).toBeInTheDocument();
    expect(screen.getByText("2026-01-01")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "admin.scenarioManagement.quickReview" })).toBeInTheDocument();
    expect(screen.queryByText("admin.scenarioManagement.quickPreview")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "admin.scenarioManagement.edit" })).toBeInTheDocument();
  });

  test("drawer exposes edit plus shared lifecycle dialog", async () => {
    render(<AdminScenarioPage requestHashNavigation={jest.fn()} />);

    fireEvent.click(await screen.findByRole("button", { name: "admin.scenarioManagement.quickReview" }));
    await screen.findByRole("dialog", { name: "admin.scenarioManagement.drawerLabel" });
    expect(screen.getAllByText("admin.scenarioManagement.quickReview").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByRole("button", { name: "admin.scenarioManagement.edit" }).some(button => button.classList.contains("admin-quick-review-edit"))).toBe(true);
    expect(screen.getByRole("button", { name: "admin.scenarioLifecycle.archiveOrDelete" })).toHaveClass("admin-quick-review-lifecycle");
    fireEvent.click(screen.getByRole("button", { name: "admin.scenarioLifecycle.archiveOrDelete" }));

    await waitFor(() => expect(getAdminScenarioLifecycle).toHaveBeenCalledWith(8));
    expect(await screen.findByRole("dialog", { name: "admin.scenarioLifecycle.archiveDeleteTitle" })).toBeInTheDocument();
  });
});

import { apiRequest } from "./apiClient";
import {
  completeScenarioAttempt,
  getRecommendedScenarios,
  getScenarioAttempt,
  getScenarioAttemptResult,
  getScenarioBySlug,
  getScenarioDashboard,
  listScenarios,
  saveScenarioDecision,
  startScenarioAttempt,
} from "./scenarioApi";

jest.mock("./apiClient", () => ({
  apiRequest: jest.fn(),
}));

describe("scenario API", () => {
  beforeEach(() => {
    apiRequest.mockResolvedValue({ ok: true, data: {} });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("uses list, recommended, and dashboard endpoints with query forwarding", async () => {
    await listScenarios({ topicCode: "phishing", difficulty: "easy", locale: "en" });
    await getRecommendedScenarios({ locale: "en" });
    await getScenarioDashboard({ locale: "en" });

    expect(apiRequest.mock.calls).toEqual([
      ["/api/scenarios?topicCode=phishing&difficulty=easy&locale=en", { method: "GET" }],
      ["/api/scenarios/recommended?locale=en", { method: "GET" }],
      ["/api/scenarios/dashboard?locale=en", { method: "GET" }],
    ]);
  });

  test("encodes scenario slugs for detail and attempt start", async () => {
    await getScenarioBySlug("phishing/basic", { locale: "ms" });
    await startScenarioAttempt("phishing/basic", { locale: "ms" });

    expect(apiRequest.mock.calls).toEqual([
      ["/api/scenarios/phishing%2Fbasic?locale=ms", { method: "GET" }],
      ["/api/scenarios/phishing%2Fbasic/attempts?locale=ms", { method: "POST" }],
    ]);
  });

  test("uses attempt read, decision, complete, and result endpoints", async () => {
    await getScenarioAttempt("attempt/1", { locale: "zh-CN" });
    await saveScenarioDecision("attempt/1", {
      stepId: 2,
      selectedOptionKey: "report",
    }, { locale: "zh-CN" });
    await completeScenarioAttempt("attempt/1", { locale: "zh-CN" });
    await getScenarioAttemptResult("attempt/1", { locale: "zh-CN" });

    expect(apiRequest.mock.calls).toEqual([
      ["/api/scenario-attempts/attempt%2F1?locale=zh-CN", { method: "GET" }],
      [
        "/api/scenario-attempts/attempt%2F1/decisions?locale=zh-CN",
        { method: "PUT", body: { stepId: 2, selectedOptionKey: "report" } },
      ],
      ["/api/scenario-attempts/attempt%2F1/complete?locale=zh-CN", { method: "POST" }],
      ["/api/scenario-attempts/attempt%2F1/result?locale=zh-CN", { method: "GET" }],
    ]);
  });
});

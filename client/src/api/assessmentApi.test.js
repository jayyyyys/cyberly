import { apiRequest } from "./apiClient";
import {
  createInitialAssessmentAttempt,
  getAssessmentAttempt,
  getInitialAssessment,
  getInitialAssessmentResult,
  getInitialAssessmentStatus,
  saveAssessmentAnswer,
  submitAssessmentAttempt,
} from "./assessmentApi";

jest.mock("./apiClient", () => ({
  apiRequest: jest.fn(),
}));

describe("assessment API", () => {
  beforeEach(() => {
    apiRequest.mockResolvedValue({ ok: true, data: {} });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("uses the assessment definition endpoint with locale query", async () => {
    await getInitialAssessment({ locale: "zh-CN" });

    expect(apiRequest).toHaveBeenCalledWith("/api/assessments/initial?locale=zh-CN", {
      method: "GET",
    });
  });

  test("creates an initial assessment attempt without a request body", async () => {
    await createInitialAssessmentAttempt({ locale: "en" });

    expect(apiRequest).toHaveBeenCalledWith("/api/assessments/initial/attempts?locale=en", {
      method: "POST",
    });
  });

  test("reads an encoded assessment attempt id", async () => {
    await getAssessmentAttempt("attempt/1", { locale: "ms" });

    expect(apiRequest).toHaveBeenCalledWith("/api/assessment-attempts/attempt%2F1?locale=ms", {
      method: "GET",
    });
  });

  test("updates an answer with the current body shape", async () => {
    await saveAssessmentAnswer("attempt 1", {
      questionId: 4,
      selectedOptionKey: "safe",
    });

    expect(apiRequest).toHaveBeenCalledWith("/api/assessment-attempts/attempt%201/answers", {
      method: "PUT",
      body: { questionId: 4, selectedOptionKey: "safe" },
    });
  });

  test("submits an attempt without a request body", async () => {
    await submitAssessmentAttempt("attempt 1", { locale: "en" });

    expect(apiRequest).toHaveBeenCalledWith("/api/assessment-attempts/attempt%201/submit?locale=en", {
      method: "POST",
    });
  });

  test("uses result and status endpoints", async () => {
    await getInitialAssessmentResult({ locale: "en" });
    await getInitialAssessmentStatus({ locale: "en" });

    expect(apiRequest.mock.calls).toEqual([
      ["/api/assessments/initial/result?locale=en", { method: "GET" }],
      ["/api/assessments/initial/status?locale=en", { method: "GET" }],
    ]);
  });
});

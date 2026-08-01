import { apiRequest } from "./apiClient";
import {
  getProgress,
  syncInitialAssessmentProgress,
} from "./progressApi";

jest.mock("./apiClient", () => ({
  apiRequest: jest.fn(),
}));

describe("progress API", () => {
  beforeEach(() => {
    apiRequest.mockResolvedValue({ ok: true, data: {} });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("uses the progress GET endpoint", async () => {
    await getProgress();

    expect(apiRequest).toHaveBeenCalledWith("/api/progress", { method: "GET" });
  });

  test("uses the sync endpoint with the supplied body", async () => {
    await syncInitialAssessmentProgress({ attemptId: 12 });

    expect(apiRequest).toHaveBeenCalledWith("/api/progress/sync-initial-assessment", {
      method: "POST",
      body: { attemptId: 12 },
    });
  });
});

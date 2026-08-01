import { apiRequest } from "./apiClient";
import {
  getCurrentRecommendation,
  markRecommendationCompleted,
  markRecommendationViewed,
} from "./recommendationApi";

jest.mock("./apiClient", () => ({
  apiRequest: jest.fn(),
}));

describe("recommendation API", () => {
  beforeEach(() => {
    apiRequest.mockResolvedValue({ ok: true, data: {} });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("uses the current recommendation endpoint with locale query", async () => {
    await getCurrentRecommendation({ locale: "en" });

    expect(apiRequest).toHaveBeenCalledWith("/api/recommendations/current?locale=en", {
      method: "GET",
    });
  });

  test("encodes viewed and completed recommendation ids", async () => {
    await markRecommendationViewed("rec/1", { locale: "ms" });
    await markRecommendationCompleted("rec/1", { locale: "ms" });

    expect(apiRequest.mock.calls).toEqual([
      ["/api/recommendations/rec%2F1/viewed?locale=ms", { method: "POST" }],
      ["/api/recommendations/rec%2F1/completed?locale=ms", { method: "POST" }],
    ]);
  });
});

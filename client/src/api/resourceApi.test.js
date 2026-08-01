import { apiRequest } from "./apiClient";
import {
  getResourceBySlug,
  listResources,
} from "./resourceApi";

jest.mock("./apiClient", () => ({
  apiRequest: jest.fn(),
}));

describe("resource API", () => {
  beforeEach(() => {
    apiRequest.mockResolvedValue({ ok: true, data: {} });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("uses the list endpoint with query forwarding", async () => {
    await listResources({ locale: "en", category: "Scams" });

    expect(apiRequest).toHaveBeenCalledWith("/api/resources?locale=en&category=Scams", {
      method: "GET",
    });
  });

  test("encodes detail slug and forwards locale query", async () => {
    await getResourceBySlug("phishing/basic", { locale: "ms" });

    expect(apiRequest).toHaveBeenCalledWith("/api/resources/phishing%2Fbasic?locale=ms", {
      method: "GET",
    });
  });
});

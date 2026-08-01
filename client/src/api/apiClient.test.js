describe("apiConfig", () => {
  const originalEnv = process.env;

  afterEach(() => {
    jest.resetModules();
    process.env = originalEnv;
  });

  function loadConfig(env) {
    jest.resetModules();
    process.env = { ...originalEnv, ...env };
    return require("./apiConfig");
  }

  test("normalizes configured API base URL trailing slashes", () => {
    const { API_BASE_URL } = loadConfig({
      NODE_ENV: "production",
      REACT_APP_API_BASE_URL: "https://api.example.com///",
    });

    expect(API_BASE_URL).toBe("https://api.example.com");
  });

  test("uses localhost fallback outside production only", () => {
    expect(loadConfig({ NODE_ENV: "development", REACT_APP_API_BASE_URL: "" }).API_BASE_URL)
      .toBe("http://localhost:5000");
    expect(loadConfig({ NODE_ENV: "production", REACT_APP_API_BASE_URL: "" }).API_BASE_URL)
      .toBe("");
  });
});

describe("apiClient", () => {
  let apiClient;

  beforeEach(() => {
    jest.resetModules();
    process.env.REACT_APP_API_BASE_URL = "http://localhost:5000/";
    global.fetch = jest.fn();
    apiClient = require("./apiClient");
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function response({ ok = true, status = 200, text = "{}" } = {}) {
    return {
      ok,
      status,
      text: jest.fn().mockResolvedValue(text),
    };
  }

  test("includes credentials by default and serializes JSON request bodies", async () => {
    global.fetch.mockResolvedValue(response({ text: "{\"ok\":true}" }));

    await apiClient.apiRequest("/api/example", {
      method: "POST",
      body: { hello: "world" },
    });

    expect(global.fetch).toHaveBeenCalledWith("http://localhost:5000/api/example", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: "{\"hello\":\"world\"}",
    });
  });

  test("parses successful JSON responses and preserves status", async () => {
    global.fetch.mockResolvedValue(response({ status: 201, text: "{\"created\":true}" }));

    const result = await apiClient.apiRequest("/api/example");

    expect(result).toMatchObject({
      ok: true,
      status: 201,
      data: { created: true },
    });
  });

  test("handles empty successful responses", async () => {
    global.fetch.mockResolvedValue(response({ status: 204, text: "" }));

    const result = await apiClient.apiRequest("/api/empty");

    expect(result).toMatchObject({
      ok: true,
      status: 204,
      data: {},
    });
  });

  test("normalizes backend JSON error responses", async () => {
    global.fetch.mockResolvedValue(response({
      ok: false,
      status: 422,
      text: "{\"message\":\"Invalid input\",\"code\":\"BAD_INPUT\"}",
    }));

    const result = await apiClient.apiRequest("/api/example");
    const normalized = apiClient.normalizeBackendError(result.data, "Fallback", result.status);

    expect(result.ok).toBe(false);
    expect(normalized).toEqual({
      message: "Invalid input",
      code: "BAD_INPUT",
      errors: {},
      status: 422,
    });
  });

  test("surfaces network failure as an explicit error", async () => {
    global.fetch.mockRejectedValue(new Error("offline"));

    await expect(apiClient.apiRequest("/api/example")).rejects.toMatchObject({
      name: "ApiNetworkError",
      code: "NETWORK_UNAVAILABLE",
    });
  });

  test("forwards AbortSignal", async () => {
    global.fetch.mockResolvedValue(response({ text: "{}" }));
    const controller = new AbortController();

    await apiClient.apiRequest("/api/example", { signal: controller.signal });

    expect(global.fetch.mock.calls[0][1].signal).toBe(controller.signal);
  });
});

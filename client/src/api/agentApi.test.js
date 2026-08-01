import { apiRequest } from "./apiClient";
import {
  cancelActionProposal,
  confirmActionProposal,
  createActionProposal,
} from "./agentApi";

jest.mock("./apiClient", () => ({
  apiRequest: jest.fn(),
}));

describe("agent action proposal API", () => {
  beforeEach(() => {
    apiRequest.mockResolvedValue({ ok: true, data: {} });
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  test("uses the create proposal endpoint with the supplied body", async () => {
    await createActionProposal({ messageId: 1, actionId: "open_resource" });

    expect(apiRequest).toHaveBeenCalledWith("/api/agent/actions/proposals", {
      method: "POST",
      body: { messageId: 1, actionId: "open_resource" },
    });
  });

  test("encodes proposal id and keeps confirmation token in the body", async () => {
    await confirmActionProposal("proposal/1", { confirmationToken: "secret-token" });
    await cancelActionProposal("proposal/1", {});

    expect(apiRequest.mock.calls).toEqual([
      [
        "/api/agent/actions/proposals/proposal%2F1/confirm",
        { method: "POST", body: { confirmationToken: "secret-token" } },
      ],
      [
        "/api/agent/actions/proposals/proposal%2F1/cancel",
        { method: "POST", body: {} },
      ],
    ]);
    expect(console.log).not.toHaveBeenCalled();
  });
});

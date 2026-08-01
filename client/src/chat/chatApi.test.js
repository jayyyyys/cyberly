import {
  createChatConversation,
  createLearnerActionProposal,
  confirmLearnerActionProposal,
} from "./chatApi";

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn().mockResolvedValue(JSON.stringify(body)),
  };
}

describe("chat API adapter", () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse(200, { conversation: { id: 1 } }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("preserves chat conversation endpoint and request body", async () => {
    await createChatConversation({ locale: "en" });

    expect(global.fetch).toHaveBeenCalledWith("http://localhost:5000/api/chat/conversations", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: "{\"locale\":\"en\"}",
    });
  });

  test("preserves learner action proposal confirmation endpoint", async () => {
    await createLearnerActionProposal({ messageId: 12, actionId: "open_resource" });
    await confirmLearnerActionProposal("proposal-1", "token-1");

    expect(global.fetch.mock.calls.map(call => [call[0], call[1].method, call[1].body])).toEqual([
      [
        "http://localhost:5000/api/agent/actions/proposals",
        "POST",
        "{\"messageId\":12,\"actionId\":\"open_resource\"}",
      ],
      [
        "http://localhost:5000/api/agent/actions/proposals/proposal-1/confirm",
        "POST",
        "{\"confirmationToken\":\"token-1\"}",
      ],
    ]);
  });
});

import {
  login,
  logout,
  register,
  restoreSession,
} from "./authApi";
import {
  getProfile,
  saveProfile,
} from "./profileApi";
import {
  getAccount,
  saveAccount,
} from "./accountApi";

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: jest.fn().mockResolvedValue(JSON.stringify(body)),
  };
}

describe("auth, profile, and account API wrappers", () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse(200, {}));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("preserves auth endpoints", async () => {
    await register({ email: "a@example.com", displayName: "A", password: "pw", age: 16 });
    await login("a@example.com", "pw");
    await restoreSession();
    await logout();

    expect(global.fetch.mock.calls.map(call => [call[0], call[1].method, call[1].body])).toEqual([
      [
        "http://localhost:5000/api/auth/register",
        "POST",
        "{\"email\":\"a@example.com\",\"displayName\":\"A\",\"password\":\"pw\",\"age\":16}",
      ],
      ["http://localhost:5000/api/auth/login", "POST", "{\"email\":\"a@example.com\",\"password\":\"pw\"}"],
      ["http://localhost:5000/api/auth/me", "GET", undefined],
      ["http://localhost:5000/api/auth/logout", "POST", undefined],
    ]);
  });

  test("preserves profile and account endpoints", async () => {
    await getProfile();
    await saveProfile({ language: "en" });
    await getAccount();
    await saveAccount({ displayName: "A" });

    expect(global.fetch.mock.calls.map(call => [call[0], call[1].method, call[1].body])).toEqual([
      ["http://localhost:5000/api/profile", "GET", undefined],
      ["http://localhost:5000/api/profile", "PUT", "{\"language\":\"en\"}"],
      ["http://localhost:5000/api/account", "GET", undefined],
      ["http://localhost:5000/api/account", "PUT", "{\"displayName\":\"A\"}"],
    ]);
  });
});

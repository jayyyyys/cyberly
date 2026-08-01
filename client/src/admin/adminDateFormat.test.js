import { formatAdminDate } from "./adminDateFormat";

describe("formatAdminDate", () => {
  test("returns stable YYYY-MM-DD for resource and scenario timestamps", () => {
    expect(formatAdminDate("2026-07-16T23:55:00.000Z")).toBe("2026-07-16");
    expect(formatAdminDate("2026-12-03T00:05:00.000Z")).toBe("2026-12-03");
  });

  test("does not shift UTC timestamp dates by local timezone", () => {
    expect(formatAdminDate("2026-07-16T00:30:00.000Z")).toBe("2026-07-16");
  });

  test("returns same format regardless of UI locale argument", () => {
    expect(formatAdminDate("2026-07-16T12:00:00.000Z", "en")).toBe("2026-07-16");
    expect(formatAdminDate("2026-07-16T12:00:00.000Z", "ms")).toBe("2026-07-16");
    expect(formatAdminDate("2026-07-16T12:00:00.000Z", "zh-CN")).toBe("2026-07-16");
  });

  test("missing date returns neutral fallback", () => {
    expect(formatAdminDate(null)).toBe("—");
    expect(formatAdminDate(undefined)).toBe("—");
  });
});

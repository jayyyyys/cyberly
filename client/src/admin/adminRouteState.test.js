import {
  buildAdminHash,
  parseAdminRoute,
} from "./adminRouteState";

describe("admin canonical route state", () => {
  test("admin root canonicalizes to resources using replace semantics", () => {
    expect(parseAdminRoute("#/admin")).toMatchObject({
      section: "resources",
      view: "list",
      canonicalHash: "#/admin/resources",
      shouldReplace: true,
      notFound: false,
    });
  });

  test("resource routes parse as canonical destinations", () => {
    expect(parseAdminRoute("#/admin/resources")).toMatchObject({ section: "resources", view: "list", resourceId: null, canonicalHash: "#/admin/resources" });
    expect(parseAdminRoute("#/admin/resources/new")).toMatchObject({ section: "resources", view: "new", canonicalHash: "#/admin/resources/new" });
    expect(parseAdminRoute("#/admin/resources/7/edit")).toMatchObject({ section: "resources", view: "edit", resourceId: 7, canonicalHash: "#/admin/resources/7/edit" });
    expect(parseAdminRoute("#/admin/resources/7/metadata")).toMatchObject({ section: "resources", view: "metadata", resourceId: 7, canonicalHash: "#/admin/resources/7/metadata" });
  });

  test("scenario routes survive refresh-equivalent parsing", () => {
    expect(parseAdminRoute("#/admin/scenarios")).toMatchObject({ section: "scenarios", view: "list", scenarioId: null, canonicalHash: "#/admin/scenarios" });
    expect(parseAdminRoute("#/admin/scenarios/new")).toMatchObject({ section: "scenarios", view: "new", canonicalHash: "#/admin/scenarios/new" });
    expect(parseAdminRoute("#/admin/scenarios/12/edit")).toMatchObject({ section: "scenarios", view: "edit", scenarioId: 12, canonicalHash: "#/admin/scenarios/12/edit" });
    expect(parseAdminRoute("#/admin/scenarios").shouldReplace).toBe(false);
    expect(parseAdminRoute("#/admin/scenarios/new").shouldReplace).toBe(false);
    expect(parseAdminRoute("#/admin/scenarios/12/edit").shouldReplace).toBe(false);
  });

  test("malformed scenario IDs show not found instead of resources", () => {
    expect(parseAdminRoute("#/admin/scenarios/abc/edit")).toMatchObject({
      section: null,
      view: "notFound",
      notFound: true,
      canonicalHash: "#/admin/scenarios/abc/edit",
    });
    expect(parseAdminRoute("#/admin/scenarios/0/edit")).toMatchObject({
      section: null,
      view: "notFound",
      notFound: true,
      canonicalHash: "#/admin/scenarios/0/edit",
    });
  });

  test("unknown admin routes are not silently converted to resources", () => {
    expect(parseAdminRoute("#/admin/nope")).toMatchObject({
      section: null,
      view: "notFound",
      notFound: true,
      canonicalHash: "#/admin/nope",
    });
  });

  test("central navigation builder emits canonical hashes", () => {
    expect(buildAdminHash({ section: "resources" })).toBe("#/admin/resources");
    expect(buildAdminHash({ section: "scenarios" })).toBe("#/admin/scenarios");
    expect(buildAdminHash({ section: "scenarios", view: "edit", scenarioId: 4 })).toBe("#/admin/scenarios/4/edit");
  });
});

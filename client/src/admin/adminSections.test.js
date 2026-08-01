import {
  getAdminResourceEditorIdFromHash,
  getAdminResourceGovernanceIdFromHash,
  getAdminResourceMetadataIdFromHash,
  getAdminScenarioEditorIdFromHash,
  getAdminSectionFromHash,
  isAdminScenarioCreateRoute,
} from "./adminSections";

describe("admin resource route parsing", () => {
  test("governance compatibility route resolves to a Quick Review resource id", () => {
    expect(getAdminResourceGovernanceIdFromHash("#/admin/resources/7/governance")).toBe(7);
    expect(getAdminResourceGovernanceIdFromHash("#/admin/resources/not-a-number/governance")).toBeNull();
  });

  test("edit, metadata, and governance routes stay distinct", () => {
    expect(getAdminResourceEditorIdFromHash("#/admin/resources/7/edit")).toBe(7);
    expect(getAdminResourceMetadataIdFromHash("#/admin/resources/7/metadata")).toBe(7);
    expect(getAdminResourceEditorIdFromHash("#/admin/resources/7/governance")).toBeNull();
    expect(getAdminResourceMetadataIdFromHash("#/admin/resources/7/governance")).toBeNull();
  });

  test("scenario management routes resolve separately from resource routes", () => {
    expect(getAdminSectionFromHash("#/admin/scenarios").id).toBe("scenarios");
    expect(isAdminScenarioCreateRoute("#/admin/scenarios/new")).toBe(true);
    expect(isAdminScenarioCreateRoute("#/admin/resources/new")).toBe(false);
    expect(getAdminScenarioEditorIdFromHash("#/admin/scenarios/42/edit")).toBe(42);
    expect(getAdminScenarioEditorIdFromHash("#/admin/scenarios/not-a-number/edit")).toBeNull();
    expect(getAdminScenarioEditorIdFromHash("#/admin/resources/42/edit")).toBeNull();
  });

  test("AI & Agentic route is enabled and resolves canonically", () => {
    expect(getAdminSectionFromHash("#/admin/ai-agentic").id).toBe("ai-agentic");
    expect(getAdminSectionFromHash("#/admin/ai").id).toBe("resources");
  });
});

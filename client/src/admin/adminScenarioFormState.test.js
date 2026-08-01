import {
  createScenarioCreateForm,
  mapScenarioCreateApiError,
  validateScenarioCreateForm,
} from "./adminScenarioFormState";

describe("admin scenario create form state", () => {
  test("untouched initial form has required metadata but no visible errors", () => {
    const form = createScenarioCreateForm();
    expect(form.fields.slug.required).toBe(true);
    expect(form.fields.title.required).toBe(true);
    expect(form.fields.summary.required).toBe(true);
    expect(validateScenarioCreateForm(form.values, { showUntouched: false }).errors).toEqual({});
  });

  test("blank submit shows field-level required errors", () => {
    const form = createScenarioCreateForm();
    const result = validateScenarioCreateForm(form.values, { showUntouched: true });
    expect(result.valid).toBe(false);
    expect(result.errors).toMatchObject({
      slug: "required",
      title: "required",
      summary: "required",
    });
    expect(result.firstInvalidField).toBe("slug");
  });

  test("invalid slug, minutes, and total steps are rejected before POST", () => {
    const result = validateScenarioCreateForm({
      slug: "Bad--Slug",
      title: "Safe title",
      summary: "Safe summary",
      topicCode: "phishing_and_scams",
      difficulty: "beginner",
      estimatedMinutes: 0,
      totalSteps: 6,
    }, { showUntouched: true });
    expect(result.errors.slug).toBe("format");
    expect(result.errors.estimatedMinutes).toBe("positiveInteger");
    expect(result.errors.totalSteps).toBe("range");
  });

  test("duplicate slug API response maps to slug field", () => {
    const mapped = mapScenarioCreateApiError({
      code: "ADMIN_SCENARIO_DUPLICATE_SLUG",
      errors: { slug: "duplicate" },
      error: "Scenario slug already exists. (409)",
      status: 409,
    });
    expect(mapped.fieldErrors.slug).toBe("duplicate");
    expect(mapped.formError).toContain("409");
  });

  test("route 404 remains visible as API error without clearing field values", () => {
    const mapped = mapScenarioCreateApiError({
      code: null,
      error: "Unable to create scenario. (404)",
      status: 404,
    });
    expect(mapped.fieldErrors).toEqual({});
    expect(mapped.formError).toContain("404");
  });
});

import {
  buildTranslationCoverage,
  getResourcePublishReadiness,
  getScenarioPublishReadiness,
  isResourceTranslationComplete,
  isScenarioTranslationComplete,
} from "./adminContentState";

const completeScenario = {
  totalSteps: 1,
  status: "draft",
  structuralValidation: { valid: true, reasons: [] },
  translations: {
    en: { title: "Phishing", summary: "Practice phishing." },
    ms: { title: "Pancingan data", summary: "Latihan." },
  },
};

const completeStep = {
  stepOrder: 1,
  translations: [
    { locale: "en", situationText: "Situation", promptText: "Prompt" },
    { locale: "ms", situationText: "Situasi", promptText: "Prompt MS" },
  ],
  options: [
    { key: "A" },
    { key: "B" },
  ],
  optionTranslations: [
    { locale: "en", optionKey: "A", text: "A", feedback: "A feedback", safetyExplanation: "A safety" },
    { locale: "en", optionKey: "B", text: "B", feedback: "B feedback", safetyExplanation: "B safety" },
    { locale: "ms", optionKey: "A", text: "A MS", feedback: "A maklum balas", safetyExplanation: "A selamat" },
    { locale: "ms", optionKey: "B", text: "B MS", feedback: "B maklum balas", safetyExplanation: "B selamat" },
  ],
};

describe("admin content state", () => {
  test("resource translation complete requires title, summary, and body", () => {
    expect(isResourceTranslationComplete({ title: "Title", summary: "Summary", body: "Body" })).toBe(true);
    expect(isResourceTranslationComplete({ title: "Title", summary: "Summary", body: "" })).toBe(false);
  });

  test("scenario translation complete requires definition, steps, choices, feedback, and safety explanation", () => {
    expect(isScenarioTranslationComplete({ scenario: completeScenario, steps: [completeStep], locale: "en" })).toBe(true);
    const missingStepText = { ...completeStep, translations: [{ locale: "en", situationText: "Situation", promptText: "" }] };
    expect(isScenarioTranslationComplete({ scenario: completeScenario, steps: [missingStepText], locale: "en" })).toBe(false);
  });

  test("coverage identifies required English and optional missing locales", () => {
    const coverage = buildTranslationCoverage({
      type: "scenario",
      scenario: completeScenario,
      steps: [completeStep],
    });
    expect(coverage.completeCount).toBe(2);
    expect(coverage.requiredComplete).toBe(true);
    expect(coverage.optionalMissing).toEqual(["zh-CN"]);
    expect(coverage.items.find(item => item.locale === "en")).toMatchObject({ required: true, status: "complete" });
    expect(coverage.items.find(item => item.locale === "zh-CN")).toMatchObject({ required: false, status: "missing" });
  });

  test("scenario publish readiness blocks incomplete English but not optional locale gaps", () => {
    const ready = getScenarioPublishReadiness(completeScenario, [completeStep]);
    expect(ready.ready).toBe(true);
    expect(ready.optionalMissing).toEqual(["zh-CN"]);
    const missingEnglish = getScenarioPublishReadiness({ ...completeScenario, translations: {} }, [completeStep]);
    expect(missingEnglish.ready).toBe(false);
    expect(missingEnglish.reasons).toContain("english_required");
  });

  test("resource publish readiness keeps review/RAG separate from content completeness", () => {
    const readiness = getResourcePublishReadiness(
      { publicationStatus: "draft", reviewStatus: "draft", ragReady: false, categoryCode: "Scams" },
      { en: { title: "Title", summary: "Summary", body: "Body" } }
    );
    expect(readiness.ready).toBe(true);
    expect(readiness.reasons).toEqual([]);
  });
});

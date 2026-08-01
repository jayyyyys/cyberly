export const ADMIN_CONTENT_LOCALES = ["en", "ms", "zh-CN"];

export function isPresent(value) {
  return String(value || "").trim().length > 0;
}

export function isResourceTranslationComplete(translation) {
  return Boolean(translation && isPresent(translation.title) && isPresent(translation.summary) && isPresent(translation.body));
}

export function isScenarioTranslationComplete({ scenario, steps, locale }) {
  const definition = scenario?.translations?.[locale];
  if (!definition || !isPresent(definition.title) || !isPresent(definition.summary)) return false;
  const expectedSteps = Number(scenario?.totalSteps || 0);
  if (!Array.isArray(steps) || steps.length !== expectedSteps || expectedSteps < 1) return false;
  return steps.every(step => {
    const stepTranslation = Array.isArray(step.translations)
      ? step.translations.find(item => item.locale === locale)
      : null;
    if (!stepTranslation || !isPresent(stepTranslation.situationText) || !isPresent(stepTranslation.promptText)) return false;
    const options = Array.isArray(step.options) ? step.options : [];
    if (options.length < 1) return false;
    return options.every(option => {
      const optionTranslation = Array.isArray(step.optionTranslations)
        ? step.optionTranslations.find(item => item.locale === locale && item.optionKey === option.key)
        : null;
      return Boolean(
        optionTranslation
        && isPresent(optionTranslation.text)
        && isPresent(optionTranslation.feedback)
        && isPresent(optionTranslation.safetyExplanation)
      );
    });
  });
}

export function buildTranslationCoverage({ type, translations, scenario, steps, dirtyLocale = null }) {
  const items = ADMIN_CONTENT_LOCALES.map(locale => {
    const complete = type === "scenario"
      ? isScenarioTranslationComplete({ scenario, steps, locale })
      : isResourceTranslationComplete(translations?.[locale]);
    const exists = type === "scenario"
      ? Boolean(scenario?.translations?.[locale])
      : Boolean(translations?.[locale]);
    return {
      locale,
      required: locale === "en",
      exists,
      complete,
      dirty: dirtyLocale === locale,
      status: dirtyLocale === locale ? "unsaved" : complete ? "complete" : exists ? "incomplete" : "missing",
    };
  });
  return {
    items,
    completeCount: items.filter(item => item.complete).length,
    totalCount: items.length,
    requiredComplete: items.find(item => item.locale === "en")?.complete || false,
    optionalMissing: items.filter(item => !item.required && !item.complete).map(item => item.locale),
  };
}

export function getScenarioPublishReadiness(scenario, steps) {
  const reasons = [];
  const structuralReasons = Array.isArray(scenario?.structuralValidation?.reasons)
    ? scenario.structuralValidation.reasons
    : [];
  if (structuralReasons.length) reasons.push(...structuralReasons.map(reason => reason.code || reason));
  const coverage = buildTranslationCoverage({ type: "scenario", scenario, steps });
  if (!coverage.requiredComplete) reasons.push("english_required");
  if (scenario?.status === "archived") reasons.push("archived");
  return {
    ready: reasons.length === 0,
    reasons: Array.from(new Set(reasons)),
    optionalMissing: coverage.optionalMissing,
    coverage,
  };
}

export function getResourcePublishReadiness(resource, translations) {
  const reasons = [];
  const coverage = buildTranslationCoverage({ type: "resource", translations });
  if (!coverage.requiredComplete) reasons.push("english_required");
  if (!isPresent(resource?.categoryCode || resource?.category)) reasons.push("category_required");
  if (resource?.publicationStatus === "archived" || resource?.status === "archived") reasons.push("archived");
  return {
    ready: reasons.length === 0,
    reasons,
    optionalMissing: coverage.optionalMissing,
    coverage,
  };
}

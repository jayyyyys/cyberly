function toIso(value) {
  return value ? new Date(value).toISOString() : null;
}

function parseOptions(value) {
  return Array.isArray(value) ? value : JSON.parse(value || '[]');
}

function safeOptions(step) {
  return parseOptions(step.options_json).map(option => ({
    key: option.key,
    text: option.text,
  }));
}

function mapScenarioMeta(row, extras = {}) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    topicCode: row.topic_code,
    difficulty: row.difficulty,
    version: row.version,
    estimatedMinutes: row.estimated_minutes,
    totalSteps: row.total_steps,
    ...extras,
  };
}

function mapSafeStep(step) {
  if (!step) return null;
  return {
    id: step.id,
    stepOrder: step.step_order,
    situationText: step.situation_text,
    promptText: step.prompt_text,
    options: safeOptions(step),
  };
}

function mapDecisionFeedback(decision, step) {
  const option = parseOptions(step.options_json).find(item => item.key === decision.selected_option_key);
  return {
    stepId: step.id,
    stepOrder: step.step_order,
    selectedOptionKey: decision.selected_option_key,
    feedback: option?.feedback || '',
    safetyExplanation: option?.safetyExplanation || '',
    answeredAt: toIso(decision.answered_at),
  };
}

function mapAttempt(attempt, scenario, currentStep, decisions = [], steps = [], locale = null) {
  const stepById = new Map(steps.map(step => [Number(step.id), step]));
  return {
    attempt: {
      id: attempt.id,
      status: attempt.status,
      currentStepOrder: attempt.current_step_order,
      totalScore: attempt.total_score,
      maximumScore: attempt.maximum_score,
      percentage: attempt.percentage,
      resultLevel: attempt.result_level,
      startedAt: toIso(attempt.started_at),
      completedAt: toIso(attempt.completed_at),
    },
    scenario: mapScenarioMeta(scenario),
    ...(locale ? { locale } : {}),
    currentStep: mapSafeStep(currentStep),
    decisions: decisions.map(decision => {
      const step = stepById.get(Number(decision.step_id));
      return step ? mapDecisionFeedback(decision, step) : null;
    }).filter(Boolean),
  };
}

function mapCompletedResult(attempt, scenario, steps, decisions, progressImpact, recommendation, locale = null) {
  return {
    attempt: {
      id: attempt.id,
      status: attempt.status,
      totalScore: attempt.total_score,
      maximumScore: attempt.maximum_score,
      percentage: attempt.percentage,
      resultLevel: attempt.result_level,
      completedAt: toIso(attempt.completed_at),
    },
    scenario: mapScenarioMeta(scenario),
    ...(locale ? { locale } : {}),
    review: decisions.map(decision => {
      const step = steps.find(item => Number(item.id) === Number(decision.step_id));
      return {
        ...mapSafeStep(step),
        selectedOptionKey: decision.selected_option_key,
        awardedScore: decision.awarded_score,
        feedback: parseOptions(step.options_json).find(option => option.key === decision.selected_option_key)?.feedback || '',
        safetyExplanation: parseOptions(step.options_json).find(option => option.key === decision.selected_option_key)?.safetyExplanation || '',
      };
    }),
    progressImpact,
    recommendation,
  };
}

module.exports = {
  mapAttempt,
  mapCompletedResult,
  mapDecisionFeedback,
  mapSafeStep,
  mapScenarioMeta,
  parseOptions,
};

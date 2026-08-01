const {
  mapAttempt,
  mapCompletedResult,
  mapDecisionFeedback,
  mapSafeStep,
  mapScenarioMeta,
  parseOptions,
} = require('./scenario.mapper');
const { calculateScenarioScore, getMasteryDelta } = require('./scenario.scoring');
const { selectScenarioCandidates } = require('./scenarioRecommendation');
const {
  isValidDifficulty,
  isValidTopicCode,
  normalizeSlug,
  validateDecisionInput,
} = require('./scenario.validation');
const { normalizeLocale } = require('../i18n/locale');
const { ERROR_CODES } = require('../errors/errorCodes');

function httpError(status, code, message, errors) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  if (errors) error.errors = errors;
  return error;
}

function createScenarioService(repository, progressService) {
  async function listScenarios(userId, filters = {}, localeInput) {
    const locale = normalizeLocale(localeInput);
    const topicCode = filters.topicCode && isValidTopicCode(filters.topicCode) ? filters.topicCode : null;
    const difficulty = filters.difficulty && isValidDifficulty(filters.difficulty) ? filters.difficulty : null;
    const rows = await repository.listPublishedScenarios({ topicCode, difficulty }, userId, locale);
    return {
      scenarios: rows.map(row => mapScenarioMeta(row, {
        latestAttempt: row.latest_attempt_id ? {
          id: row.latest_attempt_id,
          status: row.latest_attempt_status,
          resultLevel: row.latest_result_level,
          percentage: row.latest_percentage,
        } : null,
      })),
    };
  }

  async function getScenario(slug, localeInput) {
    const locale = normalizeLocale(localeInput);
    const scenario = await repository.findPublishedBySlug(normalizeSlug(slug), locale);
    if (!scenario) throw httpError(404, ERROR_CODES.SCENARIO_NOT_FOUND, 'Scenario was not found.');
    const localeResolution = await repository.getLocaleResolution(scenario.id, locale);
    const firstStep = await repository.findStepByOrder(scenario.id, 1, locale);
    return {
      scenario: mapScenarioMeta(scenario),
      locale: localeResolution,
      firstStep: mapSafeStep(firstStep),
      choicesFinal: true,
    };
  }

  async function startOrResume(userId, slug, localeInput) {
    const locale = normalizeLocale(localeInput);
    return repository.withTransaction(async (connection) => {
      const scenario = await repository.findPublishedBySlug(normalizeSlug(slug), locale, connection);
      if (!scenario) throw httpError(404, ERROR_CODES.SCENARIO_NOT_FOUND, 'Scenario was not found.');
      let attempt = await repository.findInProgressAttempt(userId, scenario.id, connection);
      if (!attempt) attempt = await repository.createAttempt(userId, scenario.id, connection);
      const localeResolution = await repository.getLocaleResolution(scenario.id, locale, connection);
      const steps = await repository.listSteps(scenario.id, locale, connection);
      const decisions = await repository.listDecisions(attempt.id, connection);
      const currentStep = decisions.length === steps.length
        ? null
        : steps.find(step => Number(step.step_order) === Number(attempt.current_step_order)) || steps[0];
      return mapAttempt(attempt, scenario, currentStep, decisions, steps, localeResolution);
    });
  }

  async function getAttempt(userId, attemptId, localeInput) {
    const locale = normalizeLocale(localeInput);
    const attempt = await repository.findAttemptById(Number(attemptId));
    if (!attempt || attempt.user_id !== userId) throw httpError(404, ERROR_CODES.SCENARIO_ATTEMPT_NOT_FOUND, 'Scenario attempt was not found.');
    const scenario = await repository.findScenarioById(attempt.scenario_id, locale);
    const localeResolution = await repository.getLocaleResolution(scenario.id, locale);
    const steps = await repository.listSteps(scenario.id, locale);
    const decisions = await repository.listDecisions(attempt.id);
    const currentStep = attempt.status === 'completed' || decisions.length === steps.length
      ? null
      : steps.find(step => Number(step.step_order) === Number(attempt.current_step_order));
    return mapAttempt(attempt, scenario, currentStep, decisions, steps, localeResolution);
  }

  async function saveDecision(userId, attemptId, body, localeInput) {
    const locale = normalizeLocale(localeInput);
    const validation = validateDecisionInput(body);
    if (!validation.ok) throw httpError(400, ERROR_CODES.SCENARIO_DECISION_INVALID, 'Decision details are invalid.', validation.errors);

    return repository.withTransaction(async (connection) => {
      const attempt = await repository.findAttemptById(Number(attemptId), connection);
      if (!attempt || attempt.user_id !== userId) throw httpError(404, ERROR_CODES.SCENARIO_ATTEMPT_NOT_FOUND, 'Scenario attempt was not found.');
      if (attempt.status !== 'in_progress') throw httpError(409, ERROR_CODES.SCENARIO_ALREADY_COMPLETED, 'Scenario attempt is already completed.');

      const scenario = await repository.findScenarioById(attempt.scenario_id, locale, connection);
      const localeResolution = await repository.getLocaleResolution(scenario.id, locale, connection);
      const step = await repository.findStep(validation.value.stepId, locale, connection);
      if (!step || step.scenario_id !== scenario.id) throw httpError(400, ERROR_CODES.SCENARIO_STEP_MISMATCH, 'Step does not belong to this scenario.');
      if (Number(step.step_order) !== Number(attempt.current_step_order)) {
        throw httpError(409, ERROR_CODES.SCENARIO_STEP_OUT_OF_ORDER, 'Complete the current scenario step before moving ahead.');
      }

      const existingDecision = await repository.findDecision(attempt.id, step.id, connection);
      if (existingDecision) throw httpError(409, ERROR_CODES.SCENARIO_CHOICE_FINAL, 'Scenario choices are final after submission.');

      const option = parseOptions(step.options_json).find(item => item.key === validation.value.selectedOptionKey);
      if (!option) throw httpError(400, ERROR_CODES.SCENARIO_OPTION_INVALID, 'Selected option is not valid for this step.');

      const decision = await repository.createDecision(attempt.id, {
        stepId: step.id,
        selectedOptionKey: option.key,
        awardedScore: Number(option.score),
        outcomeCode: option.outcomeCode,
      }, connection);

      const nextStepOrder = option.nextStepOrder || (Number(step.step_order) < Number(scenario.total_steps) ? Number(step.step_order) + 1 : null);
      const nextStep = nextStepOrder ? await repository.findStepByOrder(scenario.id, nextStepOrder, locale, connection) : null;
      const updatedAttempt = await repository.updateCurrentStep(attempt.id, nextStep ? nextStep.step_order : scenario.total_steps, connection);

      return {
        locale: localeResolution,
        attempt: {
          id: updatedAttempt.id,
          status: updatedAttempt.status,
          currentStepOrder: updatedAttempt.current_step_order,
        },
        decision: mapDecisionFeedback(decision, step),
        nextStep: mapSafeStep(nextStep),
        readyToComplete: !nextStep,
      };
    });
  }

  async function completeAttempt(userId, attemptId, localeInput) {
    const locale = normalizeLocale(localeInput);
    return repository.withTransaction(async (connection) => {
      const attempt = await repository.findAttemptById(Number(attemptId), connection);
      if (!attempt || attempt.user_id !== userId) throw httpError(404, ERROR_CODES.SCENARIO_ATTEMPT_NOT_FOUND, 'Scenario attempt was not found.');
      const scenario = await repository.findScenarioById(attempt.scenario_id, locale, connection);
      const localeResolution = await repository.getLocaleResolution(scenario.id, locale, connection);
      const steps = await repository.listSteps(scenario.id, locale, connection);
      const decisions = await repository.listDecisions(attempt.id, connection);

      if (attempt.status === 'completed') {
        const existingImpact = await repository.getProgressEventForAttempt(attempt.id, connection);
        return mapCompletedResult(attempt, scenario, steps, decisions, {
          applied: false,
          masteryDelta: existingImpact?.mastery_delta || getMasteryDelta(attempt.percentage),
        }, (await progressService.getCurrentRecommendation(userId, locale)).recommendation, localeResolution);
      }

      if (decisions.length !== steps.length) {
        throw httpError(409, ERROR_CODES.SCENARIO_INCOMPLETE, 'All scenario steps must be answered before completion.');
      }

      const score = calculateScenarioScore(steps, decisions);
      const completedAttempt = await repository.completeAttempt(attempt.id, score, connection);
      const progressImpact = await progressService.applyScenarioCompletion(userId, {
        scenarioAttemptId: completedAttempt.id,
        topicCode: scenario.topic_code,
        percentage: score.percentage,
        masteryDelta: getMasteryDelta(score.percentage),
      }, connection, locale);

      return mapCompletedResult(
        completedAttempt,
        scenario,
        steps,
        decisions,
        {
          applied: progressImpact.applied,
          masteryDelta: progressImpact.masteryDelta,
          summary: progressImpact.summary,
          topics: progressImpact.topics,
        },
        progressImpact.recommendation,
        localeResolution
      );
    });
  }

  async function getResult(userId, attemptId, localeInput) {
    const locale = normalizeLocale(localeInput);
    const attempt = await repository.findAttemptById(Number(attemptId));
    if (!attempt || attempt.user_id !== userId || attempt.status !== 'completed') {
      throw httpError(404, ERROR_CODES.SCENARIO_RESULT_NOT_FOUND, 'Completed scenario result was not found.');
    }
    const scenario = await repository.findScenarioById(attempt.scenario_id, locale);
    const localeResolution = await repository.getLocaleResolution(scenario.id, locale);
    const [steps, decisions, progressEvent, currentRecommendation] = await Promise.all([
      repository.listSteps(scenario.id, locale),
      repository.listDecisions(attempt.id),
      repository.getProgressEventForAttempt(attempt.id),
      progressService.getCurrentRecommendation(userId, locale),
    ]);
    return mapCompletedResult(attempt, scenario, steps, decisions, {
      applied: Boolean(progressEvent),
      masteryDelta: progressEvent?.mastery_delta || getMasteryDelta(attempt.percentage),
    }, currentRecommendation.recommendation, localeResolution);
  }

  async function getRecommendedScenarios(userId, localeInput) {
    const locale = normalizeLocale(localeInput);
    const currentRecommendation = await progressService.getCurrentRecommendation(userId, locale);
    const recommendation = currentRecommendation.recommendation;
    if (!recommendation?.topicCode) return { recommendation, scenarios: [] };

    const all = (await repository.listPublishedScenarios({}, userId, locale))
      .map(row => mapScenarioMeta(row, {
        latestAttempt: row.latest_attempt_id ? {
          id: row.latest_attempt_id,
          status: row.latest_attempt_status,
          resultLevel: row.latest_result_level,
          percentage: row.latest_percentage,
        } : null,
      }));

    const ranked = selectScenarioCandidates({
      scenarios: all,
      topicCode: recommendation.topicCode,
      recommendedLevel: recommendation.recommendedLevel || 'beginner',
      limit: 1,
    });

    return { recommendation, scenarios: ranked };
  }

  async function getScenarioDashboard(userId, localeInput) {
    const locale = normalizeLocale(localeInput);
    const stats = await repository.listCompletedScenarioStats(userId, locale);
    return {
      completedCount: Number(stats.completedCount || 0),
      latestCompleted: stats.latestCompleted ? {
        attemptId: stats.latestCompleted.id,
        slug: stats.latestCompleted.slug,
        title: stats.latestCompleted.title,
        topicCode: stats.latestCompleted.topic_code,
        difficulty: stats.latestCompleted.difficulty,
        percentage: stats.latestCompleted.percentage,
        resultLevel: stats.latestCompleted.result_level,
      } : null,
      inProgress: stats.inProgress ? {
        attemptId: stats.inProgress.id,
        slug: stats.inProgress.slug,
        title: stats.inProgress.title,
        topicCode: stats.inProgress.topic_code,
        difficulty: stats.inProgress.difficulty,
        currentStepOrder: stats.inProgress.current_step_order,
      } : null,
    };
  }

  return {
    completeAttempt,
    getAttempt,
    getRecommendedScenarios,
    getResult,
    getScenario,
    getScenarioDashboard,
    listScenarios,
    saveDecision,
    startOrResume,
  };
}

module.exports = {
  createScenarioService,
};

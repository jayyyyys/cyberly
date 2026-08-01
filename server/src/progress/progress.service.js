const { mapAssessmentTopicResult, mapProgressSummary, mapRecommendation, mapTopicProgress } = require('./progress.mapper');
const { buildActivityComposition } = require('./progress.composition');
const { buildLearningPathProgress } = require('./learning-path-progress.service');
const { getLevelForPercentage, selectRecommendation } = require('./progress.rules');
const { selectScenarioCandidates } = require('../scenario/scenarioRecommendation');
const { normalizeLocale } = require('../i18n/locale');
const { ERROR_CODES } = require('../errors/errorCodes');

function httpError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function calculateSummary(topicRows) {
  const completedTopicCount = topicRows.length;
  const totalActivityCount = topicRows.reduce((sum, topic) => sum + Number(topic.activity_count || 0), 0);
  const overallMasteryPercentage = completedTopicCount
    ? Math.round(topicRows.reduce((sum, topic) => sum + Number(topic.mastery_percentage), 0) / completedTopicCount)
    : 0;

  return {
    overallMasteryPercentage,
    measuredLevel: getLevelForPercentage(overallMasteryPercentage),
    completedTopicCount,
    totalActivityCount,
  };
}

function toIso(value) {
  return value ? new Date(value).toISOString() : null;
}

function mapRecentActivity(row, type) {
  if (type === 'assessment_completed') {
    return {
      type,
      label: 'Initial assessment completed',
      occurredAt: toIso(row.completed_at),
      source: 'assessment_attempts',
    };
  }
  if (type === 'scenario_completed') {
    return {
      type,
      label: row.title || 'Scenario completed',
      topicCode: row.topic_code || null,
      scenarioSlug: row.slug || null,
      occurredAt: toIso(row.completed_at),
      source: 'scenario_attempts',
    };
  }
  return {
    type: 'recommendation_completed',
    label: 'Recommendation completed',
    topicCode: row.topic_code || null,
    recommendationId: row.id,
    occurredAt: toIso(row.completed_at),
    source: 'learner_recommendations',
  };
}

function scenarioTopicCode(scenario = {}) {
  return scenario.topicCode || scenario.topic_code || null;
}

function scenarioTargetExtras(scenario = null) {
  if (!scenario) return {};
  return {
    targetScenarioId: Number(scenario.id),
    targetScenarioSlug: scenario.slug || null,
    targetScenarioTitle: scenario.title || null,
  };
}

function recommendationFromScenario(scenario, base = {}) {
  const topicCode = scenarioTopicCode(scenario);
  return {
    recommendationType: scenario.recommendationMode === 'review' ? 'review_topic' : 'next_topic',
    topicCode,
    recommendedLevel: scenario.difficulty || base.recommended_level || base.recommendedLevel || 'beginner',
    reasonCode: scenario.recommendationMode === 'review'
      ? 'continue_progress'
      : (base.reason_code && base.reason_code !== 'assessment_pending' ? base.reason_code : 'continue_progress'),
    reasonText: scenario.recommendationMode === 'review'
      ? 'Review a previous scenario to strengthen this topic.'
      : 'Continue with a recommended Cyberly scenario.',
    sourceType: 'scenario',
    sourceReferenceId: Number(scenario.id),
  };
}

function createProgressService(repository) {
  async function selectCanonicalScenario(userId, recommendation, locale, connection) {
    if (!recommendation?.topic_code && !recommendation?.topicCode) return null;
    const scenarios = await repository.listScenarioRecommendationCandidates(userId, locale, connection);
    const [scenario] = selectScenarioCandidates({
      scenarios,
      topicCode: recommendation.topic_code || recommendation.topicCode,
      recommendedLevel: recommendation.recommended_level || recommendation.recommendedLevel,
      limit: 1,
    });
    return scenario || null;
  }

  async function createFreshScenarioRecommendation(userId, locale, baseRecommendation = {}, connection) {
    const scenarios = await repository.listScenarioRecommendationCandidates(userId, locale, connection);
    const [scenario] = selectScenarioCandidates({
      scenarios,
      topicCode: baseRecommendation.topic_code || baseRecommendation.topicCode || null,
      recommendedLevel: baseRecommendation.recommended_level || baseRecommendation.recommendedLevel || null,
      limit: 1,
    });
    if (!scenario) return null;
    await repository.supersedeActiveRecommendations(userId, connection);
    return repository.createRecommendation(userId, recommendationFromScenario(scenario, baseRecommendation), connection);
  }

  async function ensureActionableCurrentRecommendation(userId, recommendation, locale, connection) {
    if (!recommendation) return null;
    if (!['active', 'viewed'].includes(recommendation.status)) return null;
    const scenario = await selectCanonicalScenario(userId, recommendation, locale, connection);
    if (!scenario) return recommendation;

    const recommendationTopic = recommendation.topic_code || recommendation.topicCode || null;
    const selectedTopic = scenarioTopicCode(scenario);
    const shouldReplace = selectedTopic && recommendationTopic && selectedTopic !== recommendationTopic;
    if (shouldReplace) {
      return createFreshScenarioRecommendation(userId, locale, recommendation, connection);
    }
    return {
      ...recommendation,
      ...scenarioTargetExtras(scenario),
    };
  }

  async function syncInitialAssessment(userId, attemptId, externalConnection, localeInput) {
    const locale = normalizeLocale(localeInput);
    const runner = async (connection) => {
      const attempt = await repository.findAttemptForUser(userId, attemptId, connection);
      if (!attempt) throw httpError(404, ERROR_CODES.PROGRESS_ASSESSMENT_NOT_FOUND, 'Completed initial assessment was not found.');

      const topicScores = await repository.listTopicScoresForAttempt(attempt.id, connection);
      if (topicScores.length === 0) throw httpError(400, ERROR_CODES.PROGRESS_TOPIC_SCORES_UNAVAILABLE, 'Assessment topic scores are not available.');

      for (const topic of topicScores) {
        await repository.upsertTopicProgress(userId, {
          topicCode: topic.topic_code,
          currentLevel: getLevelForPercentage(topic.percentage),
          masteryPercentage: topic.percentage,
          sourceType: 'initial_assessment',
          sourceReferenceId: attempt.id,
        }, connection);
      }

      const topicProgressRows = await repository.listTopicProgress(userId, connection);
      const summary = calculateSummary(topicProgressRows);
      await repository.upsertSummary(userId, summary, connection);

      const recommendation = selectRecommendation(topicScores.map(topic => ({
        topicCode: topic.topic_code,
        percentage: topic.percentage,
        sourceReferenceId: attempt.id,
      })));

      await repository.supersedeActiveRecommendations(userId, connection);
      const savedRecommendation = await repository.createRecommendation(userId, recommendation, connection);

      const actionableRecommendation = await ensureActionableCurrentRecommendation(userId, savedRecommendation, locale, connection);

      return {
        summary: mapProgressSummary(await repository.getSummary(userId, connection)),
        topics: topicProgressRows.map(mapTopicProgress),
        recommendation: mapRecommendation(actionableRecommendation, locale),
      };
    };

    if (externalConnection) return runner(externalConnection);
    return repository.withTransaction(runner);
  }

  async function syncLatestInitialAssessment(userId, localeInput) {
    const locale = normalizeLocale(localeInput);
    return repository.withTransaction(async (connection) => {
      const attempt = await repository.findLatestCompletedInitialAttempt(userId, connection);
      if (!attempt) {
        await repository.supersedeActiveRecommendations(userId, connection);
        const recommendation = await repository.createRecommendation(userId, selectRecommendation([]), connection);
        const actionableRecommendation = await ensureActionableCurrentRecommendation(userId, recommendation, locale, connection);
        return {
          summary: mapProgressSummary(await repository.getSummary(userId, connection)),
          topics: (await repository.listTopicProgress(userId, connection)).map(mapTopicProgress),
          recommendation: mapRecommendation(actionableRecommendation, locale),
        };
      }
      return syncInitialAssessment(userId, attempt.id, connection, locale);
    });
  }

  async function getProgress(userId) {
    const [summary, topics, latestAttempt] = await Promise.all([
      repository.getSummary(userId),
      repository.listTopicProgress(userId),
      repository.findLatestCompletedInitialAttempt(userId),
    ]);
    const assessmentTopicRows = latestAttempt
      ? await repository.listTopicScoresForAttempt(latestAttempt.id)
      : [];
    const [
      completedScenarioCount,
      completedRecommendationCount,
      recentScenarios,
      recentRecommendations,
    ] = await Promise.all([
      repository.countUniqueCompletedScenarios(userId),
      repository.countCompletedRecommendations(userId),
      repository.listRecentCompletedScenarioActivities(userId, 5),
      repository.listRecentCompletedRecommendationActivities(userId, 5),
    ]);
    const recentLearningActivity = [
      ...(latestAttempt?.completed_at ? [mapRecentActivity(latestAttempt, 'assessment_completed')] : []),
      ...recentScenarios.map(row => mapRecentActivity(row, 'scenario_completed')),
      ...recentRecommendations.map(row => mapRecentActivity(row, 'recommendation_completed')),
    ]
      .filter(activity => activity.occurredAt)
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
      .slice(0, 5);

    return {
      summary: mapProgressSummary(summary),
      topics: topics.map(mapTopicProgress),
      learningPathProgress: await buildLearningPathProgress(repository, userId),
      activityComposition: buildActivityComposition({
        assessedTopicCount: assessmentTopicRows.length,
        completedScenarioCount,
        completedRecommendationCount,
      }),
      recentLearningActivity,
      assessmentTopicResults: assessmentTopicRows.map(row => mapAssessmentTopicResult({
        ...row,
        current_level: getLevelForPercentage(row.percentage),
      })),
      latestCompletedAssessment: latestAttempt ? {
        attemptId: latestAttempt.id,
        completedAt: latestAttempt.completed_at ? new Date(latestAttempt.completed_at).toISOString() : null,
        measuredLevel: latestAttempt.measured_level,
        percentage: latestAttempt.percentage,
      } : null,
    };
  }

  async function getCurrentRecommendation(userId, localeInput) {
    const locale = normalizeLocale(localeInput);
    return repository.withTransaction(async (connection) => {
      let recommendation = await repository.getCurrentRecommendation(userId, connection);
      if (!recommendation) {
        const latestAttempt = await repository.findLatestCompletedInitialAttempt(userId, connection);
        if (!latestAttempt) {
          await repository.supersedeActiveRecommendations(userId, connection);
          const savedRecommendation = await repository.createRecommendation(userId, selectRecommendation([]), connection);
          const actionableRecommendation = await ensureActionableCurrentRecommendation(userId, savedRecommendation, locale, connection);
          return { exists: true, recommendation: mapRecommendation(actionableRecommendation, locale) };
        }
        const result = await syncInitialAssessment(userId, latestAttempt.id, connection, locale);
        recommendation = result.recommendation;
        return { exists: true, recommendation };
      }
      const actionableRecommendation = await ensureActionableCurrentRecommendation(userId, recommendation, locale, connection);
      return { exists: Boolean(actionableRecommendation), recommendation: mapRecommendation(actionableRecommendation, locale) };
    });
  }

  async function markViewed(userId, id, localeInput) {
    const locale = normalizeLocale(localeInput);
    const recommendation = await repository.markRecommendationViewed(userId, Number(id));
    if (!recommendation || recommendation.user_id !== userId) throw httpError(404, ERROR_CODES.RECOMMENDATION_NOT_FOUND, 'Recommendation was not found.');
    return { recommendation: mapRecommendation(recommendation, locale) };
  }

  async function markCompleted(userId, id, localeInput) {
    const locale = normalizeLocale(localeInput);
    return repository.withTransaction(async (connection) => {
      const completedRecommendation = await repository.markRecommendationCompleted(userId, Number(id), connection);
      if (!completedRecommendation || completedRecommendation.user_id !== userId) throw httpError(404, ERROR_CODES.RECOMMENDATION_NOT_FOUND, 'Recommendation was not found.');
      let currentRecommendation = await repository.getCurrentRecommendation(userId, connection);
      if (!currentRecommendation) {
        currentRecommendation = await createFreshScenarioRecommendation(userId, locale, completedRecommendation, connection);
      }
      currentRecommendation = await ensureActionableCurrentRecommendation(userId, currentRecommendation, locale, connection);
      return {
        completedRecommendation: mapRecommendation(completedRecommendation, locale),
        recommendation: mapRecommendation(currentRecommendation, locale),
      };
    });
  }

  async function applyScenarioCompletion(userId, scenarioResult, externalConnection, localeInput) {
    const locale = normalizeLocale(localeInput);
    const runner = async (connection) => {
      const existingEvent = await repository.getScenarioProgressEvent(scenarioResult.scenarioAttemptId, connection);
      if (existingEvent) {
        const currentRecommendation = await ensureActionableCurrentRecommendation(userId, await repository.getCurrentRecommendation(userId, connection), locale, connection);
        return {
          applied: false,
          masteryDelta: existingEvent.mastery_delta,
          summary: mapProgressSummary(await repository.getSummary(userId, connection)),
          topics: (await repository.listTopicProgress(userId, connection)).map(mapTopicProgress),
          recommendation: mapRecommendation(currentRecommendation, locale),
        };
      }

      const masteryDelta = scenarioResult.masteryDelta;
      const wasCreated = await repository.createScenarioProgressEvent(userId, {
        scenarioAttemptId: scenarioResult.scenarioAttemptId,
        topicCode: scenarioResult.topicCode,
        masteryDelta,
      }, connection);

      if (wasCreated) {
        await repository.applyScenarioTopicProgress(userId, {
          topicCode: scenarioResult.topicCode,
          currentLevel: getLevelForPercentage(masteryDelta),
          masteryPercentage: masteryDelta,
          masteryDelta,
          sourceReferenceId: scenarioResult.scenarioAttemptId,
        }, connection);
      }

      const topicProgressRows = await repository.listTopicProgress(userId, connection);
      const summary = calculateSummary(topicProgressRows);
      await repository.upsertSummary(userId, summary, connection);

      const recommendation = selectRecommendation(topicProgressRows.map(topic => ({
        topicCode: topic.topic_code,
        percentage: topic.mastery_percentage,
        sourceReferenceId: scenarioResult.scenarioAttemptId,
      })));
      recommendation.sourceType = 'scenario';
      recommendation.sourceReferenceId = scenarioResult.scenarioAttemptId;

      await repository.supersedeActiveRecommendations(userId, connection);
      const savedRecommendation = await repository.createRecommendation(userId, recommendation, connection);
      const actionableRecommendation = await ensureActionableCurrentRecommendation(userId, savedRecommendation, locale, connection);

      return {
        applied: wasCreated,
        masteryDelta,
        summary: mapProgressSummary(await repository.getSummary(userId, connection)),
        topics: topicProgressRows.map(mapTopicProgress),
        recommendation: mapRecommendation(actionableRecommendation, locale),
      };
    };

    if (externalConnection) return runner(externalConnection);
    return repository.withTransaction(runner);
  }

  return {
    applyScenarioCompletion,
    getCurrentRecommendation,
    getProgress,
    markCompleted,
    markViewed,
    syncInitialAssessment,
    syncLatestInitialAssessment,
  };
}

module.exports = {
  createProgressService,
};

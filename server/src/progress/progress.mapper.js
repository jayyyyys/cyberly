const { TOPIC_LABELS } = require('./progress.rules');
const { buildRecommendationReasonText } = require('./recommendationMessages');

function toIso(value) {
  return value ? new Date(value).toISOString() : null;
}

function mapTopicProgress(row) {
  return {
    topicCode: row.topic_code,
    topicLabel: TOPIC_LABELS[row.topic_code] || row.topic_code,
    currentLevel: row.current_level,
    masteryPercentage: row.mastery_percentage,
    sourceType: row.source_type,
    sourceReferenceId: row.source_reference_id,
    activityCount: row.activity_count,
    lastActivityAt: toIso(row.last_activity_at),
    updatedAt: toIso(row.updated_at),
  };
}

function mapAssessmentTopicResult(row) {
  return {
    topicCode: row.topic_code,
    topicLabel: TOPIC_LABELS[row.topic_code] || row.topic_code,
    correctCount: row.correct_count,
    totalCount: row.total_count,
    percentage: row.percentage,
    resultLevel: row.current_level || null,
    sourceType: 'initial_assessment',
  };
}

function mapProgressSummary(row) {
  if (!row) {
    return {
      exists: false,
      overallMasteryPercentage: 0,
      measuredLevel: null,
      completedTopicCount: 0,
      totalActivityCount: 0,
      lastProgressAt: null,
    };
  }

  return {
    exists: true,
    overallMasteryPercentage: row.overall_mastery_percentage,
    measuredLevel: row.measured_level,
    completedTopicCount: row.completed_topic_count,
    totalActivityCount: row.total_activity_count,
    lastProgressAt: toIso(row.last_progress_at),
  };
}

function mapRecommendation(row, locale = 'en') {
  if (!row) return null;
  const targetScenarioId = Number(row.targetScenarioId || row.target_scenario_id || 0) || null;
  const targetScenarioSlug = row.targetScenarioSlug || row.target_scenario_slug || null;
  return {
    id: row.id,
    recommendationType: row.recommendation_type,
    topicCode: row.topic_code,
    topicLabel: row.topic_code ? TOPIC_LABELS[row.topic_code] || row.topic_code : null,
    recommendedLevel: row.recommended_level,
    reasonCode: row.reason_code,
    reasonText: buildRecommendationReasonText(row, locale),
    sourceType: row.source_type,
    sourceReferenceId: row.source_reference_id,
    status: row.status,
    generatedAt: toIso(row.generated_at),
    viewedAt: toIso(row.viewed_at),
    completedAt: toIso(row.completed_at),
    targetScenarioId,
    targetScenarioSlug,
    targetScenarioTitle: row.targetScenarioTitle || row.target_scenario_title || null,
    target: targetScenarioId || targetScenarioSlug ? {
      page: 'scenarios',
      ...(targetScenarioId ? { scenarioId: targetScenarioId } : {}),
      ...(targetScenarioSlug ? { scenarioSlug: targetScenarioSlug } : {}),
    } : null,
  };
}

module.exports = {
  mapAssessmentTopicResult,
  mapProgressSummary,
  mapRecommendation,
  mapTopicProgress,
};

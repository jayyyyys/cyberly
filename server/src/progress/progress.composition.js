const ACTIVITY_SEGMENT_IDS = {
  ASSESSMENT_TOPICS: 'assessment_topics',
  COMPLETED_SCENARIOS: 'completed_scenarios',
  COMPLETED_RECOMMENDATIONS: 'completed_recommendations',
};

const SEGMENT_SOURCES = {
  [ACTIVITY_SEGMENT_IDS.ASSESSMENT_TOPICS]: 'assessment_topic_scores',
  [ACTIVITY_SEGMENT_IDS.COMPLETED_SCENARIOS]: 'scenario_attempts.completed_distinct_scenario',
  [ACTIVITY_SEGMENT_IDS.COMPLETED_RECOMMENDATIONS]: 'learner_recommendations.completed',
};

const DISCLAIMER = 'This overview reflects your recorded Cyberly learning activities. It does not measure your overall cybersecurity ability.';

function pluralize(count, singular, plural) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function buildDisplayValue(id, count) {
  if (id === ACTIVITY_SEGMENT_IDS.ASSESSMENT_TOPICS) return pluralize(count, 'assessed topic', 'assessed topics');
  if (id === ACTIVITY_SEGMENT_IDS.COMPLETED_SCENARIOS) return pluralize(count, 'completed scenario', 'completed scenarios');
  if (id === ACTIVITY_SEGMENT_IDS.COMPLETED_RECOMMENDATIONS) return pluralize(count, 'completed recommendation', 'completed recommendations');
  return pluralize(count, 'recorded activity', 'recorded activities');
}

function normalizeCount(value) {
  const count = Number(value || 0);
  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
}

function allocateRoundedShares(segments, total) {
  if (!total || segments.length === 0) return segments.map(() => 0);
  const raw = segments.map((segment, index) => {
    return {
      index,
      floor: Math.floor((segment.count * 100) / total),
      remainder: (segment.count * 100) % total,
    };
  });
  let remaining = 100 - raw.reduce((sum, item) => sum + item.floor, 0);
  const shares = raw.map(item => item.floor);
  raw
    .slice()
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index)
    .forEach((item) => {
      if (remaining <= 0) return;
      shares[item.index] += 1;
      remaining -= 1;
    });
  return shares;
}

function buildActivityComposition({
  assessedTopicCount = 0,
  completedScenarioCount = 0,
  completedRecommendationCount = 0,
} = {}) {
  const candidates = [
    { id: ACTIVITY_SEGMENT_IDS.ASSESSMENT_TOPICS, count: normalizeCount(assessedTopicCount) },
    { id: ACTIVITY_SEGMENT_IDS.COMPLETED_SCENARIOS, count: normalizeCount(completedScenarioCount) },
    { id: ACTIVITY_SEGMENT_IDS.COMPLETED_RECOMMENDATIONS, count: normalizeCount(completedRecommendationCount) },
  ].filter(segment => segment.count > 0);

  const totalRecordedActivities = candidates.reduce((sum, segment) => sum + segment.count, 0);
  const shares = allocateRoundedShares(candidates, totalRecordedActivities);

  return {
    totalRecordedActivities,
    segments: candidates.map((segment, index) => ({
      id: segment.id,
      label: segment.id,
      count: segment.count,
      sharePercentage: shares[index] || 0,
      displayValue: buildDisplayValue(segment.id, segment.count),
      source: SEGMENT_SOURCES[segment.id],
      available: true,
    })),
    disclaimer: DISCLAIMER,
    generatedAt: new Date().toISOString(),
  };
}

module.exports = {
  ACTIVITY_SEGMENT_IDS,
  buildActivityComposition,
};

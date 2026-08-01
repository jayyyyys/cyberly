const { normalizeLocale } = require('../i18n/locale');
const { TOPIC_LABELS, TOPIC_PRIORITY } = require('../progress/progress.rules');

const LEARNER_LEVELS = [
  { code: 'L6', label: 'Cyber Champion', formReference: 'Form 5+', min: 92 },
  { code: 'L5', label: 'Advanced', formReference: 'Form 5', min: 82 },
  { code: 'L4', label: 'Proficient', formReference: 'Form 4', min: 70 },
  { code: 'L3', label: 'Developing', formReference: 'Form 3', min: 55 },
  { code: 'L2', label: 'Emerging', formReference: 'Form 2', min: 40 },
  { code: 'L1', label: 'Foundation', formReference: 'Form 1', min: 0 },
];

const SCHOOL_STAGE_LABELS = {
  form_1: 'Form 1',
  form_2: 'Form 2',
  form_3: 'Form 3',
  form_4: 'Form 4',
  form_5: 'Form 5',
};

function learnerLevelForScore(score, confidence) {
  const value = Number.isFinite(Number(score)) ? Number(score) : 0;
  const level = LEARNER_LEVELS.find(item => value >= item.min) || LEARNER_LEVELS[LEARNER_LEVELS.length - 1];
  return {
    code: level.code,
    label: level.label,
    formReference: level.formReference,
    confidence,
  };
}

function average(values) {
  const safe = values.map(Number).filter(Number.isFinite);
  if (!safe.length) return null;
  return Math.round(safe.reduce((sum, value) => sum + value, 0) / safe.length);
}

function weightedScore(assessmentPercentage, scenarioPercentage) {
  const hasAssessment = Number.isFinite(Number(assessmentPercentage));
  const hasScenario = Number.isFinite(Number(scenarioPercentage));
  if (hasAssessment && hasScenario) {
    return Math.round((Number(assessmentPercentage) * 0.55) + (Number(scenarioPercentage) * 0.45));
  }
  if (hasAssessment) return Number(assessmentPercentage);
  if (hasScenario) return Number(scenarioPercentage);
  return null;
}

function confidenceFor({ assessment, scenarios, topicScores }) {
  if (assessment && scenarios.length >= 2 && topicScores.length >= 2) return 'Medium';
  if (assessment || scenarios.length || topicScores.length >= 2) return 'Low';
  return 'Low';
}

function scenarioAverageByTopic(scenarios) {
  const buckets = new Map();
  for (const scenario of scenarios) {
    if (!scenario.topic_code || !Number.isFinite(Number(scenario.percentage))) continue;
    const values = buckets.get(scenario.topic_code) || [];
    values.push(Number(scenario.percentage));
    buckets.set(scenario.topic_code, values);
  }
  return new Map(Array.from(buckets.entries()).map(([topicCode, values]) => [topicCode, average(values)]));
}

function assessmentTopicMap(topicScores) {
  return new Map(topicScores.map(topic => [topic.topic_code, Number(topic.percentage)]));
}

function progressTopicMap(topicProgress) {
  return new Map(topicProgress.map(topic => [topic.topic_code, Number(topic.mastery_percentage)]));
}

function topicLabel(topicCode) {
  return TOPIC_LABELS[topicCode] || topicCode;
}

function focusReason(topicCode, evidence) {
  const label = topicLabel(topicCode);
  if (evidence.hasAssessment && evidence.hasScenario) {
    return `Assessment and scenario evidence suggest ${label} is a good topic to strengthen next.`;
  }
  if (evidence.hasAssessment) {
    return `Assessment evidence suggests ${label} is a good topic to strengthen next.`;
  }
  if (evidence.hasScenario) {
    return `Scenario evidence suggests ${label} is a good topic to strengthen next.`;
  }
  return `Available progress suggests ${label} is a good topic to strengthen next.`;
}

function buildFocusTopics(data) {
  const assessmentByTopic = assessmentTopicMap(data.assessmentTopicScores || []);
  const scenarioByTopic = scenarioAverageByTopic(data.scenarios || []);
  const progressByTopic = progressTopicMap(data.topicProgress || []);

  const candidates = TOPIC_PRIORITY.map(topicCode => {
    const assessment = assessmentByTopic.get(topicCode);
    const scenario = scenarioByTopic.get(topicCode);
    const progress = progressByTopic.get(topicCode);
    const score = weightedScore(assessment, scenario);
    const fallbackScore = Number.isFinite(score) ? score : progress;
    if (!Number.isFinite(Number(fallbackScore))) return null;
    return {
      topicCode,
      topicLabel: topicLabel(topicCode),
      score: Number(fallbackScore),
      hasAssessment: Number.isFinite(Number(assessment)),
      hasScenario: Number.isFinite(Number(scenario)),
    };
  }).filter(Boolean);

  const weak = candidates
    .filter(candidate => candidate.score < 70)
    .sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      return TOPIC_PRIORITY.indexOf(a.topicCode) - TOPIC_PRIORITY.indexOf(b.topicCode);
    })
    .slice(0, 3);

  if (!weak.length && data.recommendation?.topic_code) {
    const topicCode = data.recommendation.topic_code;
    return {
      primaryFocus: {
        topicCode,
        topicLabel: topicLabel(topicCode),
        reason: 'The current recommendation suggests this as one clear starting point.',
      },
      secondaryFocus: [],
    };
  }

  const [primary, ...secondary] = weak;
  return {
    primaryFocus: primary ? {
      topicCode: primary.topicCode,
      topicLabel: primary.topicLabel,
      reason: focusReason(primary.topicCode, primary),
    } : null,
    secondaryFocus: secondary.slice(0, 2).map(topic => ({
      topicCode: topic.topicCode,
      topicLabel: topic.topicLabel,
    })),
  };
}

function mapRecommendation(row) {
  if (!row || !row.topic_code) return null;
  return {
    topicCode: row.topic_code,
    topicLabel: topicLabel(row.topic_code),
    level: row.recommended_level || null,
    reasonCode: row.reason_code || null,
  };
}

function buildLearnerContext({ locale, data = {} }) {
  const scenarios = data.scenarios || [];
  const assessment = data.assessment || null;
  const scenarioPercentage = average(scenarios.map(item => item.percentage));
  const score = weightedScore(assessment?.percentage, scenarioPercentage);
  const confidence = confidenceFor({
    assessment,
    scenarios,
    topicScores: data.assessmentTopicScores || [],
  });
  const focus = buildFocusTopics(data);
  const schoolStage = SCHOOL_STAGE_LABELS[data.profile?.education_level] || null;

  const context = {
    locale: normalizeLocale(locale),
    ageBand: '13-17',
    learnerLevel: learnerLevelForScore(score, confidence),
  };

  if (schoolStage) context.schoolStage = schoolStage;
  if (focus.primaryFocus) context.primaryFocus = focus.primaryFocus;
  if (focus.secondaryFocus.length) context.secondaryFocus = focus.secondaryFocus;

  const recommendation = mapRecommendation(data.recommendation);
  if (recommendation) context.currentRecommendation = recommendation;

  return context;
}

module.exports = {
  buildLearnerContext,
};

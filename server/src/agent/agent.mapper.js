const { safeInternalTarget } = require('./agent.policy');

function clampText(value, maxLength = 220) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
}

function mapLearnerContext(context = {}) {
  return {
    ageBand: context.ageBand || '13-17',
    learnerLevel: context.learnerLevel ? {
      code: context.learnerLevel.code,
      label: context.learnerLevel.label,
      formReference: context.learnerLevel.formReference,
      confidence: context.learnerLevel.confidence,
    } : null,
    confidence: context.learnerLevel?.confidence || 'Low',
    primaryFocus: context.primaryFocus ? {
      topicCode: context.primaryFocus.topicCode,
      topicLabel: context.primaryFocus.topicLabel,
      reason: context.primaryFocus.reason,
    } : null,
    secondaryFocus: Array.isArray(context.secondaryFocus) ? context.secondaryFocus.slice(0, 2).map(topic => ({
      topicCode: topic.topicCode,
      topicLabel: topic.topicLabel,
    })) : [],
    currentRecommendation: context.currentRecommendation ? {
      topicCode: context.currentRecommendation.topicCode,
      topicLabel: context.currentRecommendation.topicLabel,
      level: context.currentRecommendation.level || null,
      reasonCode: context.currentRecommendation.reasonCode || null,
    } : null,
  };
}

function mapRecommendation(recommendation = null) {
  if (!recommendation) return {
    exists: false,
    internalTarget: { page: 'assessment' },
  };
  return {
    exists: true,
    topicCode: recommendation.topicCode || recommendation.topic_code || null,
    topicLabel: recommendation.topicLabel || null,
    level: recommendation.level || recommendation.recommended_level || null,
    reasonCode: recommendation.reasonCode || recommendation.reason_code || null,
    reason: recommendation.reason || recommendation.reason_text || null,
    internalTarget: { page: 'progress', sectionId: 'progress-recommendation' },
  };
}

function mapResourceResult(item = {}) {
  const target = safeInternalTarget({
    page: 'resources',
    resourceSlug: item.internalTarget?.resourceSlug || item.resourceSlug || item.slug,
    resourceId: item.internalTarget?.resourceId || item.resourceId || item.id,
  });
  if (!target) return null;
  return {
    title: clampText(item.title, 160),
    summary: clampText(item.summary || item.snippet, 260),
    categoryCode: item.categoryCode || item.category_code || null,
    topicCode: item.topicCode || item.topic_code || null,
    sourceLabel: item.sourceLabel || item.source_label || item.sourceOrganisation || null,
    internalTarget: target,
  };
}

function mapScenarioResult(item = {}) {
  const target = safeInternalTarget({
    page: 'scenarios',
    scenarioSlug: item.slug,
    scenarioId: item.id,
  });
  if (!target) return null;
  return {
    title: clampText(item.title, 160),
    summary: clampText(item.summary, 260),
    topicCode: item.topic_code || item.topicCode || null,
    difficulty: item.difficulty || null,
    completed: Number(item.completed_count || 0) > 0 || item.completed === true,
    internalTarget: target,
  };
}

function mapRouteStep(step = {}) {
  const target = safeInternalTarget(step.internalTarget);
  if (!target) return null;
  return {
    type: step.type,
    title: clampText(step.title, 160),
    reason: clampText(step.reason, 260),
    completed: step.completed === true ? true : step.completed === false ? false : undefined,
    internalTarget: target,
  };
}

module.exports = {
  clampText,
  mapLearnerContext,
  mapRecommendation,
  mapResourceResult,
  mapRouteStep,
  mapScenarioResult,
};

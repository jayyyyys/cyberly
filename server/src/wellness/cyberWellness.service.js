const { normalizeLocale } = require('../i18n/locale');
const {
  CYBER_WELLNESS_DOMAINS,
  DOMAIN_CATEGORY_MAP,
  DOMAIN_TOPIC_MAP,
} = require('./cyberWellness.constants');
const { classifyCyberWellness } = require('./cyberWellness.classifier');
const { buildCyberWellnessGuidance } = require('./cyberWellness.guidance');

function stableId(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function normalizeStatus(value) {
  return String(value || '').trim().toLowerCase();
}

function publishedOnly(items = []) {
  return (Array.isArray(items) ? items : []).filter(item => {
    const status = normalizeStatus(item.status || item.publicationStatus);
    if (!status) return true;
    return status === 'published';
  });
}

function pickSuggestedContent(domain, actionData = {}) {
  if (!Object.values(CYBER_WELLNESS_DOMAINS).includes(domain)) {
    return { resourceIds: [], scenarioIds: [] };
  }
  const categories = new Set((DOMAIN_CATEGORY_MAP[domain] || []).map(item => String(item).toLowerCase()));
  const topics = new Set((DOMAIN_TOPIC_MAP[domain] || []).map(item => String(item).toLowerCase()));
  const resourceIds = publishedOnly(actionData.resources)
    .filter(resource => categories.has(String(resource.categoryCode || resource.category_code || '').toLowerCase()))
    .map(resource => stableId(resource.id || resource.resourceId))
    .filter(Boolean)
    .slice(0, 2);
  const scenarioIds = publishedOnly(actionData.scenarios)
    .filter(scenario => topics.has(String(scenario.topicCode || scenario.topic_code || '').toLowerCase()))
    .map(scenario => stableId(scenario.id || scenario.scenarioId))
    .filter(Boolean)
    .slice(0, 2);
  return { resourceIds, scenarioIds };
}

function createCyberWellnessService() {
  function buildGuidance({ message, locale = 'en', actionData = {} } = {}) {
    normalizeLocale(locale);
    const classification = classifyCyberWellness({ message, locale });
    if (!classification) return null;
    return buildCyberWellnessGuidance({
      classification,
      locale,
      suggestions: pickSuggestedContent(classification.domain, actionData),
    });
  }

  return {
    buildGuidance,
  };
}

module.exports = {
  createCyberWellnessService,
  pickSuggestedContent,
};

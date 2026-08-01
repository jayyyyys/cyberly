function isPublishedResource(resource = {}) {
  if (resource.status && resource.status !== 'published') return false;
  return normalizeCategoryCode(resource) !== 'All';
}

function normalizeCategoryCode(resource = {}) {
  return resource.categoryCode || resource.category_code || null;
}

function countPublishedLearningTopicCategories(resources = []) {
  return new Set(
    resources
      .filter(isPublishedResource)
      .map(normalizeCategoryCode)
      .filter(categoryCode => categoryCode && categoryCode !== 'All')
  ).size;
}

function summarizePublishedResourceCatalog(resources = []) {
  const visibleResources = resources.filter(isPublishedResource);
  const categoryCodes = Array.from(new Set(
    visibleResources
      .map(normalizeCategoryCode)
      .filter(categoryCode => categoryCode && categoryCode !== 'All')
  ));

  return {
    guideCount: visibleResources.length,
    learningTopicCount: categoryCodes.length,
    categoryCodes,
  };
}

module.exports = {
  countPublishedLearningTopicCategories,
  summarizePublishedResourceCatalog,
};

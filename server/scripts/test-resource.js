const assert = require('node:assert/strict');
const { createPool } = require('../src/database/pool');
const { createResourceRepository } = require('../src/resource/resource.repository');
const { createResourceService } = require('../src/resource/resource.service');
const {
  countPublishedLearningTopicCategories,
  summarizePublishedResourceCatalog,
} = require('../src/resource/resource.semantics');

async function run() {
  const pool = createPool();
  const repository = createResourceRepository(pool);
  const service = createResourceService(repository);

  try {
    const result = await service.listResources('en');
    assert.ok(Array.isArray(result.resources));
    assert.ok(result.resources.length > 0);

    const summary = summarizePublishedResourceCatalog(result.resources);
    assert.equal(summary.guideCount, result.resources.length);
    assert.equal(summary.learningTopicCount, countPublishedLearningTopicCategories(result.resources));
    assert.ok(summary.learningTopicCount > 0);
    assert.ok(!summary.categoryCodes.includes('All'));
    assert.ok(!summary.categoryCodes.some(code => !code));

    const categorySet = new Set(result.resources.map(resource => resource.categoryCode).filter(Boolean));
    assert.equal(summary.learningTopicCount, categorySet.size);
  } finally {
    await pool.end();
  }
}

run()
  .then(() => {
    console.log('Resource semantic verification passed.');
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });

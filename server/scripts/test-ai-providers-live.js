const { createProviderRegistry } = require('../src/ai/providers/aiProvider.registry');

async function run() {
  if (process.env.AI_LIVE_TEST !== '1') {
    console.log('Skipping live AI provider smoke test. Set AI_LIVE_TEST=1 to run configured providers.');
    return;
  }

  const registry = createProviderRegistry();
  const status = registry.getSafeStatus();
  for (const provider of status.providers.filter(item => item.configured)) {
    const result = await registry.safeTestProvider(provider.id);
    console.log(JSON.stringify({
      provider: result.provider,
      model: result.model,
      status: result.status,
      code: result.code || null,
      latencyMs: result.latencyMs,
      testedAt: result.testedAt,
    }));
  }
}

run().catch(error => {
  console.error(error.code || 'AI_LIVE_TEST_FAILED');
  process.exitCode = 1;
});

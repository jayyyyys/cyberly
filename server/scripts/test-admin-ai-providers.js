const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const bcrypt = require('bcrypt');
const { createPool } = require('../src/database/pool');

const PORT = process.env.ADMIN_AI_PROVIDER_TEST_PORT || '5136';
const BASE_URL = `http://127.0.0.1:${PORT}`;
const PASSWORD = 'AdminAiProviders9';
const PREFIX = `test-admin-ai-providers-${Date.now()}`;

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getSetCookieHeaders(response) {
  if (typeof response.headers.getSetCookie === 'function') return response.headers.getSetCookie();
  const value = response.headers.get('set-cookie');
  return value ? [value] : [];
}

function mergeCookies(currentCookieHeader, response) {
  const cookieMap = new Map();
  if (currentCookieHeader) {
    for (const item of currentCookieHeader.split(';')) {
      const [name, ...valueParts] = item.trim().split('=');
      if (name) cookieMap.set(name, valueParts.join('='));
    }
  }
  for (const header of getSetCookieHeaders(response)) {
    const firstPart = header.split(';')[0];
    const [name, ...valueParts] = firstPart.split('=');
    if (!name) continue;
    const value = valueParts.join('=');
    if (value) cookieMap.set(name, value);
    else cookieMap.delete(name);
  }
  return Array.from(cookieMap.entries()).map(([name, value]) => `${name}=${value}`).join('; ');
}

async function request(method, pathName, body, cookieHeader = '') {
  const response = await fetch(`${BASE_URL}${pathName}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let json = {};
  if (text) {
    try { json = JSON.parse(text); } catch { json = { raw: text }; }
  }
  return { response, json, cookieHeader: mergeCookies(cookieHeader, response) };
}

function startServer() {
  const child = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      PORT,
      CLIENT_ORIGIN: 'http://localhost:3000',
      NODE_ENV: 'test',
      OPENAI_API_KEY: 'test-openai-secret',
      OPENAI_MODEL: 'gpt-test',
      GEMINI_API_KEY: 'test-gemini-secret',
      GEMINI_MODEL: 'gemini-test',
      ILMU_API_KEY: '',
      ILMU_MODEL: 'nemo-test',
      AI_DEFAULT_PROVIDER: 'openai',
      AI_PROVIDER_CYBERGUARD: 'openai',
      AI_PROVIDER_RUNTIME_DISABLED: 'gemini',
      AI_TEST_MOCK_PROVIDER: 'success',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', () => {});
  child.stderr.on('data', data => {
    if (process.env.DEBUG_ADMIN_AI_PROVIDER_TEST) process.stderr.write(data);
  });
  return child;
}

async function waitForHealth(child) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 15000) {
    if (child.exitCode !== null) throw new Error('Server exited before health check completed.');
    try {
      const response = await fetch(`${BASE_URL}/api/health`);
      if (response.ok) return;
    } catch {}
    await delay(250);
  }
  throw new Error('Timed out waiting for server health check.');
}

async function stopServer(child) {
  if (!child || child.exitCode !== null) return;
  child.kill();
  await Promise.race([new Promise(resolve => child.once('exit', resolve)), delay(3000)]);
}

async function createUser(pool, email, role = 'user', accountStatus = 'active') {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const [result] = await pool.query(
    `INSERT INTO users (email, username, display_name, age, age_group, password_hash, role, account_status)
     VALUES (?, ?, ?, 16, 'teen', ?, ?, ?)`,
    [email, email, email, passwordHash, role, accountStatus]
  );
  return result.insertId;
}

async function login(email) {
  const result = await request('POST', '/api/auth/login', { email, password: PASSWORD });
  assert.equal(result.response.status, 200, `login should succeed for ${email}`);
  return result.cookieHeader;
}

async function cleanup(pool) {
  const [users] = await pool.query('SELECT id FROM users WHERE email LIKE ?', [`${PREFIX}%@example.com`]);
  for (const user of users) {
    await pool.query(
      `DELETE FROM sessions
       WHERE CAST(JSON_UNQUOTE(JSON_EXTRACT(data, '$.userId')) AS UNSIGNED) = ?`,
      [user.id]
    );
  }
  await pool.query('DELETE FROM users WHERE email LIKE ?', [`${PREFIX}%@example.com`]);
}

function assertNoSecrets(value) {
  const text = JSON.stringify(value);
  for (const forbidden of [
    'test-openai-secret',
    'OPENAI_API_KEY',
    'GEMINI_API_KEY',
    'ILMU_API_KEY',
    'password_hash',
    'prompt',
    'Learner context',
    'Reviewed Cyberly Sources',
  ]) {
    assert.equal(text.includes(forbidden), false, `response should not include ${forbidden}`);
  }
}

async function run() {
  const pool = createPool();
  const child = startServer();
  try {
    await cleanup(pool);
    await createUser(pool, `${PREFIX}.admin@example.com`, 'admin');
    await createUser(pool, `${PREFIX}.learner@example.com`, 'user');
    await createUser(pool, `${PREFIX}.disabled@example.com`, 'admin', 'disabled');
    await waitForHealth(child);

    const adminCookie = await login(`${PREFIX}.admin@example.com`);
    const learnerCookie = await login(`${PREFIX}.learner@example.com`);

    let result = await request('GET', '/api/admin/ai/providers');
    assert.equal(result.response.status, 401);

    result = await request('GET', '/api/admin/ai/providers', undefined, learnerCookie);
    assert.equal(result.response.status, 403);

    result = await request('GET', '/api/admin/ai/providers', undefined, adminCookie);
    assert.equal(result.response.status, 200);
    assert.deepEqual(result.json.providers.map(provider => provider.id), ['openai', 'gemini', 'ilmu']);
    assert.equal(result.json.providers.find(provider => provider.id === 'openai').configured, true);
    assert.equal(result.json.providers.find(provider => provider.id === 'gemini').configured, true);
    assert.equal(result.json.providers.find(provider => provider.id === 'gemini').runtimeAvailable, false);
    assert.equal(result.json.providers.find(provider => provider.id === 'gemini').lastRuntimeStatus, 'runtime_unavailable');
    assert.equal(result.json.providers.find(provider => provider.id === 'gemini').lastRuntimeError, 'AI_AUTH_FAILED');
    assert.equal(result.json.defaultProvider, 'openai');
    assert.equal(result.json.purposeAssignments.cyberguard_chat, 'openai');
    assert.equal(result.json.controlledAgenticRuntime.productionRouter, 'openai');
    assert.equal(result.json.controlledAgenticRuntime.executionMode, 'single_step');
    assert.equal(result.json.controlledAgenticRuntime.maxModelCalls, 2);
    assert.equal(result.json.controlledAgenticRuntime.maxToolExecutions, 1);
    assert.equal(result.json.controlledAgenticRuntime.readOnlyOnly, true);
    assert.equal(result.json.controlledAgenticRuntime.autonomousLoop, false);
    assert.equal(result.json.controlledAgenticRuntime.writeActions, false);
    assert.ok(result.json.controlledAgenticRuntime.allowedTools.length >= 5);
    assert.ok(result.json.controlledAgenticRuntime.allowedTools.every(tool => tool.mode === 'read_only'));
    assert.ok(result.json.controlledAgenticRuntime.allowedTools.some(tool => tool.name === 'get_learning_progress'));
    assert.equal(result.json.adaptiveLearningRuntime.status, 'enabled');
    assert.equal(result.json.adaptiveLearningRuntime.mode, 'deterministic_explainable');
    assert.deepEqual(result.json.adaptiveLearningRuntime.dataSources, [
      'learner_profile',
      'initial_assessment',
      'topic_progress',
      'scenario_outcomes',
      'active_recommendations',
    ]);
    assert.equal(result.json.adaptiveLearningRuntime.persistentAiRecommendations, false);
    assert.equal(result.json.adaptiveLearningRuntime.automaticDifficultyChanges, false);
    assert.equal(result.json.adaptiveLearningRuntime.automaticScoreChanges, false);
    assert.equal(result.json.adaptiveLearningRuntime.learnerChoiceRequired, true);
    assert.equal(result.json.cyberWellnessRuntime.status, 'enabled');
    assert.equal(result.json.cyberWellnessRuntime.mode, 'deterministic_non_diagnostic');
    assert.equal(result.json.cyberWellnessRuntime.psychologicalDiagnosis, false);
    assert.equal(result.json.cyberWellnessRuntime.wellnessRiskScoring, false);
    assert.equal(result.json.cyberWellnessRuntime.automaticIntervention, false);
    assert.equal(result.json.cyberWellnessRuntime.learnerChoiceRequired, true);
    assert.equal(result.json.cyberWellnessRuntime.highRiskSafetyHandling, 'existing_safety_pathway');
    assert.equal(result.json.cyberWellnessRuntime.domains.length, 6);
    assertNoSecrets(result.json);

    result = await request('POST', '/api/admin/ai/providers/unknown/test', {}, adminCookie);
    assert.equal(result.response.status, 404);
    assertNoSecrets(result.json);

    result = await request('POST', '/api/admin/ai/providers/gemini/test', {}, adminCookie);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.status, 'success');
    assertNoSecrets(result.json);

    result = await request('POST', '/api/admin/ai/providers/openai/test', { prompt: 'learner data should be ignored', role: 'admin' }, adminCookie);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.provider, 'openai');
    assert.equal(result.json.status, 'success');
    assert.equal(typeof result.json.latencyMs, 'number');
    assert.equal(result.json.finishReason, 'stop');
    assert.equal(result.json.providerRequestId, 'mock-success');
    assert.deepEqual(result.json.usage, { inputTokens: 120, outputTokens: 36, totalTokens: 156 });
    assert.ok(result.json.textPreview.length > 0 && result.json.textPreview.length <= 80);
    assert.equal(Object.hasOwn(result.json, 'rawMetadata'), false);
    assertNoSecrets(result.json);

    const disabledCookieResult = await request('POST', '/api/auth/login', {
      email: `${PREFIX}.disabled@example.com`,
      password: PASSWORD,
    });
    assert.notEqual(disabledCookieResult.response.status, 200);

    console.log('Admin AI provider diagnostics verification passed.');
  } finally {
    await stopServer(child);
    await cleanup(pool).catch(() => {});
    await pool.end();
  }
}

run().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});

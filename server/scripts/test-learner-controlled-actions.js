const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const bcrypt = require('bcrypt');
const { createPool } = require('../src/database/pool');

const PORT = process.env.LEARNER_ACTION_TEST_PORT || '5141';
const BASE_URL = `http://127.0.0.1:${PORT}`;
const PASSWORD = 'LearnerActions3D!';
const PREFIX = `test-learner-actions-${Date.now()}`;

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
      AI_TEST_MOCK_PROVIDER: 'success',
      AI_TEST_ACTION_PROPOSAL: 'open_resource',
      AI_TEST_ACTION_PROPOSAL_RESOURCE_SLUG: `${PREFIX}-published-resource`,
      ACTION_PROPOSAL_TTL_SECONDS: '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', () => {});
  child.stderr.on('data', data => {
    if (process.env.DEBUG_LEARNER_ACTION_TEST) process.stderr.write(data);
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

async function createResource(pool, slug, status = 'published') {
  const [result] = await pool.query(
    `INSERT INTO resource_articles (slug, category_code, source_url, display_order, status)
     VALUES (?, 'Scams', 'https://example.com/source', 999, ?)`,
    [slug, status]
  );
  await pool.query(
    `INSERT INTO resource_article_translations (resource_id, locale, title, summary, content_json, source_label)
     VALUES (?, 'en', ?, 'Test summary', JSON_ARRAY('Test body'), 'Test Source')`,
    [result.insertId, `Resource ${slug}`]
  );
  return result.insertId;
}

async function createScenario(pool, slug, status = 'published') {
  const [result] = await pool.query(
    `INSERT INTO scenario_definitions
       (slug, title, summary, topic_code, difficulty, version, status, estimated_minutes, total_steps)
     VALUES (?, ?, 'Test scenario summary', 'phishing_and_scams', 'beginner', 1, ?, 5, 3)`,
    [slug, `Scenario ${slug}`, status]
  );
  return result.insertId;
}

async function createRecommendation(pool, userId, status = 'active') {
  const [result] = await pool.query(
    `INSERT INTO learner_recommendations
       (user_id, recommendation_type, topic_code, recommended_level, reason_code, reason_text, source_type, status)
     VALUES (?, 'next_topic', 'phishing_and_scams', 'beginner', 'weak_topic', 'Practice phishing safely.', 'initial_assessment', ?)`,
    [userId, status]
  );
  return result.insertId;
}

async function createConversation(cookieHeader, content = 'Show me a resource about phishing.') {
  const result = await request('POST', '/api/chat/conversations', {
    message: { role: 'user', content },
    locale: 'en',
  }, cookieHeader);
  assert.equal(result.response.status, 201);
  return {
    conversation: result.json.conversation,
    message: result.json.messages[0],
  };
}

async function countRows(pool, table, userId) {
  const [rows] = await pool.query(`SELECT COUNT(*) AS count FROM ${table} WHERE user_id = ?`, [userId]);
  return Number(rows[0]?.count || 0);
}

async function snapshotMutationTables(pool, userId) {
  return {
    topicProgress: await countRows(pool, 'learner_topic_progress', userId),
    progressSummary: await countRows(pool, 'learner_progress_summary', userId),
    scenarioAttempts: await countRows(pool, 'scenario_attempts', userId),
    scenarioProgressEvents: await countRows(pool, 'scenario_progress_events', userId),
    assessmentAttempts: await countRows(pool, 'assessment_attempts', userId),
  };
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
  await pool.query('DELETE FROM resource_articles WHERE slug LIKE ?', [`${PREFIX}%`]);
  await pool.query('DELETE FROM scenario_definitions WHERE slug LIKE ?', [`${PREFIX}%`]);
}

function assertNoSecrets(value) {
  const text = JSON.stringify(value);
  for (const forbidden of [
    'test-openai-secret',
    'OPENAI_API_KEY',
    'GEMINI_API_KEY',
    'ILMU_API_KEY',
    'password_hash',
    'SELECT ',
    'systemPrompt',
    'prompt',
  ]) {
    assert.equal(text.includes(forbidden), false, `response should not include ${forbidden}`);
  }
}

async function createProposal(cookie, actionType, parameters) {
  return request('POST', '/api/agent/actions/proposals', { actionType, arguments: parameters }, cookie);
}

async function run() {
  const pool = createPool();
  const child = startServer();
  try {
    await cleanup(pool);
    const learnerId = await createUser(pool, `${PREFIX}.learner@example.com`);
    await createUser(pool, `${PREFIX}.admin@example.com`, 'admin');
    const otherLearnerId = await createUser(pool, `${PREFIX}.other@example.com`);
    const resourceId = await createResource(pool, `${PREFIX}-published-resource`, 'published');
    await createResource(pool, `${PREFIX}-draft-resource`, 'draft');
    await createResource(pool, `${PREFIX}-archived-resource`, 'archived');
    const scenarioId = await createScenario(pool, `${PREFIX}-published-scenario`, 'published');
    await createScenario(pool, `${PREFIX}-draft-scenario`, 'draft');
    await createScenario(pool, `${PREFIX}-archived-scenario`, 'archived');
    const recommendationId = await createRecommendation(pool, learnerId, 'active');
    const otherRecommendationId = await createRecommendation(pool, otherLearnerId, 'active');
    await waitForHealth(child);

    const learnerCookie = await login(`${PREFIX}.learner@example.com`);
    const adminCookie = await login(`${PREFIX}.admin@example.com`);
    const otherCookie = await login(`${PREFIX}.other@example.com`);

    let result = await createProposal('', 'open_resource', { resourceSlug: `${PREFIX}-published-resource` });
    assert.equal(result.response.status, 401);

    result = await createProposal(adminCookie, 'open_resource', { resourceSlug: `${PREFIX}-published-resource` });
    assert.equal(result.response.status, 403);

    result = await createProposal(learnerCookie, 'execute_sql', { sql: 'SELECT 1' });
    assert.equal(result.response.status, 403);
    assert.equal(result.json.code, 'ACTION_NOT_SUPPORTED');

    result = await request('POST', '/api/agent/actions/proposals', {
      actionProposal: [
        { actionType: 'open_resource', arguments: { resourceId } },
        { actionType: 'open_scenario', arguments: { scenarioId } },
      ],
    }, learnerCookie);
    assert.equal(result.response.status, 400);

    result = await createProposal(learnerCookie, 'open_resource', { resourceId, userId: 999 });
    assert.equal(result.response.status, 400);

    result = await createProposal(learnerCookie, 'open_resource', { resourceSlug: `${PREFIX}-published-resource` });
    assert.equal(result.response.status, 201);
    assert.equal(result.json.proposal.actionType, 'open_resource');
    assert.equal(result.json.proposal.requiresConfirmation, false);
    assert.equal(result.json.proposal.target.id, resourceId);
    assert.ok(result.json.proposal.confirmationToken);
    assertNoSecrets(result.json);

    let confirm = await request(
      'POST',
      `/api/agent/actions/proposals/${result.json.proposal.proposalId}/confirm`,
      { confirmationToken: result.json.proposal.confirmationToken, actionType: 'open_scenario', parameters: { scenarioId: 999 } },
      learnerCookie
    );
    assert.equal(confirm.response.status, 200);
    assert.deepEqual(confirm.json.result.target, {
      page: 'resources',
      resourceId,
      resourceSlug: `${PREFIX}-published-resource`,
    });

    result = await createProposal(learnerCookie, 'open_resource', { resourceSlug: `${PREFIX}-draft-resource` });
    assert.equal(result.response.status, 404);
    result = await createProposal(learnerCookie, 'open_resource', { resourceSlug: `${PREFIX}-archived-resource` });
    assert.equal(result.response.status, 404);

    result = await createProposal(learnerCookie, 'open_scenario', { scenarioId });
    assert.equal(result.response.status, 201);
    const beforeScenarioAttempts = await countRows(pool, 'scenario_attempts', learnerId);
    confirm = await request(
      'POST',
      `/api/agent/actions/proposals/${result.json.proposal.proposalId}/confirm`,
      { confirmationToken: result.json.proposal.confirmationToken },
      learnerCookie
    );
    assert.equal(confirm.response.status, 200);
    assert.equal(confirm.json.result.target.scenarioId, scenarioId);
    assert.equal(await countRows(pool, 'scenario_attempts', learnerId), beforeScenarioAttempts);

    result = await createProposal(learnerCookie, 'open_scenario', { scenarioSlug: `${PREFIX}-draft-scenario` });
    assert.equal(result.response.status, 404);
    result = await createProposal(learnerCookie, 'open_scenario', { scenarioSlug: `${PREFIX}-archived-scenario` });
    assert.equal(result.response.status, 404);

    result = await createProposal(learnerCookie, 'open_recommendation', { recommendationId });
    assert.equal(result.response.status, 201);
    confirm = await request(
      'POST',
      `/api/agent/actions/proposals/${result.json.proposal.proposalId}/confirm`,
      { confirmationToken: result.json.proposal.confirmationToken },
      learnerCookie
    );
    assert.equal(confirm.response.status, 200);
    assert.equal(confirm.json.result.target.page, 'progress');
    const [[notViewed]] = await pool.query('SELECT status, viewed_at FROM learner_recommendations WHERE id = ?', [recommendationId]);
    assert.equal(notViewed.status, 'active');
    assert.equal(notViewed.viewed_at, null);

    result = await createProposal(otherCookie, 'open_recommendation', { recommendationId });
    assert.equal(result.response.status, 404);

    const beforeViewed = await snapshotMutationTables(pool, learnerId);
    result = await createProposal(learnerCookie, 'mark_recommendation_viewed', { recommendationId });
    assert.equal(result.response.status, 201);
    assert.equal(result.json.proposal.requiresConfirmation, true);

    const cancelled = await request(
      'POST',
      `/api/agent/actions/proposals/${result.json.proposal.proposalId}/cancel`,
      {},
      learnerCookie
    );
    assert.equal(cancelled.response.status, 200);
    assert.equal(cancelled.json.proposal.status, 'cancelled');
    confirm = await request(
      'POST',
      `/api/agent/actions/proposals/${result.json.proposal.proposalId}/confirm`,
      { confirmationToken: result.json.proposal.confirmationToken },
      learnerCookie
    );
    assert.equal(confirm.response.status, 409);
    const [[afterCancelRecommendation]] = await pool.query('SELECT status FROM learner_recommendations WHERE id = ?', [recommendationId]);
    assert.equal(afterCancelRecommendation.status, 'active');

    result = await createProposal(learnerCookie, 'mark_recommendation_viewed', { recommendationId });
    confirm = await request(
      'POST',
      `/api/agent/actions/proposals/${result.json.proposal.proposalId}/confirm`,
      { confirmationToken: 'wrong-token' },
      learnerCookie
    );
    assert.equal(confirm.response.status, 403);
    confirm = await request(
      'POST',
      `/api/agent/actions/proposals/${result.json.proposal.proposalId}/confirm`,
      { confirmationToken: result.json.proposal.confirmationToken },
      learnerCookie
    );
    assert.equal(confirm.response.status, 200);
    assert.equal(confirm.json.result.recommendation.status, 'viewed');
    const duplicate = await request(
      'POST',
      `/api/agent/actions/proposals/${result.json.proposal.proposalId}/confirm`,
      { confirmationToken: result.json.proposal.confirmationToken },
      learnerCookie
    );
    assert.equal(duplicate.response.status, 200);
    assert.deepEqual(duplicate.json.result.recommendation, confirm.json.result.recommendation);
    assert.deepEqual(await snapshotMutationTables(pool, learnerId), beforeViewed);

    result = await createProposal(learnerCookie, 'mark_recommendation_completed', { recommendationId });
    assert.equal(result.response.status, 201);
    confirm = await request(
      'POST',
      `/api/agent/actions/proposals/${result.json.proposal.proposalId}/confirm`,
      { confirmationToken: result.json.proposal.confirmationToken },
      learnerCookie
    );
    assert.equal(confirm.response.status, 200);
    assert.equal(confirm.json.result.recommendation.status, 'completed');
    assert.deepEqual(await snapshotMutationTables(pool, learnerId), beforeViewed);

    result = await createProposal(learnerCookie, 'mark_recommendation_viewed', { recommendationId: otherRecommendationId });
    assert.equal(result.response.status, 404);

    result = await createProposal(learnerCookie, 'update_learning_preferences', { learning_style: 'visual' });
    assert.equal(result.response.status, 400);
    assert.equal(result.json.code, 'ACTION_NOT_SUPPORTED');

    result = await createProposal(learnerCookie, 'open_resource', { resourceSlug: `${PREFIX}-published-resource` });
    await delay(1200);
    confirm = await request(
      'POST',
      `/api/agent/actions/proposals/${result.json.proposal.proposalId}/confirm`,
      { confirmationToken: result.json.proposal.confirmationToken },
      learnerCookie
    );
    assert.equal(confirm.response.status, 410);

    result = await createProposal(learnerCookie, 'open_resource', { resourceSlug: `${PREFIX}-published-resource` });
    confirm = await request(
      'POST',
      `/api/agent/actions/proposals/${result.json.proposal.proposalId}/confirm`,
      { confirmationToken: result.json.proposal.confirmationToken },
      otherCookie
    );
    assert.equal(confirm.response.status, 403);

    const disabledCookie = learnerCookie;
    await pool.query('UPDATE users SET account_status = ? WHERE id = ?', ['disabled', learnerId]);
    result = await createProposal(disabledCookie, 'open_resource', { resourceSlug: `${PREFIX}-published-resource` });
    assert.equal(result.response.status, 403);

    const adminStatus = await request('GET', '/api/admin/ai/providers', undefined, adminCookie);
    assert.equal(adminStatus.response.status, 200);
    assert.equal(adminStatus.json.learnerControlledActions.status, 'enabled');
    assert.equal(adminStatus.json.learnerControlledActions.automaticExecution, false);
    assert.equal(adminStatus.json.learnerControlledActions.writeToolsExposedToModel, 0);
    assert.ok(adminStatus.json.learnerControlledActions.enabledActions.includes('mark_recommendation_viewed'));
    assertNoSecrets(adminStatus.json);

    await pool.query('UPDATE users SET account_status = ? WHERE id = ?', ['active', learnerId]);
    const modelConversation = await createConversation(learnerCookie, 'Show me a resource about phishing.');
    const generated = await request(
      'POST',
      `/api/chat/conversations/${modelConversation.conversation.id}/messages/${modelConversation.message.id}/generate`,
      { locale: 'en' },
      learnerCookie
    );
    assert.equal(generated.response.status, 201);
    assert.equal(generated.json.proposal.actionType, 'open_resource');
    assert.equal(generated.json.proposal.target.type, 'resource');
    assert.equal(generated.json.proposal.status, 'pending');
    assert.ok(generated.json.proposal.confirmationToken);
    assert.equal(Object.hasOwn(generated.json.proposal, 'parameters'), false);
    assertNoSecrets(generated.json);

    console.log('Learner-controlled action proposal tests passed.');
  } finally {
    await stopServer(child);
    await cleanup(pool);
    await pool.end();
  }
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});

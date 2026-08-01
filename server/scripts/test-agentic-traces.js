const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const bcrypt = require('bcrypt');
const { createPool } = require('../src/database/pool');
const { sanitizeTracePayload } = require('../src/agent/audit/agenticTrace.sanitizer');

const PORT = process.env.AGENTIC_TRACE_TEST_PORT || '5142';
const BASE_URL = `http://127.0.0.1:${PORT}`;
const PASSWORD = 'AgenticTrace3E!';
const PREFIX = `test-agentic-trace-${Date.now()}`;

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
      AI_TEST_ACTION_PROPOSAL_RESOURCE_SLUG: `${PREFIX}-resource`,
      ACTION_PROPOSAL_TTL_SECONDS: '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', () => {});
  child.stderr.on('data', data => {
    if (process.env.DEBUG_AGENTIC_TRACE_TEST) process.stderr.write(data);
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

async function createUser(pool, email, role = 'user') {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const [result] = await pool.query(
    `INSERT INTO users (email, username, display_name, age, age_group, password_hash, role, account_status)
     VALUES (?, ?, ?, 16, 'teen', ?, ?, 'active')`,
    [email, email, email, passwordHash, role]
  );
  return result.insertId;
}

async function login(email) {
  const result = await request('POST', '/api/auth/login', { email, password: PASSWORD });
  assert.equal(result.response.status, 200, `login should succeed for ${email}`);
  return result.cookieHeader;
}

async function createResource(pool, slug) {
  const [result] = await pool.query(
    `INSERT INTO resource_articles (slug, category_code, source_url, display_order, status, review_status, rag_ready)
     VALUES (?, 'Scams', 'https://example.com/source', 999, 'published', 'approved', 1)`,
    [slug]
  );
  await pool.query(
    `INSERT INTO resource_article_translations (resource_id, locale, title, summary, content_json, source_label)
     VALUES (?, 'en', ?, 'Safe phishing summary', JSON_ARRAY('Safe phishing body'), 'Test Source')`,
    [result.insertId, `Resource ${slug}`]
  );
  return result.insertId;
}

async function createConversation(cookieHeader, content) {
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

async function createRecommendation(pool, userId) {
  const [result] = await pool.query(
    `INSERT INTO learner_recommendations
       (user_id, recommendation_type, topic_code, recommended_level, reason_code, reason_text, source_type, status)
     VALUES (?, 'next_topic', 'phishing_and_scams', 'beginner', 'weak_topic', 'Practice phishing safely.', 'initial_assessment', 'active')`,
    [userId]
  );
  return result.insertId;
}

async function cleanup(pool) {
  const [users] = await pool.query('SELECT id FROM users WHERE email LIKE ?', [`${PREFIX}%@example.com`]);
  for (const user of users) {
    await pool.query(
      `DELETE FROM sessions
       WHERE CAST(JSON_UNQUOTE(JSON_EXTRACT(data, '$.userId')) AS UNSIGNED) = ?`,
      [user.id]
    );
    await pool.query('DELETE FROM agentic_execution_traces WHERE learner_id = ?', [user.id]);
  }
  await pool.query('DELETE FROM users WHERE email LIKE ?', [`${PREFIX}%@example.com`]);
  await pool.query('DELETE FROM resource_articles WHERE slug LIKE ?', [`${PREFIX}%`]);
  await pool.query('DELETE FROM agentic_execution_traces WHERE request_id LIKE ?', [`${PREFIX}%`]);
}

function assertNoSensitiveFields(value) {
  const text = JSON.stringify(value);
  for (const forbidden of [
    'test-openai-secret',
    'OPENAI_API_KEY',
    'GEMINI_API_KEY',
    'ILMU_API_KEY',
    'password_hash',
    'confirmationToken',
    'systemPrompt',
    'Reviewed Cyberly Sources',
    'Safe phishing body',
    'How can I steal',
    'Show me a resource',
    'AI answer',
    'SELECT ',
  ]) {
    assert.equal(text.includes(forbidden), false, `safe trace output should not include ${forbidden}`);
  }
}

function assertSanitizer() {
  const sanitized = sanitizeTracePayload({
    requestId: `${PREFIX}-sanitizer`,
    learner: { id: 7, email: 'hidden@example.com' },
    provider: { provider: 'openai', model: 'gpt-test', providerRequestId: 'req-secret', inputTokens: 10 },
    planning: { toolName: 'search_published_resources', arguments: { query: 'password' }, rawOutput: 'raw' },
    actionProposal: { actionType: 'open_resource', status: 'pending', confirmationToken: 'secret-token' },
    prompt: 'systemPrompt',
  });
  assert.equal(sanitized.provider.provider, 'openai');
  assert.equal(sanitized.provider.requestIdAvailable, true);
  assert.equal(Object.hasOwn(sanitized.provider, 'providerRequestId'), false);
  assert.equal(Object.hasOwn(sanitized.provider, 'inputTokens'), false);
  assert.equal(Object.hasOwn(sanitized.planning, 'arguments'), false);
  assert.equal(Object.hasOwn(sanitized.actionProposal, 'confirmationToken'), false);
  assertNoSensitiveFields(sanitized);
}

async function run() {
  assertSanitizer();
  const pool = createPool();
  const child = startServer();
  try {
    await cleanup(pool);
    const learnerId = await createUser(pool, `${PREFIX}.learner@example.com`, 'user');
    await createUser(pool, `${PREFIX}.admin@example.com`, 'admin');
    await createUser(pool, `${PREFIX}.other@example.com`, 'user');
    await createResource(pool, `${PREFIX}-resource`);
    await createRecommendation(pool, learnerId);
    await waitForHealth(child);

    const learnerCookie = await login(`${PREFIX}.learner@example.com`);
    const adminCookie = await login(`${PREFIX}.admin@example.com`);
    const otherCookie = await login(`${PREFIX}.other@example.com`);

    let result = await request('GET', '/api/admin/ai/traces');
    assert.equal(result.response.status, 401);
    result = await request('GET', '/api/admin/ai/traces', undefined, learnerCookie);
    assert.equal(result.response.status, 403);

    const conversation = await createConversation(learnerCookie, 'Show me a resource about phishing.');
    const generated = await request(
      'POST',
      `/api/chat/conversations/${conversation.conversation.id}/messages/${conversation.message.id}/generate`,
      { locale: 'en' },
      learnerCookie
    );
    assert.equal(generated.response.status, 201);
    assert.ok(generated.json.proposal?.proposalId);

    result = await request('GET', '/api/admin/ai/traces?limit=5', undefined, adminCookie);
    assert.equal(result.response.status, 200);
    assert.equal(Array.isArray(result.json.items), true);
    assert.ok(result.json.items.length >= 1);
    const trace = result.json.items.find(item => item.conversationId === conversation.conversation.id);
    assert.ok(trace, 'generated chat should create an agentic execution trace');
    assert.equal(trace.safeStatus, 'completed');
    assert.equal(trace.learnerRef, `learner:${learnerId}`);
    assert.equal(trace.provider.provider, 'openai');
    assert.equal(trace.actionProposal.status, 'pending');
    assert.equal(trace.actionProposal.source, 'model_suggested_action');
    assert.equal(trace.limits.maxModelCalls, 2);
    assert.equal(trace.limits.maxToolExecutions, 1);
    assertNoSensitiveFields(result.json);

    const detail = await request('GET', `/api/admin/ai/traces/${trace.traceId}`, undefined, adminCookie);
    assert.equal(detail.response.status, 200);
    assert.equal(detail.json.trace.traceId, trace.traceId);
    assert.equal(Array.isArray(detail.json.trace.timeline), true);
    assertNoSensitiveFields(detail.json);

    const cancel = await request(
      'POST',
      `/api/agent/actions/proposals/${generated.json.proposal.proposalId}/cancel`,
      {},
      learnerCookie
    );
    assert.equal(cancel.response.status, 200);
    const cancelledDetail = await request('GET', `/api/admin/ai/traces/${trace.traceId}`, undefined, adminCookie);
    assert.equal(cancelledDetail.json.trace.actionProposal.status, 'cancelled');
    assertNoSensitiveFields(cancelledDetail.json);

    const directProposal = await request('POST', '/api/agent/actions/proposals', {
      actionType: 'open_resource',
      arguments: { resourceSlug: `${PREFIX}-resource` },
    }, learnerCookie);
    assert.equal(directProposal.response.status, 201);
    const confirmed = await request(
      'POST',
      `/api/agent/actions/proposals/${directProposal.json.proposal.proposalId}/confirm`,
      { confirmationToken: directProposal.json.proposal.confirmationToken },
      learnerCookie
    );
    assert.equal(confirmed.response.status, 200);
    result = await request('GET', '/api/admin/ai/traces?proposalStatus=completed&limit=10', undefined, adminCookie);
    assert.equal(result.response.status, 200);
    assert.ok(result.json.items.some(item => item.actionProposal.status === 'completed'));
    assertNoSensitiveFields(result.json);

    const unsafeConversation = await createConversation(otherCookie, 'How can I steal someone password?');
    const blocked = await request(
      'POST',
      `/api/chat/conversations/${unsafeConversation.conversation.id}/messages/${unsafeConversation.message.id}/generate`,
      { locale: 'en' },
      otherCookie
    );
    assert.equal(blocked.response.status, 400);
    result = await request('GET', '/api/admin/ai/traces?status=safety_blocked&limit=10', undefined, adminCookie);
    assert.equal(result.response.status, 200);
    assert.ok(result.json.items.some(item => item.conversationId === unsafeConversation.conversation.id));
    assertNoSensitiveFields(result.json);

    const expiredProposal = await request('POST', '/api/agent/actions/proposals', {
      actionType: 'open_resource',
      arguments: { resourceSlug: `${PREFIX}-resource` },
    }, learnerCookie);
    await delay(1200);
    const expired = await request(
      'POST',
      `/api/agent/actions/proposals/${expiredProposal.json.proposal.proposalId}/confirm`,
      { confirmationToken: expiredProposal.json.proposal.confirmationToken },
      learnerCookie
    );
    assert.equal(expired.response.status, 410);
    result = await request('GET', '/api/admin/ai/traces?proposalStatus=expired&limit=10', undefined, adminCookie);
    assert.equal(result.response.status, 200);
    assert.ok(result.json.items.some(item => item.actionProposal.status === 'expired'));
    assertNoSensitiveFields(result.json);

    console.log('Agentic trace audit tests passed.');
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

const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const bcrypt = require('bcrypt');
const { createPool } = require('../src/database/pool');

const PORT = process.env.ADMIN_RESOURCE_GOVERNANCE_TEST_PORT || '5124';
const BASE_URL = `http://127.0.0.1:${PORT}`;
const PASSWORD = 'AdminGovernance9';
const PREFIX = `__test_admin_resource_governance_${Date.now()}`;

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
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }
  }
  return { response, json, cookieHeader: mergeCookies(cookieHeader, response) };
}

function startServer() {
  const serverPath = path.join(__dirname, '..', 'server.js');
  const child = spawn(process.execPath, [serverPath], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      PORT,
      CLIENT_ORIGIN: 'http://localhost:3000',
      NODE_ENV: 'test',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', () => {});
  child.stderr.on('data', () => {});
  return child;
}

async function stopServer(child) {
  if (!child || child.exitCode !== null) return;
  child.kill();
  await Promise.race([
    new Promise(resolve => child.once('exit', resolve)),
    delay(3000),
  ]);
}

async function waitForHealth(child) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 15000) {
    if (child.exitCode !== null) throw new Error('Server exited before health check completed.');
    try {
      const response = await fetch(`${BASE_URL}/api/health`);
      if (response.ok) return;
    } catch {
      await delay(250);
    }
  }
  throw new Error('Timed out waiting for server health check.');
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

async function createResource(pool, slug, options = {}) {
  const [result] = await pool.query(
    `INSERT INTO resource_articles (
       slug,
       category_code,
       source_url,
       source_type,
       source_country,
       source_authority_level,
       malaysia_guidance_flag,
       age_appropriateness,
       sensitive_topic_flag,
       rag_ready,
       rag_ready_reason,
       replacement_source_needed,
       review_notes,
       display_order,
       status,
       review_status
     )
     VALUES (?, 'Scams', ?, 'test_source', 'MY', 'test_authority', 0, '13-17', 0, ?, ?, 0, ?, 9999, ?, ?)`,
    [
      slug,
      `https://example.test/${slug}`,
      options.ragReady ? 1 : 0,
      options.ragReadyReason || null,
      options.reviewNotes || null,
      options.status || 'draft',
      options.reviewStatus || 'draft',
    ]
  );
  const resourceId = result.insertId;
  await pool.query(
    `INSERT INTO resource_article_translations (resource_id, locale, title, summary, content_json, source_label)
     VALUES
       (?, 'en', ?, ?, CAST(? AS JSON), 'Test Source'),
       (?, 'ms', ?, ?, CAST(? AS JSON), 'Test Source')`,
    [
      resourceId,
      `English title ${slug}`,
      `English summary ${slug}`,
      JSON.stringify([
        { heading: 'Phishing basics', body: `Fixture phishing guidance ${slug}` },
        { heading: 'Safe action', body: 'Check links before signing in.' },
      ]),
      resourceId,
      `Malay title ${slug}`,
      `Malay summary ${slug}`,
      JSON.stringify([{ heading: 'Asas phishing', body: `Panduan phishing ${slug}` }]),
    ]
  );
  return resourceId;
}

async function createUnrelatedRagDocument(pool, resourceId, slug) {
  const [result] = await pool.query(
    `INSERT INTO rag_documents (
       content_type,
       content_code,
       resource_id,
       locale,
       title,
       summary,
       category_code,
       source_label,
       source_organisation,
       source_url,
       internal_target_json,
       status,
       review_status,
       rag_ready
     )
     VALUES ('resource', ?, ?, 'en', ?, 'Unrelated summary', 'Scams', 'Test Source', 'Test Source',
             ?, CAST(? AS JSON), 'published', 'approved', 1)`,
    [
      `resource:${slug}`,
      resourceId,
      `Unrelated ${slug}`,
      `https://example.test/${slug}`,
      JSON.stringify({ page: 'resources', resourceId, resourceSlug: slug }),
    ]
  );
  await pool.query(
    `INSERT INTO rag_chunks (document_id, chunk_index, heading, chunk_text, token_estimate, metadata_json)
     VALUES (?, 0, 'Unrelated', ?, 10, CAST(? AS JSON))`,
    [result.insertId, `Unrelated retained text ${slug}`, JSON.stringify({ test: true })]
  );
  return result.insertId;
}

async function retrievableDocumentCount(pool, resourceId) {
  const [[row]] = await pool.query(
    `SELECT COUNT(*) AS count
     FROM rag_documents
     WHERE resource_id = ?
       AND content_type = 'resource'
       AND status = 'published'
       AND review_status = 'approved'
       AND rag_ready = 1`,
    [resourceId]
  );
  return Number(row.count || 0);
}

async function chunkCount(pool, resourceId) {
  const [[row]] = await pool.query(
    `SELECT COUNT(*) AS count
     FROM rag_chunks rc
     JOIN rag_documents rd ON rd.id = rc.document_id
     WHERE rd.resource_id = ?`,
    [resourceId]
  );
  return Number(row.count || 0);
}

async function cleanup(pool, ids) {
  for (const userId of ids.userIds) {
    await pool.query(
      `DELETE FROM sessions
       WHERE CAST(JSON_UNQUOTE(JSON_EXTRACT(data, '$.userId')) AS UNSIGNED) = ?`,
      [userId]
    );
  }
  if (ids.resourceIds.length) {
    await pool.query(
      `DELETE rc FROM rag_chunks rc
       JOIN rag_documents rd ON rd.id = rc.document_id
       WHERE rd.resource_id IN (?)`,
      [ids.resourceIds]
    );
    await pool.query('DELETE FROM rag_documents WHERE resource_id IN (?)', [ids.resourceIds]);
    await pool.query('DELETE FROM resource_article_translations WHERE resource_id IN (?)', [ids.resourceIds]);
    await pool.query('DELETE FROM resource_articles WHERE id IN (?)', [ids.resourceIds]);
  }
  if (ids.userIds.length) {
    await pool.query('DELETE FROM users WHERE id IN (?)', [ids.userIds]);
  }
  await pool.query('DELETE FROM sessions WHERE expires < NOW()');
}

function assertNoSensitiveFields(value) {
  const text = JSON.stringify(value);
  for (const forbidden of ['password_hash', 'passwordHash', 'session', 'SESSION_SECRET', 'OPENAI_API_KEY', 'apiKey', 'prompt']) {
    assert.equal(text.includes(forbidden), false, `response should not include ${forbidden}`);
  }
}

async function run() {
  const pool = createPool();
  const child = startServer();
  const ids = { userIds: [], resourceIds: [] };

  try {
    await waitForHealth(child);

    const adminEmail = `${PREFIX}.admin@example.com`;
    const learnerEmail = `${PREFIX}.learner@example.com`;
    const disabledAdminEmail = `${PREFIX}.disabled@example.com`;
    ids.userIds.push(await createUser(pool, adminEmail, 'admin'));
    ids.userIds.push(await createUser(pool, learnerEmail, 'user'));
    ids.userIds.push(await createUser(pool, disabledAdminEmail, 'admin', 'disabled'));

    const resourceSlug = `${PREFIX}_primary`;
    const draftSlug = `${PREFIX}_draft`;
    const unrelatedSlug = `${PREFIX}_unrelated`;
    const resourceId = await createResource(pool, resourceSlug, { status: 'published', reviewStatus: 'needs_review', ragReady: false });
    const draftResourceId = await createResource(pool, draftSlug, { status: 'draft', reviewStatus: 'approved', ragReady: false });
    const unrelatedResourceId = await createResource(pool, unrelatedSlug, { status: 'published', reviewStatus: 'approved', ragReady: true });
    ids.resourceIds.push(resourceId, draftResourceId, unrelatedResourceId);
    const unrelatedDocumentId = await createUnrelatedRagDocument(pool, unrelatedResourceId, unrelatedSlug);

    const adminCookie = await login(adminEmail);
    const learnerCookie = await login(learnerEmail);

    let result = await request('GET', '/api/admin/resources');
    assert.equal(result.response.status, 401);

    result = await request('GET', '/api/admin/resources', undefined, learnerCookie);
    assert.equal(result.response.status, 403);

    result = await request('POST', '/api/auth/login', { email: disabledAdminEmail, password: PASSWORD });
    assert.equal(result.response.status, 403);

    result = await request('GET', `/api/admin/resources?search=${encodeURIComponent(resourceSlug)}&page=1&pageSize=5`, undefined, adminCookie);
    assert.equal(result.response.status, 200);
    assert.ok(Array.isArray(result.json.items));
    assert.equal(result.json.pagination.page, 1);
    assert.ok(result.json.items.some(item => item.id === resourceId));
    assert.ok(result.json.summary.total >= 3);
    assertNoSensitiveFields(result.json);

    result = await request('GET', `/api/admin/resources?reviewStatus=needs_review&search=${encodeURIComponent(resourceSlug)}`, undefined, adminCookie);
    assert.equal(result.response.status, 200);
    assert.ok(result.json.items.every(item => item.reviewStatus === 'needs_review'));

    result = await request('GET', `/api/admin/resources/${resourceId}`, undefined, adminCookie);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.resource.id, resourceId);
    assert.equal(result.json.resource.effectiveRagEligible, false);
    assert.ok(result.json.resource.effectiveRagReasons.includes('resource_not_approved'));
    assert.ok(Array.isArray(result.json.resource.translations));
    assertNoSensitiveFields(result.json);

    result = await request('PATCH', `/api/admin/resources/${resourceId}/governance`, { reviewStatus: 'maybe' }, adminCookie);
    assert.equal(result.response.status, 400);

    result = await request('PATCH', `/api/admin/resources/${resourceId}/governance`, { reviewStatus: 'approved', unexpected: true }, adminCookie);
    assert.equal(result.response.status, 400);

    result = await request('PATCH', `/api/admin/resources/${resourceId}/governance`, {
      publicationStatus: 'published',
      reviewStatus: 'approved',
      reviewNotes: 'Approved by isolated governance test.',
      nextReviewAt: '2030-01-02',
    }, adminCookie);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.resource.reviewStatus, 'approved');
    assert.equal(result.json.resource.ragReady, false);
    assert.equal(result.json.resource.effectiveRagEligible, false);

    result = await request('PATCH', `/api/admin/resources/${resourceId}/governance`, {
      ragReady: true,
      reviewNotes: 'Enable RAG after approval.',
    }, adminCookie);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.resource.ragReady, true);
    assert.equal(result.json.resource.effectiveRagEligible, true);
    assert.ok(await retrievableDocumentCount(pool, resourceId) > 0);
    assert.ok(await chunkCount(pool, resourceId) > 0);

    result = await request('PATCH', `/api/admin/resources/${draftResourceId}/governance`, { ragReady: true }, adminCookie);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.resource.publicationStatus, 'draft');
    assert.equal(result.json.resource.ragReady, false);
    assert.ok(result.json.automaticChanges.includes('rag_ready_disabled'));

    result = await request('PATCH', `/api/admin/resources/${resourceId}/governance`, { reviewStatus: 'needs_review' }, adminCookie);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.resource.reviewStatus, 'needs_review');
    assert.equal(result.json.resource.ragReady, false);
    assert.ok(result.json.automaticChanges.includes('rag_ready_disabled'));
    assert.equal(await retrievableDocumentCount(pool, resourceId), 0);

    result = await request('PATCH', `/api/admin/resources/${resourceId}/governance`, {
      reviewStatus: 'approved',
      ragReady: true,
    }, adminCookie);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.resource.effectiveRagEligible, true);

    result = await request('PATCH', `/api/admin/resources/${resourceId}/governance`, { publicationStatus: 'archived' }, adminCookie);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.resource.publicationStatus, 'archived');
    assert.equal(result.json.resource.ragReady, false);
    assert.equal(await retrievableDocumentCount(pool, resourceId), 0);

    const resourceList = await request('GET', '/api/resources?locale=en');
    assert.equal(resourceList.response.status, 200);
    assert.equal(resourceList.json.resources.some(resource => resource.slug === resourceSlug), false);

    const [[unrelatedDoc]] = await pool.query(
      `SELECT status, review_status, rag_ready
       FROM rag_documents
       WHERE id = ?`,
      [unrelatedDocumentId]
    );
    assert.equal(unrelatedDoc.status, 'published');
    assert.equal(unrelatedDoc.review_status, 'approved');
    assert.equal(Number(unrelatedDoc.rag_ready), 1);

    result = await request('GET', `/api/admin/resources/${resourceId}`, undefined, learnerCookie);
    assert.equal(result.response.status, 403);

    console.log('Admin resource governance verification passed.');
  } finally {
    await stopServer(child);
    await cleanup(pool, ids).catch(() => {});
    await pool.end();
  }
}

run().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});

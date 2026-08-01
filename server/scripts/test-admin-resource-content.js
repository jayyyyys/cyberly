const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const bcrypt = require('bcrypt');
const { createPool } = require('../src/database/pool');

const PORT = process.env.ADMIN_RESOURCE_CONTENT_TEST_PORT || '5125';
const BASE_URL = `http://127.0.0.1:${PORT}`;
const PASSWORD = 'AdminContent9';
const PREFIX = `__test_admin_resource_content_${Date.now()}`;

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

async function createResource(pool, slug, options = {}) {
  const [result] = await pool.query(
    `INSERT INTO resource_articles (
       slug,
       category_code,
       source_url,
       source_type,
       source_country,
       source_authority_level,
       rag_ready,
       rag_ready_reason,
       display_order,
       status,
       review_status
     )
     VALUES (?, 'Scams', ?, 'test_source', 'MY', 'test_authority', ?, ?, 9999, ?, ?)`,
    [
      slug,
      `https://example.test/${slug}`,
      options.ragReady ? 1 : 0,
      options.ragReadyReason || null,
      options.status || 'published',
      options.reviewStatus || 'approved',
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
      JSON.stringify([`English body ${slug}`, 'Check links before signing in.']),
      resourceId,
      `Malay title ${slug}`,
      `Malay summary ${slug}`,
      JSON.stringify([`Malay body ${slug}`]),
    ]
  );
  return resourceId;
}

async function createRagDocument(pool, resourceId, slug, locale, text) {
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
     VALUES ('resource', ?, ?, ?, ?, 'Fixture summary', 'Scams', 'Test Source', 'Test Source',
             ?, CAST(? AS JSON), 'published', 'approved', 1)
     ON DUPLICATE KEY UPDATE title = VALUES(title)`,
    [
      `resource:${slug}`,
      resourceId,
      locale,
      `${locale} RAG title ${slug}`,
      `https://example.test/${slug}`,
      JSON.stringify({ page: 'resources', resourceId, resourceSlug: slug }),
    ]
  );
  const documentId = result.insertId;
  await pool.query(
    `INSERT INTO rag_chunks (document_id, chunk_index, heading, chunk_text, token_estimate, metadata_json)
     VALUES (?, 0, 'Fixture', ?, 10, CAST(? AS JSON))`,
    [documentId, text, JSON.stringify({ test: true, locale })]
  );
  return documentId;
}

async function translationCount(pool, resourceId, locale) {
  const [[row]] = await pool.query(
    `SELECT COUNT(*) AS count
     FROM resource_article_translations
     WHERE resource_id = ? AND locale = ?`,
    [resourceId, locale]
  );
  return Number(row.count || 0);
}

async function documentChunkText(pool, resourceId, locale) {
  const [rows] = await pool.query(
    `SELECT rc.chunk_text
     FROM rag_chunks rc
     JOIN rag_documents rd ON rd.id = rc.document_id
     WHERE rd.resource_id = ? AND rd.locale = ?
     ORDER BY rc.chunk_index`,
    [resourceId, locale]
  );
  return rows.map(row => row.chunk_text).join('\n');
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
  for (const forbidden of ['password_hash', 'passwordHash', 'SESSION_SECRET', 'OPENAI_API_KEY', 'apiKey', 'prompt', 'raw SQL']) {
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
    ids.userIds.push(await createUser(pool, adminEmail, 'admin'));
    ids.userIds.push(await createUser(pool, learnerEmail, 'user'));

    const slug = `${PREFIX}_published`;
    const ineligibleSlug = `${PREFIX}_draft`;
    const resourceId = await createResource(pool, slug, { status: 'published', reviewStatus: 'approved', ragReady: true });
    const ineligibleResourceId = await createResource(pool, ineligibleSlug, { status: 'draft', reviewStatus: 'approved', ragReady: false });
    ids.resourceIds.push(resourceId, ineligibleResourceId);

    await createRagDocument(pool, resourceId, slug, 'ms', `Original Malay RAG text ${slug}`);

    const adminCookie = await login(adminEmail);
    const learnerCookie = await login(learnerEmail);

    let result = await request('GET', `/api/admin/resources/${resourceId}/content`);
    assert.equal(result.response.status, 401);

    result = await request('GET', `/api/admin/resources/${resourceId}/content`, undefined, learnerCookie);
    assert.equal(result.response.status, 403);

    result = await request('GET', `/api/admin/resources/${resourceId}/content`, undefined, adminCookie);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.resource.id, resourceId);
    assert.equal(result.json.translations.en.title, `English title ${slug}`);
    assert.equal(result.json.translations.ms.title, `Malay title ${slug}`);
    assert.equal(result.json.translations['zh-CN'], null);
    assertNoSensitiveFields(result.json);
    const expectedUpdatedAt = result.json.translations.en.updatedAt;

    result = await request('GET', '/api/admin/resources/999999999/content', undefined, adminCookie);
    assert.equal(result.response.status, 404);

    result = await request('PATCH', `/api/admin/resources/${resourceId}/content`, {
      locale: 'fr',
      title: 'Bad',
      summary: 'Bad',
      body: 'Bad',
    }, adminCookie);
    assert.equal(result.response.status, 400);

    result = await request('PATCH', `/api/admin/resources/${resourceId}/content`, {
      locale: 'en',
      title: 'Bad',
      summary: 'Bad',
      body: 'Bad',
      publicationStatus: 'archived',
    }, adminCookie);
    assert.equal(result.response.status, 400);

    result = await request('PATCH', `/api/admin/resources/${resourceId}/content`, {
      locale: 'en',
      title: '   ',
      summary: 'Valid summary',
      body: 'Valid body',
    }, adminCookie);
    assert.equal(result.response.status, 400);

    result = await request('PATCH', `/api/admin/resources/${resourceId}/content`, {
      locale: 'en',
      title: 'x'.repeat(181),
      summary: 'Valid summary',
      body: 'Valid body',
    }, adminCookie);
    assert.equal(result.response.status, 400);

    result = await request('PATCH', `/api/admin/resources/${resourceId}/content`, {
      locale: 'en',
      title: `Updated English ${slug}`,
      summary: `Updated English summary ${slug}`,
      body: `Updated English body ${slug}\n\nSecond paragraph`,
      expectedUpdatedAt,
    }, adminCookie);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.translation.title, `Updated English ${slug}`);
    assert.equal(result.json.ragSync.attempted, true);
    assert.equal(result.json.ragSync.succeeded, true);
    assert.equal(await translationCount(pool, resourceId, 'en'), 1);
    assert.match(await documentChunkText(pool, resourceId, 'en'), /Updated English body/);
    assert.match(await documentChunkText(pool, resourceId, 'ms'), /Original Malay RAG text/);

    const staleUpdatedAt = expectedUpdatedAt;
    result = await request('PATCH', `/api/admin/resources/${resourceId}/content`, {
      locale: 'en',
      title: `Stale English ${slug}`,
      summary: 'Stale summary',
      body: 'Stale body',
      expectedUpdatedAt: staleUpdatedAt,
    }, adminCookie);
    assert.equal(result.response.status, 409);

    result = await request('PATCH', `/api/admin/resources/${resourceId}/content`, {
      locale: 'ms',
      title: `Dikemas kini ${slug}`,
      summary: `Ringkasan dikemas kini ${slug}`,
      body: `Isi Melayu dikemas kini ${slug}`,
    }, adminCookie);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.translation.locale, 'ms');

    result = await request('PATCH', `/api/admin/resources/${resourceId}/content`, {
      locale: 'zh-CN',
      title: `已更新 ${slug}`,
      summary: `已更新摘要 ${slug}`,
      body: `已更新中文内容 ${slug}`,
    }, adminCookie);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.translation.locale, 'zh-CN');
    assert.equal(await translationCount(pool, resourceId, 'zh-CN'), 1);

    result = await request('PATCH', `/api/admin/resources/${resourceId}/content`, {
      locale: 'zh-CN',
      title: `再次更新 ${slug}`,
      summary: `再次更新摘要 ${slug}`,
      body: `再次更新中文内容 ${slug}`,
    }, adminCookie);
    assert.equal(result.response.status, 200);
    assert.equal(await translationCount(pool, resourceId, 'zh-CN'), 1);

    result = await request('GET', `/api/resources/${slug}?locale=en`);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.resource.title, `Updated English ${slug}`);
    assert.ok(result.json.resource.content.some(item => String(item).includes('Updated English body')));

    result = await request('GET', `/api/resources/${ineligibleSlug}?locale=en`);
    assert.equal(result.response.status, 404);

    result = await request('PATCH', `/api/admin/resources/${ineligibleResourceId}/content`, {
      locale: 'en',
      title: `Ineligible updated ${slug}`,
      summary: 'Ineligible summary',
      body: 'Ineligible body',
    }, adminCookie);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.ragSync.attempted, false);
    assert.equal(result.json.ragSync.reason, 'resource_not_rag_eligible');
    assert.equal(await documentChunkText(pool, ineligibleResourceId, 'en'), '');

    console.log('Admin resource content verification passed.');
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

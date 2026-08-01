const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const bcrypt = require('bcrypt');
const { createPool } = require('../src/database/pool');

const PORT = process.env.ADMIN_RESOURCE_CREATE_TEST_PORT || '5126';
const BASE_URL = `http://127.0.0.1:${PORT}`;
const PASSWORD = 'AdminCreate9';
const PREFIX = `__test_admin_resource_create_${Date.now()}`;

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

function validPayload(slug) {
  return {
    slug,
    categoryCode: 'Scams',
    source: {
      label: 'Fixture Source',
      url: `https://example.test/${slug}`,
      type: 'government_cybersecurity_agency',
      country: 'MY',
      authorityLevel: 'official_agency',
      lastCheckedAt: '2026-07-15',
      replacementNeeded: false,
    },
    safety: {
      ageAppropriateness: '13-17',
      sensitiveTopic: false,
      malaysiaGuidance: true,
    },
    translation: {
      locale: 'en',
      title: `Fixture Resource ${slug}`,
      summary: `Fixture summary ${slug}`,
      body: `Fixture body ${slug}\n\nSecond paragraph.`,
      sourceLabel: 'Fixture Source',
    },
  };
}

async function rowCount(pool, tableName, whereSql, params) {
  const [[row]] = await pool.query(`SELECT COUNT(*) AS count FROM ${tableName} ${whereSql}`, params);
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
    const adminCookie = await login(adminEmail);
    const learnerCookie = await login(learnerEmail);

    const slug = `${PREFIX.replace(/^_+/, '').replace(/_/g, '-')}-primary`;
    const payload = validPayload(slug);

    let result = await request('POST', '/api/admin/resources', payload);
    assert.equal(result.response.status, 401);

    result = await request('POST', '/api/admin/resources', payload, learnerCookie);
    assert.equal(result.response.status, 403);

    result = await request('GET', '/api/admin/resources/options', undefined, adminCookie);
    assert.equal(result.response.status, 200);
    assert.ok(result.json.categories.some(category => category.code === 'Scams'));
    assert.ok(result.json.sourceTypes.length > 0);
    assertNoSensitiveFields(result.json);

    result = await request('POST', '/api/admin/resources', {
      ...payload,
      status: 'published',
      reviewStatus: 'approved',
      ragReady: true,
    }, adminCookie);
    assert.equal(result.response.status, 400);

    result = await request('POST', '/api/admin/resources', payload, adminCookie);
    assert.equal(result.response.status, 201);
    assert.equal(result.json.resource.slug, slug);
    assert.equal(result.json.resource.publicationStatus, 'draft');
    assert.equal(result.json.resource.reviewStatus, 'draft');
    assert.equal(result.json.resource.ragReady, false);
    assert.equal(result.json.resource.effectiveRagEligible, false);
    assert.equal(result.json.translations.en.title, payload.translation.title);
    assert.equal(result.json.translations.ms, null);
    assert.equal(result.json.translations['zh-CN'], null);
    assertNoSensitiveFields(result.json);
    const resourceId = result.json.resource.id;
    ids.resourceIds.push(resourceId);

    assert.equal(await rowCount(pool, 'resource_article_translations', 'WHERE resource_id = ? AND locale = ?', [resourceId, 'en']), 1);
    assert.equal(await rowCount(pool, 'resource_article_translations', 'WHERE resource_id = ? AND locale = ?', [resourceId, 'ms']), 0);
    assert.equal(await rowCount(pool, 'resource_article_translations', 'WHERE resource_id = ? AND locale = ?', [resourceId, 'zh-CN']), 0);
    assert.equal(
      await rowCount(
        pool,
        'rag_documents',
        "WHERE resource_id = ? AND status = 'published' AND review_status = 'approved' AND rag_ready = 1",
        [resourceId]
      ),
      0
    );

    result = await request('POST', '/api/admin/resources', validPayload(slug), adminCookie);
    assert.equal(result.response.status, 409, `duplicate slug should return 409, got ${result.response.status}: ${JSON.stringify(result.json)}`);

    for (const badSlug of ['Bad-Slug', 'bad_slug', '-bad', 'bad-', 'bad slug', '']) {
      result = await request('POST', '/api/admin/resources', validPayload(badSlug), adminCookie);
      assert.equal(result.response.status, 400, `invalid slug ${badSlug} should be rejected`);
    }

    result = await request('POST', '/api/admin/resources', { ...validPayload(`${slug}-blank-title`), translation: { ...payload.translation, title: ' ' } }, adminCookie);
    assert.equal(result.response.status, 400);
    result = await request('POST', '/api/admin/resources', { ...validPayload(`${slug}-blank-summary`), translation: { ...payload.translation, summary: ' ' } }, adminCookie);
    assert.equal(result.response.status, 400);
    result = await request('POST', '/api/admin/resources', { ...validPayload(`${slug}-blank-body`), translation: { ...payload.translation, body: ' ' } }, adminCookie);
    assert.equal(result.response.status, 400);
    result = await request('POST', '/api/admin/resources', { ...validPayload(`${slug}-long-title`), translation: { ...payload.translation, title: 'x'.repeat(181) } }, adminCookie);
    assert.equal(result.response.status, 400);
    result = await request('POST', '/api/admin/resources', { ...validPayload(`${slug}-bad-url`), source: { ...payload.source, url: 'javascript:alert(1)' } }, adminCookie);
    assert.equal(result.response.status, 400);
    result = await request('POST', '/api/admin/resources', { ...validPayload(`${slug}-malformed-url`), source: { ...payload.source, url: 'https://user:pass@example.test/source' } }, adminCookie);
    assert.equal(result.response.status, 400);
    result = await request('POST', '/api/admin/resources', { ...validPayload(`${slug}-unknown`), unexpected: true }, adminCookie);
    assert.equal(result.response.status, 400);

    result = await request('GET', `/api/resources/${slug}?locale=en`);
    assert.equal(result.response.status, 404);

    result = await request('POST', `/api/admin/resources/${resourceId}/publish`, {}, adminCookie);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.resource.publicationStatus, 'published');
    assert.equal(result.json.resource.reviewStatus, 'draft');
    assert.equal(result.json.resource.ragReady, false);
    assert.equal(result.json.resource.effectiveRagEligible, false);

    result = await request('GET', `/api/resources/${slug}?locale=en`);
    assert.equal(result.response.status, 200);

    result = await request('PATCH', `/api/admin/resources/${resourceId}/governance`, {
      reviewStatus: 'approved',
      ragReady: true,
      reviewNotes: 'Approved for explicit publication regression test.',
    }, adminCookie);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.resource.reviewStatus, 'approved');
    assert.equal(result.json.resource.ragReady, true);
    assert.equal(result.json.resource.effectiveRagEligible, true);

    result = await request('POST', `/api/admin/resources/${resourceId}/unpublish`, {}, adminCookie);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.resource.publicationStatus, 'draft');
    assert.equal(result.json.resource.reviewStatus, 'approved');
    assert.equal(result.json.resource.ragReady, false);
    assert.equal(result.json.resource.effectiveRagEligible, false);
    assert.ok(result.json.automaticChanges.includes('rag_ready_disabled'));

    result = await request('GET', `/api/resources/${slug}?locale=en`);
    assert.equal(result.response.status, 404);

    result = await request('GET', `/api/admin/resources/${resourceId}/metadata`, undefined, adminCookie);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.resource.sourceUrl, payload.source.url);
    const expectedUpdatedAt = result.json.resource.updatedAt;

    result = await request('PATCH', `/api/admin/resources/${resourceId}/metadata`, {
      expectedUpdatedAt,
      sourceUrl: `https://example.test/${slug}/updated`,
      sourceType: 'official_portal',
      sourceCountry: 'SG',
      sourceAuthorityLevel: 'recognised_international',
      lastSourceCheckedAt: '2026-07-16',
      replacementSourceNeeded: true,
      malaysiaGuidanceFlag: false,
      sensitiveTopicFlag: true,
      ageAppropriateness: '13-17',
      sourceLabel: 'Updated Fixture Source',
    }, adminCookie);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.resource.sourceUrl, `https://example.test/${slug}/updated`);
    assert.equal(result.json.resource.sourceType, 'official_portal');
    assert.equal(result.json.resource.sourceCountry, 'SG');
    assert.equal(result.json.resource.sourceAuthorityLevel, 'recognised_international');
    assert.equal(result.json.resource.replacementSourceNeeded, true);
    assert.equal(result.json.resource.malaysiaGuidanceFlag, false);
    assert.equal(result.json.resource.sensitiveTopicFlag, true);
    assert.equal(result.json.resource.sourceLabel, 'Updated Fixture Source');

    result = await request('PATCH', `/api/admin/resources/${resourceId}/metadata`, { slug: 'changed' }, adminCookie);
    assert.equal(result.response.status, 400);
    result = await request('PATCH', `/api/admin/resources/${resourceId}/metadata`, { publicationStatus: 'published' }, adminCookie);
    assert.equal(result.response.status, 400);
    result = await request('PATCH', `/api/admin/resources/${resourceId}/metadata`, { title: 'Changed' }, adminCookie);
    assert.equal(result.response.status, 400);
    result = await request('PATCH', `/api/admin/resources/${resourceId}/metadata`, { expectedUpdatedAt: '2000-01-01T00:00:00.000Z' }, adminCookie);
    assert.equal(result.response.status, 409);

    result = await request('PATCH', `/api/admin/resources/${resourceId}/content`, {
      locale: 'ms',
      title: `Malay ${slug}`,
      summary: `Malay summary ${slug}`,
      body: `Malay body ${slug}`,
    }, adminCookie);
    assert.equal(result.response.status, 200);
    assert.equal(await rowCount(pool, 'resource_article_translations', 'WHERE resource_id = ? AND locale = ?', [resourceId, 'ms']), 1);

    result = await request('PATCH', `/api/admin/resources/${resourceId}/content`, {
      locale: 'zh-CN',
      title: `Chinese ${slug}`,
      summary: `Chinese summary ${slug}`,
      body: `Chinese body ${slug}`,
    }, adminCookie);
    assert.equal(result.response.status, 200);
    assert.equal(await rowCount(pool, 'resource_article_translations', 'WHERE resource_id = ? AND locale = ?', [resourceId, 'zh-CN']), 1);
    assert.equal(
      await rowCount(
        pool,
        'rag_documents',
        "WHERE resource_id = ? AND status = 'published' AND review_status = 'approved' AND rag_ready = 1",
        [resourceId]
      ),
      0
    );

    const [[englishRow]] = await pool.query(
      `SELECT title FROM resource_article_translations WHERE resource_id = ? AND locale = 'en'`,
      [resourceId]
    );
    assert.equal(englishRow.title, payload.translation.title);

    const unrelatedSlug = `${slug}-unrelated`;
    result = await request('POST', '/api/admin/resources', validPayload(unrelatedSlug), adminCookie);
    assert.equal(result.response.status, 201);
    const unrelatedResourceId = result.json.resource.id;
    ids.resourceIds.push(unrelatedResourceId);
    const [[unrelatedRow]] = await pool.query('SELECT slug FROM resource_articles WHERE id = ?', [unrelatedResourceId]);
    assert.equal(unrelatedRow.slug, unrelatedSlug);

    console.log('Admin resource create/metadata verification passed.');
  } finally {
    await stopServer(child);
    await cleanup(pool, ids).catch(() => {});
    await pool.end();
  }
}

run().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});

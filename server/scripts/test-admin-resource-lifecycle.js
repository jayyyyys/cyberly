const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const bcrypt = require('bcrypt');
const { createPool } = require('../src/database/pool');

const PORT = process.env.ADMIN_RESOURCE_LIFECYCLE_TEST_PORT || '5127';
const BASE_URL = `http://127.0.0.1:${PORT}`;
const PASSWORD = 'AdminLifecycle9';
const PREFIX = `__test_admin_resource_lifecycle_${Date.now()}`;

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
  const locales = options.locales || ['en', 'ms'];
  for (const locale of locales) {
    await pool.query(
      `INSERT INTO resource_article_translations (resource_id, locale, title, summary, content_json, source_label)
       VALUES (?, ?, ?, ?, CAST(? AS JSON), 'Lifecycle Source')`,
      [
        resourceId,
        locale,
        locale === 'ms' ? `Tajuk ${slug}` : `Lifecycle title ${slug}`,
        locale === 'ms' ? `Ringkasan ${slug}` : `Lifecycle summary ${slug}`,
        JSON.stringify([{ heading: locale === 'ms' ? 'Kitaran' : 'Lifecycle', body: `Lifecycle body ${slug}` }]),
      ]
    );
  }
  return resourceId;
}

async function createRagDocument(pool, resourceId, slug, options = {}) {
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
     VALUES ('resource', ?, ?, 'en', ?, 'Lifecycle RAG summary', 'Scams', 'Lifecycle Source', 'Lifecycle Source',
             ?, CAST(? AS JSON), ?, 'approved', ?)`,
    [
      `resource:${slug}`,
      resourceId,
      `Lifecycle RAG ${slug}`,
      `https://example.test/${slug}`,
      JSON.stringify({ page: 'resources', resourceId, resourceSlug: slug }),
      options.status || 'published',
      options.ragReady === false ? 0 : 1,
    ]
  );
  await pool.query(
    `INSERT INTO rag_chunks (document_id, chunk_index, heading, chunk_text, token_estimate, metadata_json)
     VALUES (?, 0, 'Lifecycle', ?, 10, CAST(? AS JSON))`,
    [result.insertId, `Lifecycle chunk ${slug}`, JSON.stringify({ test: true })]
  );
  if (options.extraChunks) {
    for (let index = 1; index <= options.extraChunks; index += 1) {
      await pool.query(
        `INSERT INTO rag_chunks (document_id, chunk_index, heading, chunk_text, token_estimate, metadata_json)
         VALUES (?, ?, 'Lifecycle', ?, 10, CAST(? AS JSON))`,
        [result.insertId, index, `Lifecycle chunk ${slug} ${index}`, JSON.stringify({ test: true, index })]
      );
    }
  }
  return result.insertId;
}

async function createChatSource(pool, resourceId, documentId) {
  const [userResult] = await pool.query(
    `INSERT INTO users (email, username, display_name, age, age_group, password_hash, role, account_status)
     VALUES (?, ?, ?, 16, 'teen', ?, 'user', 'active')`,
    [`${PREFIX}.chat.${resourceId}@example.com`, `${PREFIX}.chat.${resourceId}@example.com`, `${PREFIX}.chat.${resourceId}`, await bcrypt.hash(PASSWORD, 10)]
  );
  const userId = userResult.insertId;
  const [conversationResult] = await pool.query(
    `INSERT INTO chat_conversations (user_id, title, locale)
     VALUES (?, 'Lifecycle source conversation', 'en')`,
    [userId]
  );
  const conversationId = conversationResult.insertId;
  const [messageResult] = await pool.query(
    `INSERT INTO chat_messages (conversation_id, role, content, locale)
     VALUES (?, 'assistant', 'Lifecycle source answer', 'en')`,
    [conversationId]
  );
  const messageId = messageResult.insertId;
  const [[chunk]] = await pool.query('SELECT id FROM rag_chunks WHERE document_id = ? LIMIT 1', [documentId]);
  await pool.query(
    `INSERT INTO chat_message_sources (
       conversation_id,
       message_id,
       document_id,
       chunk_id,
       citation_order,
       source_title,
       source_label,
       source_organisation,
       source_url,
       source_locale,
       snippet,
       internal_target_json
     )
     VALUES (?, ?, ?, ?, 1, 'Lifecycle source', 'Lifecycle Source', 'Lifecycle Source',
             'https://example.test/lifecycle', 'en', 'Lifecycle snippet', CAST(? AS JSON))`,
    [conversationId, messageId, documentId, chunk.id, JSON.stringify({ page: 'resources', resourceId })]
  );
  return { userId, conversationId, messageId };
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
  if (ids.conversationIds.length) {
    await pool.query('DELETE FROM chat_conversations WHERE id IN (?)', [ids.conversationIds]);
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
  for (const forbidden of ['password_hash', 'passwordHash', 'session', 'SESSION_SECRET', 'OPENAI_API_KEY', 'apiKey', 'prompt', 'raw SQL']) {
    assert.equal(text.includes(forbidden), false, `response should not include ${forbidden}`);
  }
}

async function run() {
  const pool = createPool();
  const child = startServer();
  const ids = { userIds: [], resourceIds: [], conversationIds: [] };

  try {
    await waitForHealth(child);

    const adminEmail = `${PREFIX}.admin@example.com`;
    const learnerEmail = `${PREFIX}.learner@example.com`;
    ids.userIds.push(await createUser(pool, adminEmail, 'admin'));
    ids.userIds.push(await createUser(pool, learnerEmail, 'user'));
    const adminCookie = await login(adminEmail);
    const learnerCookie = await login(learnerEmail);

    const eligibleSlug = `${PREFIX.replace(/^_+/, '').replace(/_/g, '-')}-eligible`;
    const publishedSlug = `${PREFIX.replace(/^_+/, '').replace(/_/g, '-')}-published`;
    const approvedSlug = `${PREFIX.replace(/^_+/, '').replace(/_/g, '-')}-approved`;
    const ragReadySlug = `${PREFIX.replace(/^_+/, '').replace(/_/g, '-')}-rag-ready`;
    const ragDocSlug = `${PREFIX.replace(/^_+/, '').replace(/_/g, '-')}-rag-doc`;
    const chatSourceSlug = `${PREFIX.replace(/^_+/, '').replace(/_/g, '-')}-chat-source`;
    const archiveSlug = `${PREFIX.replace(/^_+/, '').replace(/_/g, '-')}-archive`;
    const unrelatedSlug = `${PREFIX.replace(/^_+/, '').replace(/_/g, '-')}-unrelated`;

    const eligibleId = await createResource(pool, eligibleSlug, { locales: ['en'], reviewNotes: 'Ordinary metadata should not block deletion.' });
    const publishedId = await createResource(pool, publishedSlug, { status: 'published', reviewStatus: 'draft', ragReady: false });
    const approvedId = await createResource(pool, approvedSlug, { status: 'draft', reviewStatus: 'approved', ragReady: false });
    const ragReadyId = await createResource(pool, ragReadySlug, { status: 'draft', reviewStatus: 'draft', ragReady: true });
    const ragDocId = await createResource(pool, ragDocSlug, { status: 'draft', reviewStatus: 'draft', ragReady: false });
    const chatSourceId = await createResource(pool, chatSourceSlug, { status: 'draft', reviewStatus: 'draft', ragReady: false });
    const archiveId = await createResource(pool, archiveSlug, { status: 'published', reviewStatus: 'approved', ragReady: true });
    const unrelatedId = await createResource(pool, unrelatedSlug);
    ids.resourceIds.push(eligibleId, publishedId, approvedId, ragReadyId, ragDocId, chatSourceId, archiveId, unrelatedId);

    await createRagDocument(pool, ragDocId, ragDocSlug, { extraChunks: 2 });
    const chatDocumentId = await createRagDocument(pool, chatSourceId, chatSourceSlug);
    const chatSourceRefs = await createChatSource(pool, chatSourceId, chatDocumentId);
    ids.userIds.push(chatSourceRefs.userId);
    ids.conversationIds.push(chatSourceRefs.conversationId);
    await createRagDocument(pool, archiveId, archiveSlug);

    let result = await request('GET', `/api/admin/resources/${eligibleId}/lifecycle`);
    assert.equal(result.response.status, 401);

    result = await request('GET', `/api/admin/resources/${eligibleId}/lifecycle`, undefined, learnerCookie);
    assert.equal(result.response.status, 403);

    result = await request('GET', `/api/admin/resources/${eligibleId}/lifecycle`, undefined, adminCookie);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.lifecycle.canPermanentlyDelete, true);
    assert.equal(result.json.lifecycle.canArchive, true);
    assert.equal(result.json.lifecycle.canRestore, false);
    assert.equal(result.json.lifecycle.counts.translations, 1);
    assert.equal(result.json.lifecycle.counts.ragDocuments, 0);
    assert.equal(result.json.lifecycle.counts.ragChunks, 0);
    assert.equal(result.json.lifecycle.counts.chatSourceReferences, 0);
    assert.deepEqual(result.json.lifecycle.blockingReasons, []);
    assert.equal(result.json.lifecycle.blockingReasons.some(reason => reason.code === 'translations_exist'), false);
    assertNoSensitiveFields(result.json);

    result = await request('GET', `/api/admin/resources/${publishedId}/lifecycle`, undefined, adminCookie);
    assert.equal(result.json.lifecycle.canPermanentlyDelete, false);
    assert.ok(result.json.lifecycle.reasons.includes('resource_not_draft'));
    assert.deepEqual(result.json.lifecycle.blockingReasons.find(reason => reason.code === 'resource_not_draft'), { code: 'resource_not_draft', count: 1 });

    result = await request('GET', `/api/admin/resources/${approvedId}/lifecycle`, undefined, adminCookie);
    assert.ok(result.json.lifecycle.reasons.includes('review_not_draft'));
    assert.deepEqual(result.json.lifecycle.blockingReasons.find(reason => reason.code === 'review_not_draft'), { code: 'review_not_draft', count: 1 });

    result = await request('GET', `/api/admin/resources/${ragReadyId}/lifecycle`, undefined, adminCookie);
    assert.ok(result.json.lifecycle.reasons.includes('resource_rag_ready'));
    assert.deepEqual(result.json.lifecycle.blockingReasons.find(reason => reason.code === 'resource_rag_ready'), { code: 'resource_rag_ready', count: 1 });

    result = await request('GET', `/api/admin/resources/${ragDocId}/lifecycle`, undefined, adminCookie);
    assert.ok(result.json.lifecycle.reasons.includes('rag_documents_exist'));
    assert.equal(result.json.lifecycle.counts.ragDocuments, 1);
    assert.equal(result.json.lifecycle.counts.ragChunks, 3);
    assert.deepEqual(result.json.lifecycle.blockingReasons.find(reason => reason.code === 'rag_documents_exist'), { code: 'rag_documents_exist', count: 1 });
    assert.deepEqual(result.json.lifecycle.blockingReasons.find(reason => reason.code === 'rag_chunks_exist'), { code: 'rag_chunks_exist', count: 3 });

    result = await request('GET', `/api/admin/resources/${chatSourceId}/lifecycle`, undefined, adminCookie);
    assert.ok(result.json.lifecycle.reasons.includes('chat_source_history_exists'));
    assert.equal(result.json.lifecycle.counts.chatSourceReferences, 1);
    assert.deepEqual(result.json.lifecycle.blockingReasons.find(reason => reason.code === 'chat_source_history_exists'), { code: 'chat_source_history_exists', count: 1 });

    result = await request('DELETE', `/api/admin/resources/${eligibleId}`, { confirmationSlug: `${eligibleSlug}-wrong` }, adminCookie);
    assert.equal(result.response.status, 400);

    result = await request('DELETE', `/api/admin/resources/${publishedId}`, { confirmationSlug: publishedSlug }, adminCookie);
    assert.equal(result.response.status, 409);
    assert.ok(result.json.reasons.includes('resource_not_draft'));
    assert.equal(result.json.canArchive, true);
    assert.deepEqual(result.json.blockingReasons.find(reason => reason.code === 'resource_not_draft'), { code: 'resource_not_draft', count: 1 });

    result = await request('DELETE', `/api/admin/resources/${eligibleId}`, { confirmationSlug: eligibleSlug }, adminCookie);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.ok, true);
    assert.equal(await rowCount(pool, 'resource_articles', 'WHERE id = ?', [eligibleId]), 0);
    assert.equal(await rowCount(pool, 'resource_article_translations', 'WHERE resource_id = ?', [eligibleId]), 0);
    assert.equal(await rowCount(pool, 'resource_articles', 'WHERE id = ?', [unrelatedId]), 1);
    ids.resourceIds = ids.resourceIds.filter(id => id !== eligibleId);

    result = await request('POST', `/api/admin/resources/${archiveId}/archive`, {}, adminCookie);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.resource.publicationStatus, 'archived');
    assert.equal(result.json.resource.ragReady, false);
    assert.equal(result.json.lifecycle.canArchive, false);
    assert.equal(result.json.lifecycle.canRestore, true);
    assert.equal(await rowCount(pool, 'rag_documents', "WHERE resource_id = ? AND status = 'published' AND review_status = 'approved' AND rag_ready = 1", [archiveId]), 0);

    result = await request('GET', '/api/resources?locale=en');
    assert.equal(result.response.status, 200);
    assert.equal(result.json.resources.some(resource => resource.slug === archiveSlug), false);

    result = await request('GET', `/api/admin/resources/${archiveId}`, undefined, adminCookie);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.resource.publicationStatus, 'archived');
    assert.ok(result.json.resource.translations.length >= 2);

    result = await request('POST', `/api/admin/resources/${archiveId}/restore`, {}, adminCookie);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.resource.publicationStatus, 'draft');
    assert.equal(result.json.resource.ragReady, false);
    assert.equal(result.json.lifecycle.canArchive, true);
    assert.equal(result.json.lifecycle.canRestore, false);

    assert.equal(await rowCount(pool, 'chat_message_sources', 'WHERE document_id = ?', [chatDocumentId]), 1);

    console.log('Admin resource lifecycle verification passed.');
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

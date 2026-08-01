const assert = require('node:assert/strict');
const { createPool } = require('../src/database/pool');
const { createRagRepository } = require('../src/rag/rag.repository');
const { createRagService } = require('../src/rag/rag.service');

async function tableExists(pool, tableName) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS count
     FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?`,
    [tableName]
  );
  return Number(rows[0]?.count || 0) > 0;
}

async function cleanup(pool) {
  if (await tableExists(pool, 'rag_chunks')) {
    await pool.query('DELETE FROM rag_chunks');
  }
  if (await tableExists(pool, 'rag_documents')) {
    await pool.query('DELETE FROM rag_documents');
  }
  if (await tableExists(pool, 'resource_article_translations')) {
    await pool.query("DELETE FROM resource_article_translations WHERE locale = 'test'");
  }
  if (await tableExists(pool, 'resource_articles')) {
    await pool.query("DELETE FROM resource_articles WHERE slug LIKE 'rag-test-%'");
  }
}

async function insertResource(pool, {
  slug,
  status = 'published',
  categoryCode = 'Scams',
  locale = 'en',
  title,
  summary,
  body,
  sourceLabel = 'Reviewed Source',
  sourceUrl = 'https://example.test/reviewed',
}) {
  const [resourceResult] = await pool.query(
    `INSERT INTO resource_articles (slug, category_code, source_url, display_order, status)
     VALUES (?, ?, ?, 999, ?)`,
    [slug, categoryCode, sourceUrl, status]
  );
  await pool.query(
    `INSERT INTO resource_article_translations (
        resource_id, locale, title, summary, content_json, source_label
     )
     VALUES (?, ?, ?, ?, JSON_ARRAY(JSON_OBJECT('heading', 'Body', 'body', ?)), ?)`,
    [resourceResult.insertId, locale, title, summary, body, sourceLabel]
  );
  return resourceResult.insertId;
}

function assertSafeChunk(chunk) {
  assert.ok(Number.isInteger(chunk.chunkId));
  assert.ok(Number.isInteger(chunk.documentId));
  assert.equal(typeof chunk.title, 'string');
  assert.equal(typeof chunk.locale, 'string');
  assert.equal(typeof chunk.snippet, 'string');
  assert.ok(chunk.snippet.length > 0);
  assert.ok(chunk.internalTarget);
  assert.equal(chunk.internalTarget.page, 'resources');
  assert.equal(Object.hasOwn(chunk.internalTarget, 'route'), false);
  assert.equal(Object.hasOwn(chunk.internalTarget, 'url'), false);
  assert.equal(Object.hasOwn(chunk, 'content'), false);
  assert.equal(Object.hasOwn(chunk, 'providerRequestId'), false);
  assert.equal(Object.hasOwn(chunk, 'inputTokens'), false);
}

async function run() {
  const pool = createPool();
  const repository = createRagRepository(pool);
  const service = createRagService(repository);

  try {
    await cleanup(pool);

    assert.equal(await tableExists(pool, 'rag_documents'), true);
    assert.equal(await tableExists(pool, 'rag_chunks'), true);

    await insertResource(pool, {
      slug: 'rag-test-phishing',
      title: 'Phishing red flags',
      summary: 'Learn how to spot suspicious links and urgent messages.',
      body: 'A phishing scam often uses urgency, strange links, requests for OTPs, or payment pressure.',
      sourceLabel: 'Cyberly Reviewed Resource',
    });
    await insertResource(pool, {
      slug: 'rag-test-draft',
      status: 'draft',
      title: 'Draft unsafe draft',
      summary: 'This draft should not be available.',
      body: 'draft-only-secret-keyword',
    });
    await insertResource(pool, {
      slug: 'rag-test-ms',
      locale: 'ms',
      title: 'Tanda pancingan data',
      summary: 'Kenal pasti pautan mencurigakan dan mesej mendesak.',
      body: 'Pancingan data sering menggunakan pautan pelik, tekanan segera, dan permintaan OTP.',
      sourceLabel: 'Sumber Semakan Cyberly',
    });

    const firstIngest = await service.ingestPublishedResources();
    assert.equal(firstIngest.documents >= 2, true);
    assert.equal(firstIngest.chunks > 0, true);

    const [[docCountAfterFirst]] = await pool.query('SELECT COUNT(*) AS count FROM rag_documents');
    const [[chunkCountAfterFirst]] = await pool.query('SELECT COUNT(*) AS count FROM rag_chunks');
    const secondIngest = await service.ingestPublishedResources();
    const [[docCountAfterSecond]] = await pool.query('SELECT COUNT(*) AS count FROM rag_documents');
    const [[chunkCountAfterSecond]] = await pool.query('SELECT COUNT(*) AS count FROM rag_chunks');
    assert.equal(docCountAfterSecond.count, docCountAfterFirst.count);
    assert.equal(chunkCountAfterSecond.count, chunkCountAfterFirst.count);
    assert.equal(secondIngest.documents >= firstIngest.documents, true);

    const [chunkRows] = await pool.query(
      `SELECT rd.title, rc.heading, rc.chunk_text
       FROM rag_chunks rc
       JOIN rag_documents rd ON rd.id = rc.document_id
       WHERE rd.content_type = 'resource'
         AND rd.title = 'Phishing red flags'
       ORDER BY rc.chunk_index`
    );
    assert.equal(chunkRows.some(row => row.chunk_text.includes('Phishing red flags')), true);
    assert.equal(chunkRows.some(row => row.chunk_text.includes('suspicious links')), true);
    assert.equal(chunkRows.some(row => row.chunk_text.includes('payment pressure')), true);

    let results = await service.retrieveReviewedChunks({
      query: 'phishing suspicious links OTP',
      locale: 'en',
      limit: 4,
    });
    assert.equal(results.length > 0, true);
    results.forEach(assertSafeChunk);
    assert.equal(results.some(item => item.title === 'Phishing red flags'), true);
    assert.equal(results.some(item => item.snippet.includes('draft-only-secret-keyword')), false);

    const [[draftDocCount]] = await pool.query(
      `SELECT COUNT(*) AS count
       FROM rag_documents
       WHERE title = 'Draft unsafe draft'`
    );
    assert.equal(draftDocCount.count, 0);

    await pool.query(
      `UPDATE rag_documents
       SET rag_ready = 0
       WHERE title = 'Phishing red flags'`
    );
    results = await service.retrieveReviewedChunks({
      query: 'phishing suspicious links OTP',
      locale: 'en',
      limit: 4,
    });
    assert.equal(results.some(item => item.title === 'Phishing red flags'), false);
    await pool.query(
      `UPDATE rag_documents
       SET rag_ready = 1
       WHERE title = 'Phishing red flags'`
    );

    const msResults = await service.retrieveReviewedChunks({
      query: 'pautan pelik OTP',
      locale: 'ms-MY',
      limit: 4,
    });
    assert.equal(msResults.length > 0, true);
    assert.equal(msResults[0].locale, 'ms');
    assert.equal(msResults.some(item => item.title === 'Tanda pancingan data'), true);

    const fallbackResults = await service.retrieveReviewedChunks({
      query: 'payment pressure suspicious links',
      locale: 'zh-CN',
      limit: 4,
    });
    assert.equal(fallbackResults.length > 0, true);
    assert.equal(fallbackResults.some(item => item.locale === 'en'), true);

    await assert.rejects(
      service.retrieveReviewedChunks({ query: '   ', locale: 'en' }),
      /RAG query is required/
    );

    const categoryResults = await service.retrieveReviewedChunks({
      query: 'OTP pressure',
      locale: 'en',
      categoryCode: 'Scams',
      limit: 4,
    });
    assert.equal(categoryResults.length > 0, true);
    categoryResults.forEach(assertSafeChunk);

    console.log('RAG foundation verification passed.');
  } finally {
    await cleanup(pool).catch(() => {});
    await pool.end();
  }
}

run().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});

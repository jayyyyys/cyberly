const fs = require('node:fs/promises');
const path = require('node:path');
const { createPool, getDatabaseConfig } = require('../src/database/pool');

const OUTPUT_PATH = process.argv[2] || path.join(
  __dirname,
  '..',
  '..',
  'docs',
  'planning',
  'import-preview',
  'current-content-catalog.json'
);

const COUNT_TABLES = [
  'resource_articles',
  'resource_article_translations',
  'scenario_definitions',
  'scenario_steps',
  'rag_documents',
  'rag_chunks',
];

function assertSelectOnly(sql) {
  const normalized = String(sql || '').replace(/^\s*\/\*[\s\S]*?\*\/\s*/, '').trim().toUpperCase();
  if (!normalized.startsWith('SELECT ')) {
    throw new Error(`Read-only exporter blocked non-SELECT SQL: ${normalized.slice(0, 32)}`);
  }
  const forbidden = /\b(INSERT|UPDATE|DELETE|REPLACE|ALTER|CREATE|DROP|TRUNCATE|MERGE|CALL|LOAD|GRANT|REVOKE)\b/i;
  if (forbidden.test(sql)) {
    throw new Error('Read-only exporter blocked mutation-like SQL.');
  }
}

async function select(pool, sql, params = []) {
  assertSelectOnly(sql);
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function tableExists(pool, tableName) {
  const config = getDatabaseConfig();
  const rows = await select(
    pool,
    `SELECT COUNT(*) AS count
     FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
    [config.database, tableName]
  );
  return Number(rows[0]?.count || 0) > 0;
}

async function countRows(pool) {
  const counts = {};
  for (const table of COUNT_TABLES) {
    if (!(await tableExists(pool, table))) {
      counts[table] = null;
      continue;
    }
    const rows = await select(pool, `SELECT COUNT(*) AS count FROM ${table}`);
    counts[table] = Number(rows[0]?.count || 0);
  }
  return counts;
}

async function exportCatalogue() {
  const pool = createPool();
  try {
    const config = getDatabaseConfig();
    const countsBefore = await countRows(pool);
    const scenarioDefinitionTranslationsSupported = await tableExists(pool, 'scenario_definition_translations');

    const resources = await select(
      pool,
      `SELECT ra.id,
              ra.slug,
              ra.category_code,
              ra.status AS publication_status,
              ra.review_status,
              ra.rag_ready,
              ra.source_url,
              rat.locale,
              rat.title,
              rat.summary
       FROM resource_articles ra
       LEFT JOIN resource_article_translations rat ON rat.resource_id = ra.id
       ORDER BY ra.id, FIELD(rat.locale, 'en', 'ms', 'zh-CN'), rat.locale`
    );

    const scenarios = scenarioDefinitionTranslationsSupported
      ? await select(
        pool,
        `SELECT sd.id,
                sd.slug,
                sd.topic_code,
                sd.status,
                sd.difficulty,
                sd.estimated_minutes,
                sd.total_steps,
                COALESCE(st.locale, 'en') AS locale,
                COALESCE(st.title, sd.title) AS title,
                COALESCE(st.summary, sd.summary) AS summary
         FROM scenario_definitions sd
         LEFT JOIN scenario_definition_translations st ON st.scenario_id = sd.id
         ORDER BY sd.id, FIELD(st.locale, 'en', 'ms', 'zh-CN'), st.locale`
      )
      : await select(
        pool,
        `SELECT sd.id,
                sd.slug,
                sd.topic_code,
                sd.status,
                sd.difficulty,
                sd.estimated_minutes,
                sd.total_steps,
                'en' AS locale,
                sd.title,
                sd.summary
         FROM scenario_definitions sd
         ORDER BY sd.id`
      );

    const faqSupported = await tableExists(pool, 'faq_entries');
    const safetySummarySupported = await tableExists(pool, 'safety_summaries');
    const relationshipSupported = await tableExists(pool, 'content_relationships');
    const subcategorySupported = await tableExists(pool, 'content_subcategories');

    const countsAfter = await countRows(pool);
    const catalogue = {
      generatedAt: new Date().toISOString(),
      database: {
        name: config.database,
        mode: 'select-only',
        countsBefore,
        countsAfter,
        unchanged: JSON.stringify(countsBefore) === JSON.stringify(countsAfter),
      },
      support: {
        resource: 'live_supported',
        scenario: 'live_supported',
        faq: faqSupported ? 'partially_supported' : 'planning_only',
        safetySummary: safetySummarySupported ? 'partially_supported' : 'planning_only',
        relationship: relationshipSupported ? 'partially_supported' : 'planning_only',
        subcategory: subcategorySupported ? 'partially_supported' : 'planning_only',
      },
      resources,
      scenarios,
      faqs: { supported: faqSupported, items: [] },
      safetySummaries: { supported: safetySummarySupported, items: [] },
      relationships: { supported: relationshipSupported, items: [] },
      subcategories: { supported: subcategorySupported, items: [] },
    };

    if (!catalogue.database.unchanged) {
      throw new Error('Database counts changed during read-only catalogue export.');
    }

    await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
    await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(catalogue, null, 2)}\n`, 'utf8');
    console.log(`Read-only content catalogue exported to ${OUTPUT_PATH}`);
    console.log(JSON.stringify({ countsBefore, countsAfter, unchanged: true }, null, 2));
  } finally {
    await pool.end();
  }
}

exportCatalogue().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});

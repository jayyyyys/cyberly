const assert = require('assert');
const path = require('path');

const {
  assertSafeTestDatabaseName,
  buildTestDatabaseConfig,
  createIsolatedDatabaseName,
  redactConfigForError,
  validateTestDatabaseEnvironment,
} = require('../src/database/migration-test-safety');
const {
  listMigrationFilesThrough,
} = require('../src/database/migration-runner');
const {
  columnExists,
  foreignKeyExists,
  indexExists,
  migrationRecorded,
  tableExists,
  triggerExists,
} = require('../src/database/schema-assertions');

function assertThrowsMessage(fn, pattern, label) {
  assert.throws(fn, (error) => {
    assert.match(error.message, pattern, label);
    return true;
  });
}

function runSafetyTests() {
  assertThrowsMessage(
    () => validateTestDatabaseEnvironment({}),
    /TEST_DB_HOST/,
    'missing test DB configuration should fail closed'
  );

  assertThrowsMessage(
    () => assertSafeTestDatabaseName('cyberly'),
    /refusing/i,
    'normal application database must be rejected'
  );

  for (const systemDb of ['mysql', 'information_schema', 'performance_schema', 'sys']) {
    assertThrowsMessage(
      () => assertSafeTestDatabaseName(systemDb),
      /refusing/i,
      `system database ${systemDb} must be rejected`
    );
  }

  assertThrowsMessage(
    () => assertSafeTestDatabaseName('cyberly_migration_test_123'),
    /cyberly_test_/,
    'old smoke-test prefix must be rejected'
  );

  assert.equal(assertSafeTestDatabaseName('cyberly_test_migrations_123'), 'cyberly_test_migrations_123');
  assert.match(createIsolatedDatabaseName('migrations'), /^cyberly_test_migrations_\d{8}_\d{6}_[a-f0-9]{6}$/);

  const env = {
    TEST_DB_HOST: '127.0.0.1',
    TEST_DB_PORT: '3306',
    TEST_DB_USER: 'root',
    TEST_DB_PASSWORD: 'super-secret',
    TEST_DB_ADMIN_DATABASE: 'mysql',
  };

  const config = validateTestDatabaseEnvironment(env);
  assert.equal(config.host, '127.0.0.1');
  assert.equal(config.port, 3306);
  assert.equal(config.user, 'root');
  assert.equal(config.password, 'super-secret');
  assert.equal(config.adminDatabase, 'mysql');

  const dbConfig = buildTestDatabaseConfig(config, 'cyberly_test_migrations_abc');
  assert.equal(dbConfig.database, 'cyberly_test_migrations_abc');
  assert.equal(dbConfig.multipleStatements, false);

  const redacted = JSON.stringify(redactConfigForError(dbConfig));
  assert.ok(!redacted.includes('super-secret'));
  assert.ok(!redacted.includes('mysql://'));
}

function runMigrationOrderingTests() {
  const migrationsDir = path.resolve(__dirname, '../migrations');
  const all = listMigrationFilesThrough({ migrationsDir });
  assert.equal(all[0], '001_create_schema_migrations.sql');
  assert.equal(all[all.length - 1], '026_create_agentic_execution_traces.sql');

  const through020 = listMigrationFilesThrough({
    migrationsDir,
    through: '020_create_rag_documents_and_chunks.sql',
  });
  assert.equal(through020[through020.length - 1], '020_create_rag_documents_and_chunks.sql');
  assert.ok(!through020.includes('021_create_chat_message_sources.sql'));

  assertThrowsMessage(
    () => listMigrationFilesThrough({ migrationsDir, through: '999_missing.sql' }),
    /Unknown migration boundary/,
    'unknown migration boundary should be rejected'
  );
}

async function runSchemaHelperTests() {
  const calls = [];
  const connection = {
    async query(sql, params) {
      calls.push({ sql, params });
      if (sql.includes('INFORMATION_SCHEMA.TABLES')) return [[{ count: 1 }]];
      if (sql.includes('INFORMATION_SCHEMA.COLUMNS')) return [[{ count: 0 }]];
      if (sql.includes('INFORMATION_SCHEMA.STATISTICS')) return [[{ count: 1 }]];
      if (sql.includes('INFORMATION_SCHEMA.TRIGGERS')) return [[{ count: 1 }]];
      if (sql.includes('INFORMATION_SCHEMA.KEY_COLUMN_USAGE')) return [[{ count: 1 }]];
      if (sql.includes('FROM schema_migrations')) return [[{ count: 1 }]];
      throw new Error(`Unexpected query: ${sql}`);
    },
  };

  assert.equal(await tableExists(connection, 'users'), true);
  assert.equal(await columnExists(connection, 'users', 'birth_year'), false);
  assert.equal(await indexExists(connection, 'users', 'uq_users_email'), true);
  assert.equal(await triggerExists(connection, 'users_before_insert_legacy_defaults'), true);
  assert.equal(await foreignKeyExists(connection, 'learner_profiles', 'fk_learner_profiles_user'), true);
  assert.equal(await migrationRecorded(connection, '026_create_agentic_execution_traces.sql'), true);

  for (const call of calls) {
    assert.ok(Array.isArray(call.params), 'schema helper query should use parameters');
    assert.ok(!call.sql.includes("'users'"), 'schema helper should not interpolate table values');
  }
}

(async () => {
  runSafetyTests();
  runMigrationOrderingTests();
  await runSchemaHelperTests();
  console.log('Migration foundation unit tests passed.');
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

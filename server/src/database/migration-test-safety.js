const crypto = require('crypto');

const REQUIRED_TEST_ENV = [
  'TEST_DB_HOST',
  'TEST_DB_USER',
  'TEST_DB_PASSWORD',
  'TEST_DB_ADMIN_DATABASE',
];

const SYSTEM_DATABASES = new Set([
  'cyberly',
  'mysql',
  'information_schema',
  'performance_schema',
  'sys',
]);

const DEPLOYED_HOST_PATTERNS = [
  /\.aivencloud\.com$/i,
  /\.render\.com$/i,
  /\.onrender\.com$/i,
];

function assertSafeTestDatabaseName(databaseName) {
  const value = String(databaseName || '').trim();
  if (!value) {
    throw new Error('Refusing to use an empty test database name.');
  }
  if (!/^cyberly_test_[A-Za-z0-9_]+$/.test(value)) {
    throw new Error('Refusing to use test database name without required cyberly_test_ prefix.');
  }
  if (SYSTEM_DATABASES.has(value.toLowerCase())) {
    throw new Error(`Refusing to use protected database name: ${value}`);
  }
  return value;
}

function assertSafeTestHost(host) {
  const value = String(host || '').trim();
  if (!value) {
    throw new Error('TEST_DB_HOST is required for migration tests.');
  }
  if (DEPLOYED_HOST_PATTERNS.some((pattern) => pattern.test(value))) {
    throw new Error('Refusing to run migration tests against a deployed/prototype database host.');
  }
  return value;
}

function createIsolatedDatabaseName(label = 'migrations') {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const time = now.toISOString().slice(11, 19).replace(/:/g, '');
  const suffix = crypto.randomBytes(3).toString('hex');
  const safeLabel = String(label || 'migrations').replace(/[^A-Za-z0-9_]/g, '_').slice(0, 24) || 'migrations';
  return assertSafeTestDatabaseName(`cyberly_test_${safeLabel}_${date}_${time}_${suffix}`);
}

function validateTestDatabaseEnvironment(env = process.env) {
  for (const key of REQUIRED_TEST_ENV) {
    if (!String(env[key] || '').trim()) {
      throw new Error(`${key} is required for isolated migration tests.`);
    }
  }

  const host = assertSafeTestHost(env.TEST_DB_HOST);
  const port = env.TEST_DB_PORT ? Number(env.TEST_DB_PORT) : 3306;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('TEST_DB_PORT must be a valid TCP port.');
  }

  return {
    host,
    port,
    user: String(env.TEST_DB_USER),
    password: String(env.TEST_DB_PASSWORD),
    adminDatabase: String(env.TEST_DB_ADMIN_DATABASE),
  };
}

function buildTestDatabaseConfig(testConfig, databaseName) {
  return {
    host: testConfig.host,
    port: testConfig.port,
    user: testConfig.user,
    password: testConfig.password,
    database: assertSafeTestDatabaseName(databaseName),
    multipleStatements: false,
  };
}

function buildAdminDatabaseConfig(testConfig) {
  return {
    host: testConfig.host,
    port: testConfig.port,
    user: testConfig.user,
    password: testConfig.password,
    database: testConfig.adminDatabase,
    multipleStatements: false,
  };
}

function redactConfigForError(config = {}) {
  return {
    host: config.host ? String(config.host) : undefined,
    port: config.port,
    user: config.user ? '[redacted-user]' : undefined,
    password: config.password ? '[redacted-password]' : undefined,
    database: config.database,
    multipleStatements: config.multipleStatements,
    ssl: config.ssl ? '[redacted-ssl-config]' : undefined,
  };
}

module.exports = {
  assertSafeTestDatabaseName,
  assertSafeTestHost,
  buildAdminDatabaseConfig,
  buildTestDatabaseConfig,
  createIsolatedDatabaseName,
  redactConfigForError,
  validateTestDatabaseEnvironment,
};


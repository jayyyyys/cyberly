const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config({ quiet: true });

function parseBoolean(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function getSslConfig() {
  const legacyEnabled = parseBoolean(process.env.DB_SSL, false);
  const mode = String(process.env.DB_SSL_MODE || (legacyEnabled ? 'required' : 'disabled')).trim().toLowerCase();
  const ca = String(process.env.DB_SSL_CA || '').replace(/\\n/g, '\n').trim();

  if (['', 'disabled', 'false', '0'].includes(mode)) {
    return undefined;
  }

  if (mode !== 'required') {
    throw new Error('DB_SSL_MODE must be either "disabled" or "required".');
  }

  if (ca) {
    return {
      rejectUnauthorized: true,
      ca,
    };
  }

  return {
    rejectUnauthorized: parseBoolean(process.env.DB_SSL_REJECT_UNAUTHORIZED, true),
  };
}

function getDatabaseConfig() {
  const ssl = getSslConfig();
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'cyberly',
    multipleStatements: false,
  };

  if (ssl) {
    config.ssl = ssl;
  }

  return config;
}

function getDatabaseErrorSummary(error = {}) {
  const code = error.code || error.cause?.code || 'UNKNOWN_DATABASE_ERROR';
  const errno = error.errno || error.cause?.errno || null;
  const sqlState = error.sqlState || error.cause?.sqlState || null;
  const certificateCodes = new Set([
    'CERT_HAS_EXPIRED',
    'DEPTH_ZERO_SELF_SIGNED_CERT',
    'SELF_SIGNED_CERT_IN_CHAIN',
    'UNABLE_TO_GET_ISSUER_CERT',
    'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
    'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  ]);

  let category = 'database_error';
  if (code === 'HANDSHAKE_SSL_ERROR' || certificateCodes.has(code)) {
    category = 'ssl_or_certificate_error';
  } else if (code === 'ER_ACCESS_DENIED_ERROR') {
    category = 'access_denied';
  } else if (code === 'ER_BAD_DB_ERROR') {
    category = 'unknown_database';
  } else if (['ENOTFOUND', 'EAI_AGAIN'].includes(code)) {
    category = 'dns_failure';
  } else if (code === 'ECONNREFUSED') {
    category = 'connection_refused';
  } else if (['ETIMEDOUT', 'ESOCKET', 'PROTOCOL_CONNECTION_LOST'].includes(code)) {
    category = 'connection_unavailable';
  }

  return { category, code, errno, sqlState };
}

function createPool() {
  return mysql.createPool({
    ...getDatabaseConfig(),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });
}

module.exports = {
  createPool,
  getDatabaseConfig,
  getDatabaseErrorSummary,
  getSslConfig,
};

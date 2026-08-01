const mysql = require('mysql2/promise');
const { getDatabaseConfig, getDatabaseErrorSummary } = require('../src/database/pool');

function quoteIdentifier(identifier) {
  if (!/^[A-Za-z0-9_]+$/.test(identifier)) {
    throw new Error('DB_NAME may contain only letters, numbers, and underscores.');
  }
  return `\`${identifier}\``;
}

async function run() {
  const config = getDatabaseConfig();
  const database = config.database;
  const connection = await mysql.createConnection({
    ...config,
    database: undefined,
    multipleStatements: false,
  });

  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS ${quoteIdentifier(database)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    console.log(`Database ready: ${database}`);
  } finally {
    await connection.end();
  }
}

run().catch(error => {
  console.error('Database ensure failed:', getDatabaseErrorSummary(error));
  process.exitCode = 1;
});

const { createPool, getDatabaseErrorSummary } = require('../src/database/pool');
const { listMigrationFilesThrough, printStatus, runMigrations } = require('../src/database/migration-runner');

async function main(argv = process.argv) {
  const isStatus = argv.includes('--status');
  const pool = createPool();
  const connection = await pool.getConnection();

  try {
    const migrationFiles = listMigrationFilesThrough();

    if (isStatus) {
      await printStatus(connection, migrationFiles);
      return;
    }

    await runMigrations({ connection });
  } finally {
    connection.release();
    await pool.end();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Migration database connection failed:', getDatabaseErrorSummary(error));
    process.exitCode = 1;
  });
}

module.exports = {
  main,
};

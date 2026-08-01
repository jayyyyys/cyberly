const {
  getMigrationId,
  listMigrationFiles,
  readMigration,
  splitSqlStatements,
} = require('./migration-utils');

async function hasSchemaMigrationsTable(connection) {
  const [rows] = await connection.query(`
    SELECT COUNT(*) AS count
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'schema_migrations'
  `);
  return Number(rows[0].count) > 0;
}

async function getAppliedMigrations(connection) {
  if (!(await hasSchemaMigrationsTable(connection))) {
    return new Map();
  }

  const [rows] = await connection.query(`
    SELECT migration_id, filename, applied_at
    FROM schema_migrations
    ORDER BY migration_id
  `);

  return new Map(rows.map((row) => [row.filename, row]));
}

function listMigrationFilesThrough({ migrationsDir, through } = {}) {
  const files = listMigrationFiles(migrationsDir);
  if (!through) return files;

  const boundaryIndex = files.indexOf(through);
  if (boundaryIndex === -1) {
    throw new Error(`Unknown migration boundary: ${through}`);
  }
  return files.slice(0, boundaryIndex + 1);
}

async function printStatus(connection, migrationFiles) {
  const applied = await getAppliedMigrations(connection);

  console.log('Migration status:');
  for (const filename of migrationFiles) {
    const state = applied.has(filename) ? 'applied' : 'pending';
    console.log(`- ${filename}: ${state}`);
  }
}

async function applyMigration(connection, filename, options = {}) {
  const migrationId = getMigrationId(filename);
  const sql = readMigration(filename, options.migrationsDir);
  const statements = splitSqlStatements(sql);

  console.log(`Applying ${filename}`);
  await connection.beginTransaction();
  try {
    for (const statement of statements) {
      await connection.query(statement);
    }

    await connection.query(
      `
        INSERT INTO schema_migrations (migration_id, filename)
        VALUES (?, ?)
      `,
      [migrationId, filename]
    );

    await connection.commit();
    console.log(`Applied ${filename}`);
  } catch (error) {
    await connection.rollback();
    console.error(`Failed ${filename}: ${error.code || error.message}`);
    throw error;
  }
}

async function runMigrations({ connection, migrationsDir, through } = {}) {
  if (!connection) {
    throw new Error('runMigrations requires a database connection.');
  }
  const migrationFiles = listMigrationFilesThrough({ migrationsDir, through });
  const applied = await getAppliedMigrations(connection);

  for (const filename of migrationFiles) {
    if (applied.has(filename)) {
      console.log(`Skipping ${filename}`);
      continue;
    }

    await applyMigration(connection, filename, { migrationsDir });
  }

  return migrationFiles;
}

module.exports = {
  applyMigration,
  getAppliedMigrations,
  hasSchemaMigrationsTable,
  listMigrationFilesThrough,
  printStatus,
  runMigrations,
};


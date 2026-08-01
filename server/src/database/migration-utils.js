const fs = require('fs');
const path = require('path');

function getMigrationsDir() {
  return path.resolve(__dirname, '../../migrations');
}

function listMigrationFiles(migrationsDir = getMigrationsDir()) {
  return fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));
}

function getMigrationId(filename) {
  const match = filename.match(/^(\d+)_/);
  if (!match) {
    throw new Error(`Migration filename must start with a numeric identifier: ${filename}`);
  }
  return match[1];
}

function stripSqlComments(sql) {
  return sql
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');
}

function splitSqlStatements(sql) {
  const statements = [];
  const blockPattern = /--\s*migrate:statement-start\s*\r?\n([\s\S]*?)\r?\n--\s*migrate:statement-end/g;

  let lastIndex = 0;
  let match;
  while ((match = blockPattern.exec(sql)) !== null) {
    const beforeBlock = sql.slice(lastIndex, match.index);
    statements.push(
      ...stripSqlComments(beforeBlock)
        .split(';')
        .map((statement) => statement.trim())
        .filter(Boolean)
    );

    const block = match[1];
    statements.push(block.trim());
    lastIndex = blockPattern.lastIndex;
  }

  const afterLastBlock = sql.slice(lastIndex);
  statements.push(
    ...stripSqlComments(afterLastBlock)
      .split(';')
      .map((statement) => statement.trim())
      .filter(Boolean)
  );

  return statements;
}

function readMigration(filename, migrationsDir = getMigrationsDir()) {
  const fullPath = path.join(migrationsDir, filename);
  return fs.readFileSync(fullPath, 'utf8');
}

module.exports = {
  getMigrationId,
  getMigrationsDir,
  listMigrationFiles,
  readMigration,
  splitSqlStatements,
};

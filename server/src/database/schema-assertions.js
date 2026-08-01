async function countInformationSchema(connection, sql, params) {
  const [rows] = await connection.query(sql, params);
  return Number(rows[0]?.count || 0);
}

async function tableExists(connection, tableName, schemaName = null) {
  const schemaCondition = schemaName ? 'TABLE_SCHEMA = ?' : 'TABLE_SCHEMA = DATABASE()';
  const params = schemaName ? [schemaName, tableName] : [tableName];
  const count = await countInformationSchema(
    connection,
    `SELECT COUNT(*) AS count
       FROM INFORMATION_SCHEMA.TABLES
      WHERE ${schemaCondition}
        AND TABLE_NAME = ?`,
    params
  );
  return count > 0;
}

async function columnExists(connection, tableName, columnName, schemaName = null) {
  const schemaCondition = schemaName ? 'TABLE_SCHEMA = ?' : 'TABLE_SCHEMA = DATABASE()';
  const params = schemaName ? [schemaName, tableName, columnName] : [tableName, columnName];
  const count = await countInformationSchema(
    connection,
    `SELECT COUNT(*) AS count
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE ${schemaCondition}
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?`,
    params
  );
  return count > 0;
}

async function indexExists(connection, tableName, indexName, schemaName = null) {
  const schemaCondition = schemaName ? 'TABLE_SCHEMA = ?' : 'TABLE_SCHEMA = DATABASE()';
  const params = schemaName ? [schemaName, tableName, indexName] : [tableName, indexName];
  const count = await countInformationSchema(
    connection,
    `SELECT COUNT(*) AS count
       FROM INFORMATION_SCHEMA.STATISTICS
      WHERE ${schemaCondition}
        AND TABLE_NAME = ?
        AND INDEX_NAME = ?`,
    params
  );
  return count > 0;
}

async function triggerExists(connection, triggerName, schemaName = null) {
  const schemaCondition = schemaName ? 'TRIGGER_SCHEMA = ?' : 'TRIGGER_SCHEMA = DATABASE()';
  const params = schemaName ? [schemaName, triggerName] : [triggerName];
  const count = await countInformationSchema(
    connection,
    `SELECT COUNT(*) AS count
       FROM INFORMATION_SCHEMA.TRIGGERS
      WHERE ${schemaCondition}
        AND TRIGGER_NAME = ?`,
    params
  );
  return count > 0;
}

async function foreignKeyExists(connection, tableName, constraintName, schemaName = null) {
  const schemaCondition = schemaName ? 'CONSTRAINT_SCHEMA = ?' : 'CONSTRAINT_SCHEMA = DATABASE()';
  const params = schemaName ? [schemaName, tableName, constraintName] : [tableName, constraintName];
  const count = await countInformationSchema(
    connection,
    `SELECT COUNT(*) AS count
       FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE ${schemaCondition}
        AND TABLE_NAME = ?
        AND CONSTRAINT_NAME = ?
        AND REFERENCED_TABLE_NAME IS NOT NULL`,
    params
  );
  return count > 0;
}

async function migrationRecorded(connection, filename) {
  const count = await countInformationSchema(
    connection,
    `SELECT COUNT(*) AS count
       FROM schema_migrations
      WHERE filename = ?`,
    [filename]
  );
  return count > 0;
}

async function assertExists(label, existsPromise) {
  if (!(await existsPromise)) {
    throw new Error(`Expected schema object missing: ${label}`);
  }
}

module.exports = {
  assertExists,
  columnExists,
  foreignKeyExists,
  indexExists,
  migrationRecorded,
  tableExists,
  triggerExists,
};


SET @scenario_publication_schema = DATABASE();

SET @column_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @scenario_publication_schema
    AND TABLE_NAME = 'scenario_definitions'
    AND COLUMN_NAME = 'first_published_at'
);
SET @sql = IF(
  @column_exists = 0,
  'ALTER TABLE scenario_definitions ADD COLUMN first_published_at TIMESTAMP(3) NULL AFTER status',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE scenario_definitions
SET first_published_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP(3))
WHERE status = 'published'
  AND first_published_at IS NULL;

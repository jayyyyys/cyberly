SET @resource_translation_schema = DATABASE();

SET @column_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @resource_translation_schema
    AND TABLE_NAME = 'resource_article_translations'
    AND COLUMN_NAME = 'created_at'
);
SET @sql = IF(
  @column_exists = 0,
  'ALTER TABLE resource_article_translations ADD COLUMN created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) AFTER source_label',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @resource_translation_schema
    AND TABLE_NAME = 'resource_article_translations'
    AND COLUMN_NAME = 'updated_at'
);
SET @sql = IF(
  @column_exists = 0,
  'ALTER TABLE resource_article_translations ADD COLUMN updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) AFTER created_at',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

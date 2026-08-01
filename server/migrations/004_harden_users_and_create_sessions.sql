ALTER TABLE users
  MODIFY COLUMN username VARCHAR(100) NULL;

ALTER TABLE users
  MODIFY COLUMN password VARCHAR(255) NULL;

DROP TRIGGER IF EXISTS users_before_insert_legacy_defaults;

-- migrate:statement-start
CREATE TRIGGER users_before_insert_legacy_defaults
BEFORE INSERT ON users
FOR EACH ROW
BEGIN
  IF NEW.display_name IS NULL OR NEW.display_name = '' THEN
    SET NEW.display_name = NEW.username;
  END IF;

  IF NEW.age_group IS NULL THEN
    SET NEW.age_group = CASE
      WHEN NEW.age BETWEEN 1 AND 12 THEN 'child'
      WHEN NEW.age BETWEEN 13 AND 17 THEN 'teen'
      WHEN NEW.age BETWEEN 18 AND 24 THEN 'young_adult'
      WHEN NEW.age BETWEEN 25 AND 120 THEN 'adult'
      ELSE NULL
    END;
  END IF;

  IF NEW.role IS NULL THEN
    SET NEW.role = 'user';
  END IF;

  IF NEW.account_status IS NULL THEN
    SET NEW.account_status = 'active';
  END IF;
END
-- migrate:statement-end

CREATE TABLE IF NOT EXISTS sessions (
  sid VARCHAR(128) NOT NULL PRIMARY KEY,
  expires DATETIME NOT NULL,
  data JSON NOT NULL,
  INDEX idx_sessions_expires (expires)
);

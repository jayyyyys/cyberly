ALTER TABLE users
  ADD COLUMN display_name VARCHAR(100) NULL AFTER email;

ALTER TABLE users
  ADD COLUMN password_hash VARCHAR(255) NULL AFTER password;

ALTER TABLE users
  ADD COLUMN age_group ENUM('child','teen','young_adult','adult') NULL AFTER age;

ALTER TABLE users
  ADD COLUMN account_status ENUM('active','disabled') NOT NULL DEFAULT 'active' AFTER role;

UPDATE users
SET display_name = username
WHERE display_name IS NULL OR display_name = '';

UPDATE users
SET password_hash = password
WHERE password_hash IS NULL OR password_hash = '';

UPDATE users
SET age_group = CASE
  WHEN age BETWEEN 1 AND 12 THEN 'child'
  WHEN age BETWEEN 13 AND 17 THEN 'teen'
  WHEN age BETWEEN 18 AND 24 THEN 'young_adult'
  WHEN age BETWEEN 25 AND 120 THEN 'adult'
  ELSE age_group
END
WHERE age_group IS NULL;

ALTER TABLE users
  MODIFY COLUMN age TINYINT UNSIGNED NOT NULL;

ALTER TABLE users
  MODIFY COLUMN display_name VARCHAR(100) NOT NULL;

ALTER TABLE users
  MODIFY COLUMN password_hash VARCHAR(255) NOT NULL;

ALTER TABLE users
  MODIFY COLUMN age_group ENUM('child','teen','young_adult','adult') NOT NULL;

ALTER TABLE users
  MODIFY COLUMN role ENUM('user','admin') NOT NULL DEFAULT 'user';

ALTER TABLE users
  MODIFY COLUMN account_status ENUM('active','disabled') NOT NULL DEFAULT 'active';

ALTER TABLE users
  ADD CONSTRAINT chk_users_age_range CHECK (age BETWEEN 1 AND 120);

CREATE TABLE IF NOT EXISTS resource_articles (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(140) NOT NULL UNIQUE,
  category_code VARCHAR(80) NOT NULL,
  source_url VARCHAR(500) NULL,
  display_order INT UNSIGNED NOT NULL,
  status ENUM('draft','published','archived') NOT NULL DEFAULT 'published',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_resource_articles_status_order (status, display_order)
);

CREATE TABLE IF NOT EXISTS resource_article_translations (
  resource_id INT UNSIGNED NOT NULL,
  locale VARCHAR(10) NOT NULL,
  title VARCHAR(180) NOT NULL,
  summary VARCHAR(500) NOT NULL,
  content_json JSON NOT NULL,
  source_label VARCHAR(180) NULL,
  PRIMARY KEY (resource_id, locale),
  CONSTRAINT fk_resource_article_translations_article
    FOREIGN KEY (resource_id) REFERENCES resource_articles(id)
    ON DELETE CASCADE
);

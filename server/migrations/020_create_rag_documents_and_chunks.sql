CREATE TABLE IF NOT EXISTS rag_documents (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  content_type VARCHAR(40) NOT NULL,
  content_code VARCHAR(80) NULL,
  resource_id INT UNSIGNED NULL,
  scenario_id INT UNSIGNED NULL,
  locale VARCHAR(10) NOT NULL,
  title VARCHAR(255) NOT NULL,
  summary TEXT NULL,
  topic_code VARCHAR(80) NULL,
  category_code VARCHAR(80) NULL,
  source_label VARCHAR(255) NULL,
  source_organisation VARCHAR(255) NULL,
  source_url TEXT NULL,
  internal_target_json JSON NULL,
  status ENUM('draft','reviewed','published','archived') NOT NULL DEFAULT 'draft',
  review_status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  rag_ready TINYINT(1) NOT NULL DEFAULT 0,
  source_updated_at TIMESTAMP NULL,
  last_reviewed_at TIMESTAMP NULL,
  next_review_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_rag_documents_resource_locale_type (resource_id, locale, content_type),
  INDEX idx_rag_documents_content_type (content_type),
  INDEX idx_rag_documents_locale (locale),
  INDEX idx_rag_documents_category (category_code),
  INDEX idx_rag_documents_topic (topic_code),
  INDEX idx_rag_documents_retrievable (status, review_status, rag_ready),
  INDEX idx_rag_documents_resource (resource_id),
  INDEX idx_rag_documents_scenario (scenario_id),
  CONSTRAINT fk_rag_documents_resource
    FOREIGN KEY (resource_id) REFERENCES resource_articles(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_rag_documents_scenario
    FOREIGN KEY (scenario_id) REFERENCES scenario_definitions(id)
    ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS rag_chunks (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  document_id INT UNSIGNED NOT NULL,
  chunk_index INT UNSIGNED NOT NULL,
  heading VARCHAR(255) NULL,
  chunk_text TEXT NOT NULL,
  token_estimate INT UNSIGNED NULL,
  metadata_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_rag_chunks_document_index (document_id, chunk_index),
  INDEX idx_rag_chunks_document (document_id),
  FULLTEXT KEY ft_rag_chunks_heading_text (heading, chunk_text),
  CONSTRAINT fk_rag_chunks_document
    FOREIGN KEY (document_id) REFERENCES rag_documents(id)
    ON DELETE CASCADE
);

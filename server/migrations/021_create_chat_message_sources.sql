CREATE TABLE IF NOT EXISTS chat_message_sources (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  conversation_id INT UNSIGNED NOT NULL,
  message_id INT UNSIGNED NOT NULL,
  document_id INT UNSIGNED NULL,
  chunk_id INT UNSIGNED NULL,
  citation_order INT UNSIGNED NOT NULL DEFAULT 0,
  source_title VARCHAR(255) NOT NULL,
  source_label VARCHAR(255) NULL,
  source_organisation VARCHAR(255) NULL,
  source_url TEXT NULL,
  source_locale VARCHAR(10) NULL,
  snippet TEXT NULL,
  internal_target_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_chat_message_sources_message (message_id),
  INDEX idx_chat_message_sources_conversation (conversation_id),
  INDEX idx_chat_message_sources_document (document_id),
  INDEX idx_chat_message_sources_chunk (chunk_id),
  INDEX idx_chat_message_sources_order (citation_order),
  CONSTRAINT fk_chat_message_sources_conversation
    FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_chat_message_sources_message
    FOREIGN KEY (message_id) REFERENCES chat_messages(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_chat_message_sources_document
    FOREIGN KEY (document_id) REFERENCES rag_documents(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_chat_message_sources_chunk
    FOREIGN KEY (chunk_id) REFERENCES rag_chunks(id)
    ON DELETE SET NULL
);

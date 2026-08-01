ALTER TABLE chat_messages
  ADD COLUMN reply_to_message_id INT UNSIGNED NULL AFTER content,
  ADD INDEX idx_chat_messages_reply_to (reply_to_message_id),
  ADD UNIQUE INDEX uniq_chat_messages_reply_role (reply_to_message_id, role),
  ADD CONSTRAINT fk_chat_messages_reply_to
    FOREIGN KEY (reply_to_message_id) REFERENCES chat_messages(id)
    ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS chat_message_generations (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  conversation_id INT UNSIGNED NOT NULL,
  user_message_id INT UNSIGNED NOT NULL,
  assistant_message_id INT UNSIGNED NULL,
  status ENUM('pending', 'in_progress', 'completed', 'failed') NOT NULL DEFAULT 'pending',
  provider VARCHAR(32) NOT NULL,
  model VARCHAR(80) NOT NULL,
  provider_request_id VARCHAR(128) NULL,
  error_code VARCHAR(80) NULL,
  input_tokens INT UNSIGNED NULL,
  output_tokens INT UNSIGNED NULL,
  estimated_cost_usd DECIMAL(12, 8) NULL,
  duration_ms INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL DEFAULT NULL,
  UNIQUE KEY uniq_chat_generations_user_message (user_message_id),
  UNIQUE KEY uniq_chat_generations_assistant_message (assistant_message_id),
  INDEX idx_chat_generations_conversation_status (conversation_id, status),
  INDEX idx_chat_generations_created_at (created_at),
  CONSTRAINT fk_chat_generations_conversation
    FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_chat_generations_user_message
    FOREIGN KEY (user_message_id) REFERENCES chat_messages(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_chat_generations_assistant_message
    FOREIGN KEY (assistant_message_id) REFERENCES chat_messages(id)
    ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS chat_message_actions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  conversation_id INT UNSIGNED NOT NULL,
  message_id INT UNSIGNED NOT NULL,
  action_type VARCHAR(40) NOT NULL,
  label_key VARCHAR(120) NOT NULL,
  title VARCHAR(255) NULL,
  description TEXT NULL,
  target_json JSON NOT NULL,
  display_order INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_chat_message_actions_message (message_id),
  INDEX idx_chat_message_actions_conversation (conversation_id),
  INDEX idx_chat_message_actions_type (action_type),
  INDEX idx_chat_message_actions_display (display_order),
  CONSTRAINT chk_chat_message_actions_type CHECK (
    action_type IN ('resource', 'scenario', 'progress', 'assessment', 'resources', 'scenarios')
  ),
  CONSTRAINT fk_chat_message_actions_conversation
    FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_chat_message_actions_message
    FOREIGN KEY (message_id) REFERENCES chat_messages(id)
    ON DELETE CASCADE
);

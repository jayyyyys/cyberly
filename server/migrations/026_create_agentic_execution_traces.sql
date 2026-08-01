CREATE TABLE IF NOT EXISTS agentic_execution_traces (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  trace_id VARCHAR(80) NOT NULL,
  request_id VARCHAR(120) NOT NULL,
  conversation_id INT UNSIGNED NULL,
  message_id INT UNSIGNED NULL,
  learner_id INT UNSIGNED NULL,
  safe_status VARCHAR(40) NOT NULL DEFAULT 'started',
  trace_json JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL DEFAULT NULL,
  UNIQUE KEY uniq_agentic_traces_trace_id (trace_id),
  INDEX idx_agentic_traces_request (request_id),
  INDEX idx_agentic_traces_conversation (conversation_id),
  INDEX idx_agentic_traces_message (message_id),
  INDEX idx_agentic_traces_learner (learner_id),
  INDEX idx_agentic_traces_status_created (safe_status, created_at),
  CONSTRAINT fk_agentic_traces_conversation
    FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_agentic_traces_message
    FOREIGN KEY (message_id) REFERENCES chat_messages(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_agentic_traces_learner
    FOREIGN KEY (learner_id) REFERENCES users(id)
    ON DELETE SET NULL
);

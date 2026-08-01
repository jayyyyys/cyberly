ALTER TABLE chat_messages
  ADD COLUMN locale VARCHAR(10) NULL AFTER content;

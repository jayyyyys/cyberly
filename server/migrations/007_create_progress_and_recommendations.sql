CREATE TABLE IF NOT EXISTS learner_topic_progress (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  topic_code ENUM(
    'phishing_and_scams',
    'password_and_account_security',
    'privacy_and_personal_information',
    'misinformation_and_deepfakes'
  ) NOT NULL,
  current_level ENUM('beginner', 'developing', 'intermediate', 'advanced') NOT NULL,
  mastery_percentage INT UNSIGNED NOT NULL,
  source_type ENUM('initial_assessment', 'learning_activity', 'scenario', 'admin_adjustment') NOT NULL,
  source_reference_id INT UNSIGNED NULL,
  activity_count INT UNSIGNED NOT NULL DEFAULT 0,
  last_activity_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_learner_topic_progress_user_topic (user_id, topic_code),
  INDEX idx_learner_topic_progress_user_level (user_id, current_level),
  CONSTRAINT chk_learner_topic_progress_mastery CHECK (mastery_percentage BETWEEN 0 AND 100),
  CONSTRAINT fk_learner_topic_progress_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS learner_progress_summary (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  overall_mastery_percentage INT UNSIGNED NOT NULL DEFAULT 0,
  measured_level ENUM('beginner', 'developing', 'intermediate', 'advanced') NOT NULL DEFAULT 'beginner',
  completed_topic_count INT UNSIGNED NOT NULL DEFAULT 0,
  total_activity_count INT UNSIGNED NOT NULL DEFAULT 0,
  last_progress_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_learner_progress_summary_user (user_id),
  CONSTRAINT chk_learner_progress_summary_mastery CHECK (overall_mastery_percentage BETWEEN 0 AND 100),
  CONSTRAINT fk_learner_progress_summary_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS learner_recommendations (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  recommendation_type ENUM('next_topic', 'review_topic', 'continue_topic') NOT NULL,
  topic_code ENUM(
    'phishing_and_scams',
    'password_and_account_security',
    'privacy_and_personal_information',
    'misinformation_and_deepfakes'
  ) NULL,
  recommended_level ENUM('beginner', 'developing', 'intermediate', 'advanced') NULL,
  reason_code ENUM(
    'lowest_topic_score',
    'weak_topic',
    'developing_topic',
    'continue_progress',
    'high_mastery_challenge',
    'assessment_pending'
  ) NOT NULL,
  reason_text VARCHAR(255) NOT NULL,
  source_type ENUM('initial_assessment', 'learning_activity', 'scenario', 'admin_adjustment', 'assessment_pending') NOT NULL,
  source_reference_id INT UNSIGNED NULL,
  status ENUM('active', 'viewed', 'completed', 'superseded') NOT NULL DEFAULT 'active',
  generated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  viewed_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_learner_recommendations_user_status (user_id, status),
  INDEX idx_learner_recommendations_user_generated (user_id, generated_at),
  CONSTRAINT fk_learner_recommendations_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS learner_profiles (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  ai_nickname VARCHAR(50) NULL,
  education_level ENUM('form_1', 'form_2', 'form_3', 'form_4', 'form_5', 'other', 'prefer_not_to_say') NULL,
  preferred_language ENUM('english', 'bahasa_melayu', 'chinese', 'mixed') NULL,
  familiarity_level ENUM('beginner', 'intermediate', 'advanced') NULL,
  help_topics JSON NULL,
  learning_style ENUM('step_by_step', 'short_explanations', 'quizzes_and_challenges') NULL,
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  onboarding_completed_at TIMESTAMP NULL,
  profile_last_confirmed_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_learner_profiles_user_id (user_id),
  INDEX idx_learner_profiles_onboarding_completed (onboarding_completed),
  CONSTRAINT fk_learner_profiles_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);

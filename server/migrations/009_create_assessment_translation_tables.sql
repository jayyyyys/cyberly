CREATE TABLE IF NOT EXISTS assessment_definition_translations (
  assessment_id INT UNSIGNED NOT NULL,
  locale VARCHAR(10) NOT NULL,
  title VARCHAR(180) NOT NULL,
  description TEXT NULL,
  PRIMARY KEY (assessment_id, locale),
  CONSTRAINT fk_assessment_definition_translations_definition
    FOREIGN KEY (assessment_id) REFERENCES assessment_definitions(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS assessment_question_translations (
  question_id INT UNSIGNED NOT NULL,
  locale VARCHAR(10) NOT NULL,
  prompt TEXT NOT NULL,
  explanation TEXT NOT NULL,
  PRIMARY KEY (question_id, locale),
  CONSTRAINT fk_assessment_question_translations_question
    FOREIGN KEY (question_id) REFERENCES assessment_questions(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS assessment_option_translations (
  question_id INT UNSIGNED NOT NULL,
  option_key VARCHAR(10) NOT NULL,
  locale VARCHAR(10) NOT NULL,
  text TEXT NOT NULL,
  PRIMARY KEY (question_id, option_key, locale),
  CONSTRAINT fk_assessment_option_translations_question
    FOREIGN KEY (question_id) REFERENCES assessment_questions(id)
    ON DELETE CASCADE
);

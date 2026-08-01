CREATE TABLE IF NOT EXISTS scenario_definition_translations (
  scenario_id INT UNSIGNED NOT NULL,
  locale VARCHAR(10) NOT NULL,
  title VARCHAR(160) NOT NULL,
  summary VARCHAR(500) NOT NULL,
  PRIMARY KEY (scenario_id, locale),
  CONSTRAINT fk_scenario_definition_translations_definition
    FOREIGN KEY (scenario_id) REFERENCES scenario_definitions(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS scenario_step_translations (
  step_id INT UNSIGNED NOT NULL,
  locale VARCHAR(10) NOT NULL,
  situation_text TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  PRIMARY KEY (step_id, locale),
  CONSTRAINT fk_scenario_step_translations_step
    FOREIGN KEY (step_id) REFERENCES scenario_steps(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS scenario_option_translations (
  step_id INT UNSIGNED NOT NULL,
  option_key VARCHAR(10) NOT NULL,
  locale VARCHAR(10) NOT NULL,
  text TEXT NOT NULL,
  feedback TEXT NOT NULL,
  safety_explanation TEXT NOT NULL,
  PRIMARY KEY (step_id, option_key, locale),
  CONSTRAINT fk_scenario_option_translations_step
    FOREIGN KEY (step_id) REFERENCES scenario_steps(id)
    ON DELETE CASCADE
);

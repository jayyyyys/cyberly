INSERT IGNORE INTO scenario_definition_translations (scenario_id, locale, title, summary)
SELECT id, 'en', title, summary
FROM scenario_definitions;

INSERT IGNORE INTO scenario_step_translations (step_id, locale, situation_text, prompt_text)
SELECT id, 'en', situation_text, prompt_text
FROM scenario_steps;

INSERT IGNORE INTO scenario_option_translations (step_id, option_key, locale, text, feedback, safety_explanation)
SELECT
  ss.id,
  option_item.option_key,
  'en',
  option_item.option_text,
  option_item.feedback,
  option_item.safety_explanation
FROM scenario_steps ss
JOIN JSON_TABLE(
  ss.options_json,
  '$[*]' COLUMNS (
    option_key VARCHAR(10) PATH '$.key',
    option_text TEXT PATH '$.text',
    feedback TEXT PATH '$.feedback',
    safety_explanation TEXT PATH '$.safetyExplanation'
  )
) AS option_item;

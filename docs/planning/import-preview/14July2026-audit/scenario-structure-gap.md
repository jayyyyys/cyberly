# Scenario Structure Gap

| Workbook field | Current live schema field | Available | Mapping | Gap | Import consequence |
| --- | --- | --- | --- | --- | --- |
| title_en/ms/zh | scenario_definitions.title + translations | Yes | direct title text | no step context | title only is insufficient |
| summary_en/ms/zh | scenario_definitions.summary + translations | Yes | direct summary text | no scenario step text | description only is insufficient |
| difficulty_level | scenario_definitions.difficulty | Yes | needs level mapping review | values use L1-style levels | manual mapping required |
| estimated_minutes | scenario_definitions.estimated_minutes | Yes | direct duration | none | usable metadata |
| scenario steps | scenario_steps.situation_text/prompt_text | No | none | absent from workbook row | cannot create live Scenario |
| options | scenario_steps.options_json | No | none | absent from workbook row | cannot create live Scenario |
| feedback/scoring | scenario options feedback/scoring | No | none | absent from workbook row | cannot create live Scenario |

Scenario rows audited: 7. All are content briefs until step and option structures are authored.

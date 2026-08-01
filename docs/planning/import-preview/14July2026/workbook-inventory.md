# Workbook Inventory

Workbook: `Cyberly_AI_Preparation_Workbook_14July2026.xlsx`
SHA-256: `5F9E610C91FBC8CC9C5A3F33ECAD1E9483A6AB60CB41C026444B407C52DF758B`

## Sheets
- `01_Learner_Level_Policy` (visible): 1000 rows x 8 columns; non-empty rows 41.
  - Blank rows after data begins: 959
- `02_Content_Inventory` (visible): 1059 rows x 26 columns; non-empty rows 68.
  - Header row 4: content_code, content_type, topic_code, slug, title_en, title_ms, title_zh, summary_en, summary_ms, summary_zh, difficulty_level, estimated_minutes, source_organisation, source_url, review_status, rag_ready, last_reviewed_at, reviewed_by, notes
  - Header row 71: content_code, Keep even with MySQL auto IDs. Stable codes survive across dev/test/prod environments., 1. Scams
  - Blank rows after data begins: 991
- `Cyberly_Content_Category_Plan` (visible): 1000 rows x 26 columns; non-empty rows 56.
  - Blank rows after data begins: 944
- `03_Content_Relationships` (visible): 999 rows x 26 columns; non-empty rows 78.
  - Header row 4: relationship_id, source_content_code, target_content_code, relationship_type, topic_code, priority, sequence_order, reason_en, reason_zh, is_active, notes
  - Blank rows after data begins: 921
- `04_AI_Safety_Test_Set` (visible): 1003 rows x 15 columns; non-empty rows 18.
  - Blank rows after data begins: 985
- `05_MY_Response_Guidance` (visible): 1001 rows x 20 columns; non-empty rows 14.
  - Blank rows after data begins: 987
- `06_AI_Quality_Rubric` (visible): 1000 rows x 17 columns; non-empty rows 25.
  - Blank rows after data begins: 975
- `07_Agent_Tool_Catalogue` (visible): 1000 rows x 10 columns; non-empty rows 37.
  - Blank rows after data begins: 963

## Import Scope
Imported into dry-run manifest: `02_Content_Inventory`, `Cyberly_Content_Category_Plan`, `03_Content_Relationships`.

Ignored for import in this phase:
- `01_Learner_Level_Policy`
- `04_AI_Safety_Test_Set`
- `05_MY_Response_Guidance`
- `06_AI_Quality_Rubric`
- `07_Agent_Tool_Catalogue`

## Structural Warnings
- No blocking workbook structural warnings were detected.

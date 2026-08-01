# Schema Inventory

Status: Current Implementation Inventory; Repository-Derived; No Live Database Verification; Snapshot Date: 2026-07-27; Subject to revision if local/database schema differs from migration reconstruction.

This document reconstructs the expected schema from migrations `001` through `026`. It does not inspect a live database.

## Migration Summary

| Migration | Main effect |
|---|---|
| `001_create_schema_migrations.sql` | Creates `schema_migrations` and initial `users` with legacy `username`, `password`, `age`, and role fields. |
| `002_align_users_table.sql` | Adds `display_name`, `password_hash`, `age_group`, `account_status`, backfills from legacy columns, and adds age check. |
| `003_preserve_legacy_users_compatibility.sql` | Adds compatibility triggers for legacy insert defaults and age-group updates. |
| `004_harden_users_and_create_sessions.sql` | Makes `username` and `password` nullable, updates legacy insert trigger, and creates `sessions`. |
| `005_create_learner_profiles.sql` | Creates `learner_profiles`. |
| `006_create_initial_assessment_system.sql` | Creates assessment definitions, questions, attempts, answers, topic scores, and seeds the initial assessment. |
| `007_create_progress_and_recommendations.sql` | Creates topic progress, progress summary, and learner recommendations. |
| `008_create_scenario_engine.sql` | Creates scenario definitions, steps, attempts, decisions, scenario progress events, and seeds scenarios. |
| `009_create_assessment_translation_tables.sql` | Creates assessment translation tables. |
| `010_seed_assessment_ms_zhCN_translations.sql` | Seeds Malay and Chinese assessment translations. |
| `011_create_scenario_translation_tables.sql` | Creates scenario translation tables. |
| `012_seed_scenario_ms_zhCN_translations.sql` | Seeds Malay and Chinese scenario translations. |
| `013_create_resource_content_tables.sql` | Creates Resource articles and translations. |
| `014_seed_resource_content.sql` | Seeds Resource content. |
| `015_seed_resource_ms_zhCN_translations.sql` | Seeds Resource translations. |
| `016_create_chat_backend_foundation.sql` | Creates chat conversations and messages. |
| `017_add_chat_generation_tracking.sql` | Adds reply tracking and generation tracking. |
| `018_add_chat_message_locale.sql` | Adds message locale. |
| `019_create_chat_message_actions.sql` | Creates persisted chat action cards. |
| `020_create_rag_documents_and_chunks.sql` | Creates RAG documents and chunks with FULLTEXT support. |
| `021_create_chat_message_sources.sql` | Creates persisted chat source snapshots. |
| `022_add_resource_review_metadata.sql` | Adds Resource review, RAG-ready, source, and governance metadata. |
| `023_add_resource_translation_timestamps.sql` | Adds Resource translation timestamps. |
| `024_add_scenario_publication_history.sql` | Adds `first_published_at` to scenario definitions. |
| `025_backfill_scenario_english_translations.sql` | Backfills English scenario translations. |
| `026_create_agentic_execution_traces.sql` | Creates agentic execution traces. |

## Reconstructed Tables

| Table | Purpose | Created | Modified by | PK | Important FKs | Important constraints/indexes | Triggers | Domain | Classification |
|---|---|---|---|---|---|---|---|---|---|
| `schema_migrations` | Migration ledger | 001 | none verified | `migration_id` | none | unique `filename` | none | Infrastructure | infrastructure |
| `users` | Account identity plus current learner-age compatibility fields | 001 | 002, 003, 004 | `id` | referenced by many learner/domain tables | unique `username`, unique `email`, age check | `users_before_insert_legacy_defaults`, `users_before_update_age_group` | Identity / Learner conflict | authoritative |
| `sessions` | Express session persistence | 004 | none verified | `sid` | none | index `expires` | none | Infrastructure | infrastructure |
| `learner_profiles` | Onboarding and learner preference profile | 005 | none verified | `id` | `user_id -> users.id` cascade | unique `user_id`, onboarding index | none | Learner | authoritative |
| `assessment_definitions` | Assessment content definition | 006 | none verified | `id` | none | unique `slug, version`, type/status index | none | Content / Learning | authoritative |
| `assessment_questions` | Assessment question content | 006 | none verified | `id` | `assessment_id -> assessment_definitions.id` restrict | unique assessment/order, topic index | none | Content | authoritative |
| `assessment_attempts` | Learner assessment attempts | 006 | none verified | `id` | `user_id -> users.id` cascade; `assessment_id -> assessment_definitions.id` restrict | user/status and assessment indexes | none | Learning | authoritative |
| `assessment_answers` | Learner assessment selected answers | 006 | none verified | `id` | attempt cascade; question restrict | unique attempt/question | none | Learning | authoritative |
| `assessment_topic_scores` | Per-topic assessment result facts | 006 | none verified | `id` | attempt cascade | unique attempt/topic | none | Learning | authoritative |
| `assessment_definition_translations` | Assessment translation content | 009 | none verified | composite `assessment_id, locale` | assessment cascade | primary key | none | Content | authoritative |
| `assessment_question_translations` | Assessment question translations | 009 | none verified | composite `question_id, locale` | question cascade | primary key | none | Content | authoritative |
| `assessment_option_translations` | Assessment option translations | 009 | none verified | composite `question_id, locale, option_key` | question cascade | primary key | none | Content | authoritative |
| `learner_topic_progress` | Current per-topic progress snapshot | 007 | none verified | `id` | `user_id -> users.id` cascade | unique user/topic, mastery check | none | Learning | snapshot |
| `learner_progress_summary` | Current aggregate progress snapshot | 007 | none verified | `id` | `user_id -> users.id` cascade | unique user, mastery check | none | Learning | snapshot |
| `learner_recommendations` | Historical recommendation decisions and current status | 007 | none verified | `id` | `user_id -> users.id` cascade | user/status and generated indexes | none | Learning | authoritative |
| `scenario_definitions` | Scenario content definition | 008 | 024 | `id` | none | unique `slug, version`, topic/difficulty/status index, total steps check | none | Content | authoritative |
| `scenario_steps` | Scenario step content | 008 | none verified | `id` | `scenario_id -> scenario_definitions.id` cascade | unique scenario/order, step order check | none | Content | authoritative |
| `scenario_attempts` | Learner scenario attempts | 008 | none verified | `id` | user cascade; scenario restrict | user/status and scenario indexes | none | Learning | authoritative |
| `scenario_decisions` | Learner scenario choices | 008 | none verified | `id` | attempt cascade; step restrict | unique attempt/step | none | Learning | authoritative |
| `scenario_progress_events` | Idempotency event for applying scenario progress | 008 | none verified | `id` | user cascade; attempt cascade | unique `scenario_attempt_id`, user/topic index | none | Learning | audit |
| `scenario_definition_translations` | Scenario definition translations | 011 | 025 backfill | composite `scenario_id, locale` | scenario cascade | primary key | none | Content | authoritative |
| `scenario_step_translations` | Scenario step translations | 011 | 025 backfill | composite `step_id, locale` | step cascade | primary key | none | Content | authoritative |
| `scenario_option_translations` | Scenario option translations | 011 | 025 backfill | composite `step_id, locale, option_key` | step cascade | primary key | none | Content | authoritative |
| `resource_articles` | Resource metadata and governance state | 013 | 022 | `id` | none verified in table | unique `slug`, status/order index | none | Content / Administration | authoritative |
| `resource_article_translations` | Resource localized content | 013 | 023 | composite `resource_id, locale` | resource cascade | primary key | none | Content | authoritative |
| `chat_conversations` | Learner chat conversations | 016 | none verified | `id` | user cascade | user/order index | none | AI | authoritative |
| `chat_messages` | Chat messages | 016 | 017, 018 | `id` | conversation cascade; reply-to message set null | conversation/order, reply index, unique reply/role | none | AI | authoritative |
| `chat_message_generations` | AI generation attempts/status | 017 | none verified | `id` | conversation cascade; user message cascade; assistant message set null | unique user message, unique assistant message | none | AI | audit |
| `chat_message_actions` | Persisted deterministic action cards | 019 | none verified | `id` | conversation/message cascade | type/display indexes, type check | none | AI / Learning | snapshot |
| `rag_documents` | Derived RAG document metadata | 020 | none verified | `id` | resource set null; scenario set null | unique resource/locale/type, retrievable indexes | none | AI / Content | derived |
| `rag_chunks` | Derived RAG chunk text | 020 | none verified | `id` | document cascade | unique document/index, FULLTEXT heading/text | none | AI / Content | derived |
| `chat_message_sources` | Persisted source/citation snapshots | 021 | none verified | `id` | conversation/message cascade; document/chunk set null | source indexes, citation order index | none | AI | snapshot |
| `agentic_execution_traces` | Sanitized agentic execution traces | 026 | none verified | `id` | conversation/message/learner set null | unique `trace_id`, request/conversation/message/learner/status indexes | none | Agentic | audit |

## Explicit Identity Notes

- `users.username` exists in the migration-reconstructed schema from migration `001`; it is made nullable in migration `004`; unique index `uq_users_username` remains in migration history.
- `users.password` exists in the migration-reconstructed schema from migration `001`; it is made nullable in migration `004`.
- `users.password_hash` is the active password hash column added in migration `002`.
- `users.age` and `users.age_group` remain active runtime fields.
- `learner_profiles` currently has no verified `birth_year`, age-band, or equivalent target age field.


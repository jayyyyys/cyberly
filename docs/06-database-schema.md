# Database Schema

## Current Database

- Standard database name: `cyberly`
- Database engine: MySQL
- Local target: MySQL 8.0
- Managed deployment target: managed MySQL, including Aiven for MySQL when configured through environment variables
- ORM: none

No real credentials are documented in this repository.

The older local `cyberwell` database name is deprecated and should not be used.

## Migration Approach

Schema changes are managed through versioned SQL files in `server/migrations/` and the Node runner at `server/scripts/migrate.js`.

Applied migrations are recorded in `schema_migrations`:

- `migration_id`
- `filename`
- `applied_at`

Rollback is not implemented. Production database changes require a verified backup and restore plan before migrations are applied.

## Core Tables

Current schema areas include:

- `users`
- `sessions`
- `learner_profiles`
- assessment definitions, questions, attempts, answers, topic scores, and translations
- learner topic progress, learner progress summary, and learner recommendations
- scenario definitions, steps, attempts, decisions, progress events, publication metadata, and translations
- resource articles, translations, timestamps, and review/RAG metadata
- chat conversations, messages, generations, action cards, and persisted sources
- RAG documents and chunks
- Agentic execution traces

## Users Table

Current account columns include:

- `id`
- `email`
- `display_name`
- `age`
- `age_group`
- `password_hash`
- `role`
- `account_status`
- `created_at`
- `updated_at`

Temporary legacy compatibility columns remain:

- `username`
- `password`

Current `/api/auth/*` routes use email/password authentication and bcrypt hashes. Legacy `/api/register` and `/api/login` have been removed, so `username` and `password` remain only as temporary schema compatibility columns until the Phase 1C.2 migration cleanup.

Compatibility triggers also remain for user defaults and age-group updates. They should be reviewed with the legacy column cleanup.

## Sessions

The `sessions` table stores server-side session data for `express-session`:

- `sid`
- `expires`
- `data`

The application session payload stores only `userId` and `role`.

## Learner Profiles

`learner_profiles` stores one profile per user and uses `ON DELETE CASCADE`.

It stores learner preferences and onboarding state such as AI nickname, education level, preferred language, familiarity level, help topics, learning style, onboarding completion, and profile confirmation timestamps.

It does not store passwords, chat history, assessment answers, or inferred ability scores.

## Assessment

Assessment tables store fixed versioned assessment content, attempts, selected answers, and topic scores.

Assessment scoring is deterministic and backend-calculated. Correct answers and explanations are not exposed before submission.

## Progress and Recommendations

Progress tables store:

- topic progress per user/topic;
- one overall progress summary per user;
- learner recommendation history.

Supported progress source types in migration `007_create_progress_and_recommendations.sql` include:

- `initial_assessment`
- `learning_activity`
- `scenario`
- `admin_adjustment`

Recommendation source types also include `assessment_pending`.

The current implementation writes initial-assessment progress and scenario progress. Scenario completion applies progress idempotently through `scenario_progress_events`, and recommendation refresh logic can use scenario completion state.

Resource completion tracking is not implemented.

## Scenario Engine

Scenario tables store definitions, steps, attempts, final decisions, and progress events.

`scenario_progress_events.scenario_attempt_id` is unique so scenario completion can apply progress at most once per attempt.

Scenario attempts and progress events cascade when a user is deleted. Scenario definitions are protected from deletion when historical learner attempts depend on them.

## Resources and RAG

Resource content is stored in:

- `resource_articles`
- `resource_article_translations`

Resource review/RAG governance metadata includes fields such as review status, RAG readiness, source metadata, Malaysia guidance flag, sensitive topic flag, source replacement flag, and review notes.

RAG tables are:

- `rag_documents`
- `rag_chunks`

Chat source snapshots are stored in `chat_message_sources` so historical citations can remain available even if source content changes later.

## Roles and Admin

Current roles are:

- `user`
- `admin`

Public registration creates `user` accounts only. Admin access is checked server-side by Admin middleware and user role.

## Legacy Cleanup Schedule

The following schema cleanup must wait for a later phase:

- keep legacy `/api/register` and `/api/login` removed;
- verify no runtime source depends on `users.username`;
- verify no runtime source depends on `users.password`;
- add a tested migration to remove legacy compatibility columns, indexes, and trigger behavior if still appropriate.

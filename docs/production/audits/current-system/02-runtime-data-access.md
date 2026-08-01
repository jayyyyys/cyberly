# Runtime Data Access

Status: Current Implementation Inventory; Repository-Derived; No Live Database Verification; Snapshot Date: 2026-07-27; Subject to revision if local/database schema differs from migration reconstruction.

This document summarizes major current runtime reads and writes. It avoids raw SQL blocks and does not claim live database verification.

## Authentication

- Routes: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout` in `server/server.js`.
- Primary files: `server/server.js`, `server/src/auth/validation.js`, `server/src/auth/requireAuth.js`, `server/src/database/age-group.js`.
- Reads: `users`, `learner_profiles` through profile service.
- Writes: `users` during registration; session data through Express session store.
- Runtime identity evidence: registration inserts `email`, `display_name`, `age`, `age_group`, `password_hash`, `role`, and `account_status`; login selects `password_hash`.
- Ownership enforcement: session user id is assigned server-side after successful registration/login.
- Legacy route note: compatibility `/api/register` and `/api/login` are not mounted in the current runtime source inspected here.

## Learner Profile and Account

- Routes: `/api/profile`, `/api/account`.
- Primary files: `server/src/profile/*`, `server/src/account/*`.
- Reads: `learner_profiles`, `users`.
- Writes: `learner_profiles` for onboarding/preferences; `users.display_name`, `users.age`, and `users.age_group` through account update.
- Transaction behavior: profile upsert uses repository-level writes; account update reads current user then updates account fields.
- Known conflict: learner-specific age data is still stored and updated in `users`.

## Initial Assessment

- Routes: `/api/assessments/initial`, `/api/assessments/initial/attempts`, `/api/assessment-attempts/:attemptId`, answer update, submit, result, and status routes.
- Primary files: `server/src/assessment/assessment.routes.js`, `assessment.service.js`, `assessment.repository.js`.
- Reads: assessment definitions/questions/translations, attempts, answers, topic scores.
- Writes: `assessment_attempts`, `assessment_answers`, `assessment_topic_scores`.
- Transaction behavior: submit wraps scoring, answer scoring, topic-score replacement, attempt completion, and progress sync when a connection is supplied.
- Idempotency: answer upsert is keyed by attempt/question; assessment progress sync updates snapshots but does not have a dedicated complete event table equivalent to `scenario_progress_events`.

## Progress

- Routes: `/api/progress`, `/api/progress/sync-initial-assessment`.
- Primary files: `server/src/progress/progress.routes.js`, `progress.service.js`, `progress.repository.js`.
- Reads: assessment attempts/topic scores, progress snapshots, recommendations, scenario attempts for recommendation freshness.
- Writes: `learner_topic_progress`, `learner_progress_summary`, `learner_recommendations`, and `scenario_progress_events` when applying scenario completion.
- Transaction behavior: service functions use repository transactions for initial sync, recommendation refresh, completion handling, and scenario progress application.
- Idempotency: scenario-derived progress uses `scenario_progress_events` with unique `scenario_attempt_id`. Other progress updates do not have equivalent complete event coverage.

## Recommendations

- Routes: current recommendation, viewed, and completed endpoints under progress routes.
- Primary files: `server/src/progress/progress.service.js`, `progress.repository.js`, `scenario/scenarioRecommendation.js`.
- Reads: active recommendations, topic progress, latest assessment, scenario completion state.
- Writes: `learner_recommendations`; may supersede active recommendations and create fresh ones.
- Ownership enforcement: repository methods filter by authenticated `user_id`.
- Known behavior: recommendations are historical rows with status transitions rather than a single mutable setting.

## Scenarios

- Routes: `/api/scenarios`, `/api/scenarios/recommended`, `/api/scenarios/dashboard`, `/api/scenarios/:slug`, and scenario attempt routes.
- Primary files: `server/src/scenario/scenario.routes.js`, `scenario.service.js`, `scenario.repository.js`.
- Reads: scenario definitions/steps/translations, attempts, decisions, progress/recommendation data.
- Writes: `scenario_attempts`, `scenario_decisions`; completion also triggers progress service writes.
- Transaction behavior: start/resume, decision saving, and completion use transaction boundaries where writes are coordinated.
- Idempotency: completed attempts are not re-applied; scenario progress event uniqueness protects progress from duplicate application.

## Resources and Admin Content

- Learner routes: `/api/resources`, `/api/resources/:slug`.
- Admin routes: `/api/admin/resources/*` and lifecycle endpoints.
- Primary files: `server/src/resource/*`, `server/src/admin/admin.routes.js`, `admin.resourceContent.js`, `admin.resourceMetadata.js`.
- Reads: `resource_articles`, `resource_article_translations`, RAG/reference counts for lifecycle decisions.
- Writes: Resource admin create/update/lifecycle operations update `resource_articles` and translations in place.
- Ownership enforcement: learner Resource routes expose published content; Admin routes require server-side admin checks.
- Known versioning gap: Resource admin edits mutate current rows; there is no verified Resource version table.

## Scenario Admin

- Routes: `/api/admin/scenarios/*`.
- Primary files: `server/src/admin/admin.routes.js`, `admin.scenarioManagement.js`.
- Reads: scenario definitions, translations, attempts, RAG lifecycle counts.
- Writes: scenario definitions, steps, translations, and lifecycle fields in place.
- Known versioning gap: `scenario_definitions` has `slug, version`, but current Admin updates mutate existing rows rather than always creating new published versions.

## Chat and AI Generation

- Routes: `/api/chat/*` and `POST /api/chat/conversations/:conversationId/messages/:messageId/generate`.
- Primary files: `server/src/chat/*`, `server/src/ai/ai.routes.js`, `ai.service.js`, `ai.repository.js`.
- Reads: conversations, messages, generation status, learner context, RAG sources, action/source rows.
- Writes: `chat_conversations`, `chat_messages`, `chat_message_generations`, `chat_message_actions`, `chat_message_sources`.
- Transaction behavior: generation completion persists assistant message and generation status together; sources/actions are inserted after assistant persistence.
- Idempotency: `chat_message_generations` has unique user-message generation linkage.

## RAG

- Primary files: `server/src/rag/rag.service.js`, `rag.repository.js`, `rag.policy.js`, `server/scripts/rag-ingest.js`.
- Reads: published approved RAG-ready Resource content and translations; RAG document/chunk tables for retrieval.
- Writes: `rag_documents`, `rag_chunks` during ingestion/update.
- Replaceability: ingestion replaces chunks for a document before inserting current chunks.
- Retrieval filter: published, approved, `rag_ready = 1` content only.
- Classification: RAG tables are derived from Content and rebuildable from approved sources.

## Controlled Agentic AI

- Routes: `/api/agent/actions/proposals`, confirm, and cancel.
- Primary files: `server/src/agent/actions/actionProposal.routes.js`, `actionProposal.service.js`, `actionCatalogue.js`, `controlledAgentic.service.js`, `controlledToolExecutor.js`, `agent/audit/*`.
- Reads: trusted Resource/Scenario/recommendation state and sanitized learner context.
- Writes: proposal confirmation may update approved recommendation fields; trace service writes `agentic_execution_traces`.
- Proposal storage: current proposals are in-memory and short-lived.
- Token handling: confirmation token is retained in memory in plaintext for pending proposals and sent to the frontend for confirmation.
- Audit: `agentic_execution_traces` stores sanitized metadata, not raw prompts/secrets by design intent.


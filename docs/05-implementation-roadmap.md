# Implementation Roadmap

This roadmap reflects the current product state and the beginning of production cleanup.

## Completed Foundation

- Official frontend is `client/`.
- Official backend is `server/`.
- Legacy root React app has been removed.
- MySQL migration runner and `schema_migrations` tracking are implemented.
- Fresh database setup uses `cyberly`.
- Authentication uses email/password, bcrypt, server-side sessions, and safe user responses.
- Learner profiles are persisted through Profile APIs.
- Initial assessment is implemented with deterministic backend scoring.
- Progress, recommendations, learning-path progress, and scenario progress events are implemented.
- Scenario engine is implemented with attempts, decisions, results, progress sync, and Admin Scenario management.
- Resource APIs, Resource review metadata, Admin Resource workflows, and RAG synchronization paths are implemented.
- CyberGuard backend AI gateway, persistence, RAG sources, compact citation UI, action cards, and retry handling are implemented.
- Controlled Agentic AI and learner-controlled action proposals are implemented with confirmation boundaries.
- Admin Console, Admin protected APIs, AI provider diagnostics, and Agentic trace visibility exist.
- Render-oriented deployment documentation exists.

## Current Cleanup

- Remove legacy and academic-only repository areas.
- Reconcile older documentation with the current runtime.
- Keep `client/`, `server/`, migrations, AI/RAG/Agentic logic, Admin logic, and database schema stable during cleanup.
- Avoid production data changes until application references are verified.

## Production Hardening

- Legacy `/api/register` and `/api/login` have been removed; keep current authentication on `/api/auth/*`.
- Remove legacy `users.username` and `users.password` columns in Phase 1C.2 after migration smoke tests.
- Add migration rollback/backup guidance for production.
- Review npm audit findings and upgrade packages in a dedicated dependency-hardening phase.
- Replace in-memory-only rate limiting with production-ready rate limiting where needed.
- Decide how learner-controlled action proposals should work in multi-instance deployment.
- Define production logging policy for AI, Admin, and security events.

## Testing and Evaluation

- Expand automated frontend coverage around critical learner and Admin flows.
- Add production smoke tests for CORS, cookies, login/session restore, Admin access, database SSL, CyberGuard, RAG sources, and learner-controlled proposals.
- Run formal accessibility checks.
- Run formal security testing.
- Run AI safety, RAG grounding, multilingual, and performance evaluation.
- Validate mobile Safari cross-origin session behavior.

## October Public-Pilot Preparation

- Finalize production provider strategy for OpenAI, Gemini, and ILMU.
- Finalize Admin governance responsibilities and review process.
- Verify Malaysia-specific guidance sources before publishing authoritative reporting/contact guidance.
- Confirm backups, migration process, monitoring, and incident response.
- Prepare public-pilot onboarding, support, and feedback channels.

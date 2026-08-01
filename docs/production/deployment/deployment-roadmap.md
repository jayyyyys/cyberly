# Deployment Roadmap

This roadmap lists production hardening work that is planned or recommended. It does not describe already-complete infrastructure unless explicitly stated.

## Required Before Public Production Use

1. Confirm hosted frontend/backend origins.
2. Set `REACT_APP_API_BASE_URL` for the frontend.
3. Set `CLIENT_ORIGIN` for the backend.
4. Set a strong `SESSION_SECRET`.
5. Configure managed MySQL credentials and SSL/TLS settings.
6. Run `db:ensure` and `migrate` against the target database.
7. Verify login, session restore, logout, Admin role access, and CyberGuard chat on deployed URLs.
8. Confirm `GET /api/health` succeeds without exposing internal details.

## Recommended Hardening

- Add broader rate limiting for chat, AI generation, Agentic proposals, and Admin-sensitive endpoints.
- Define a production logging policy that avoids secrets, raw prompts, provider payloads, confirmation tokens, and private learner data.
- Decide whether short-lived learner action proposals can remain in memory for the first public pilot, or need durable audited storage.
- Add database backup and restore guidance before production migrations.
- Add deployment smoke tests for CORS, cookies, database SSL, Admin access, and RAG/citation behavior.
- Review provider availability and disable providers that are not production-ready.

## Future Architecture Options

- Serve frontend static assets from the Express backend for a single-origin deployment.
- Add background jobs or Admin-triggered job tracking for RAG ingestion.
- Add fine-grained Admin roles and audit logs.
- Add production monitoring and alerting.
- Add durable learner-controlled proposal storage or signed proposal tokens for multi-instance deployments.


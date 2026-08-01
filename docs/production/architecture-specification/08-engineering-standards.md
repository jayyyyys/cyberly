# 08. Engineering Standards

**Document status:** Proposed Target Architecture  
**Implementation status:** Not Fully Implemented  
**Review status:** Subject to Current-System Audit

## Repository Standards

- Official frontend: `client/`.
- Official backend: `server/`.
- Do not reintroduce the removed legacy root React application.
- Keep changes narrow and phase-scoped.
- Preserve uncommitted work unless explicitly instructed otherwise.

## Migration Standards

- Existing migrations must never be rewritten after application.
- All schema changes must use numbered forward migrations.
- Destructive schema changes must use phased forward migrations.
- Migration cleanup should follow application-reference removal and test verification.

## API Standards

- Do not change API response formats without a tested migration path.
- Current authentication uses `/api/auth/*`.
- Admin status uses `/api/admin/status`.
- Legacy compatibility routes should not be reintroduced.

## Frontend Standards

- Use the shared frontend API client and domain API wrappers.
- Do not hardcode backend URLs in UI code.
- Do not expose trusted backend action parameters.
- Do not calculate protected scoring or recommendation rules in the frontend.

## Backend Standards

- Keep validation, authorization, scoring, recommendation selection, RAG policy, and controlled execution on the backend.
- Never log secrets, prompt internals, confirmation tokens, provider keys, or raw private learner data.
- Use server-side session identity for user ownership checks.

## Testing Standards

Relevant changes should run the narrowest focused tests first, then wider suites. Typical checks include:

- auth tests;
- AI/RAG/Agentic tests when related;
- assessment/scenario/progress tests when learning state changes;
- locale verification;
- client tests and build;
- `git diff --check`.

## Documentation Standards

- Mark target architecture as planned unless verified.
- Do not claim planned tables or workflows exist before audit.
- Keep operational docs free of real credentials.
- Record durable architecture decisions in ADRs.

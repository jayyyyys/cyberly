# Known Issues

This list contains current unresolved issues only. Resolved early-phase items have been removed from this document.

## Maintainability

- `client/src/App.jsx` remains large and owns many page, routing, state, fetch, and layout responsibilities. This should be refactored gradually after production cleanup stabilizes.
- Frontend API base URL handling is duplicated between `client/src/App.jsx`, `client/src/chat/chatApi.js`, and `client/src/admin/adminApi.js`.

## Production Operations

- Migration rollback is not implemented. Production database changes require verified backup and restore procedures.
- Authentication rate limiting is in-memory and focused on auth endpoints. It is not distributed across instances and does not yet cover all public AI/action surfaces.
- Learner-controlled Agentic action proposals are short-lived and stored in memory, so pending proposals do not survive backend restart or multi-instance deployment.
- Cross-origin session behavior still needs manual validation on deployed browser combinations, especially mobile Safari.
- Current npm audit output reports high-severity vulnerabilities. This cleanup phase did not run `npm audit fix` or upgrade packages.

## Compatibility Debt

- Legacy compatibility endpoints `/api/register` and `/api/login` have been removed. Current authentication uses only `/api/auth/*`.
- Legacy `users.username` and `users.password` columns and related schema compatibility behavior remain temporarily. They should be removed only in Phase 1C.2 with a tested schema migration.

## Testing and Validation

- Formal accessibility validation is incomplete.
- Formal security testing is incomplete.
- Formal user acceptance testing for the public pilot is incomplete.
- Formal AI safety and refusal evaluation is incomplete.
- Formal RAG source-quality and citation-quality evaluation is incomplete.
- Formal multilingual QA for English, Malay, and Simplified Chinese is incomplete.
- Formal performance/load testing is incomplete.

## Product Gaps

- Resource completion tracking is not implemented.
- Some Admin governance workflows still need production hardening, including fine-grained roles, audit policy, and review/publish governance.
- Malaysia-specific guidance requires official reviewed sources and a governance process before it should be treated as authoritative emergency/reporting guidance.

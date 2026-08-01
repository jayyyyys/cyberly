# 06. Security and Privacy Architecture

**Document status:** Proposed Target Architecture  
**Implementation status:** Not Fully Implemented  
**Review status:** Subject to Current-System Audit

## Security Goals

Cyberly should protect teenage learners, account data, learning data, AI safety boundaries, admin governance decisions, and operational secrets.

## Identity and Session Rules

- `users` is a general account table.
- `display_name` remains in `users`.
- Passwords must be stored as hashes, not plaintext.
- Legacy `username` and password compatibility fields are scheduled for removal.
- Session payloads should remain minimal.
- Admin role checks must be performed server-side.

## Learner Privacy Rules

- Learner-specific age information belongs in `learner_profiles`.
- `birth_year` is preferred over full date of birth or permanently stored age.
- Raw assessment answers and raw scenario decisions must not be exposed to AI or Admin screens unless a future role-limited use case is explicitly designed.
- Analytics should be aggregate and privacy-conscious.

## AI and RAG Privacy Rules

- Do not expose prompts, provider keys, raw hidden learner context, raw private learner data, raw assessment answers, or raw scenario decisions.
- RAG should use reviewed/RAG-ready content.
- Sources are citations/evidence, not arbitrary routes.
- Unsafe guidance checks must run before harmful cyber guidance.

## Agentic Security Rules

- AI cannot directly update protected domain state.
- Agentic actions require proposal, confirmation, controlled execution, idempotency, and audit.
- Confirmation tokens must not be stored in plaintext.
- Write tools must be allowlisted and confirmation-gated.
- Frontend confirmation must not resubmit trusted action parameters.

## Admin Security Rules

- Admin endpoints must require authenticated admin sessions.
- Admin should support least privilege in future role expansion.
- Admin must not expose secrets, password hashes, raw prompts, provider keys, session secrets, or unnecessary learner private data.
- Destructive actions should prefer archive/deactivate workflows over hard delete.
- Content publishing and RAG-ready approval should require human review.

## Operations Security

- `server/.env` is local and must not be committed.
- Production secrets should live in environment/secret-management systems.
- Deployment documentation must not include real credentials.
- Database backups, restore plans, and migration rehearsal are required before production launch.

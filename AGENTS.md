# Cyberly Project Rules

## Project Identity

- Project name: Cyberly.
- Purpose: AI-powered Cyber Wellness Toolkit for Malaysian teenagers.
- Stack: React frontend, Express/Node backend, MySQL database.

## Database Rules

- The standard database name is `cyberly`.
- Do not use `cyberwell`.
- Do not introduce new `cyberwell` references in code, docs, examples, or setup instructions.
- All schema changes must be numbered migrations in `server/migrations/`.
- Migrations should be safe to run from a fresh database and should be idempotent where practical.
- Do not directly edit production-like data without a migration or an explicit user instruction.
- Run migrations after schema changes.

## Environment Rules

- `server/.env` is local and must not be committed.
- `server/.env.example` must remain safe and must use `DB_NAME=cyberly`.
- API keys, provider keys, session secrets, passwords, and other secrets must never be printed, committed, logged, or exposed to the frontend.

## Development Workflow

- Inspect the current implementation before editing.
- Keep changes narrow and phase-scoped.
- Do not modify unrelated modules.
- Do not change API response formats unless required by the task and covered by tests.
- Do not automatically commit unless the user explicitly asks.

## AI and RAG Rules

- RAG must use reviewed/RAG-ready content.
- Do not expose prompts, provider keys, raw private learner data, raw assessment answers, or raw scenario decisions.
- Sources are citations/evidence, not arbitrary action routes.
- Safety checks must remain before harmful cyber guidance.

## Agentic AI Rules

- Current Agentic AI is backend-orchestrated and read-only.
- Do not implement uncontrolled OpenAI tool calling without explicit phase approval.
- Do not allow tools that mutate scores, execute SQL, expose secrets, or bypass safety.
- Learning routes must not auto-start activities or modify progress unless a future confirmation workflow is implemented.

## Admin Rules

- Admin is governance-focused.
- Current Admin UI is read-only for Resource Review Metadata.
- Do not implement content editing, RAG toggles, Malaysia Guidance editor, AI Safety panel, or score editing unless explicitly requested in a future phase.
- Admin endpoints must enforce server-side role checks.

## Testing Rules

After relevant changes, run the appropriate checks:

```powershell
npm --prefix server run test:auth
npm --prefix server run test:rag
npm --prefix server run test:ai
npm --prefix server run test:agent
npm --prefix server run test:chat
npm --prefix server run test:assessment
npm --prefix server run test:scenario
npm --prefix server run test:progress
node scripts/verify-locales.js
npm run build
```

For database setup or migration changes, also run:

```powershell
npm --prefix server run db:ensure
npm --prefix server run migrate
```

Run `npm --prefix server run rag:ingest` when CyberGuard RAG demo content must be refreshed.

## Reporting Rules

Every Codex report should include:

- files changed
- commands run
- tests/build results
- database/migration impact
- unresolved assumptions
- whether manual browser verification is still needed

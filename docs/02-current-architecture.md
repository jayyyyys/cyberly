# Current Architecture

This document summarizes the current implementation. The detailed production source of truth is `docs/production/architecture/system-overview.md`.

## Repository Structure

- `client/`: official React frontend.
- `server/`: official Express/Node backend.
- `server/migrations/`: numbered MySQL migrations.
- `server/scripts/`: migration, ingestion, diagnostic, and focused verification scripts.
- `docs/production/`: production-oriented architecture, deployment, and configuration documentation.

The legacy root `src/`, root `public/`, and root `logo.svg` were removed during production cleanup. New frontend work belongs in `client/`.

## Runtime Entry Points

- Frontend entry: `client/src/index.js`
- Frontend app: `client/src/App.jsx`
- Backend entry: `server/server.js`
- Database configuration: `server/src/database/pool.js`

## Backend Runtime

`server/server.js` wires the current backend services and mounted routes:

- authentication and MySQL-backed sessions;
- learner profile and account APIs;
- initial assessment APIs;
- progress and recommendation APIs;
- scenario APIs and scenario attempt/result APIs;
- resource APIs;
- CyberGuard chat and AI generation APIs;
- RAG services;
- Controlled Agentic AI and learner-controlled action proposals;
- Admin APIs.

The backend exposes `GET /api/health` for database connectivity health.

## Frontend Runtime

The official frontend in `client/` handles:

- public pages, login, registration, onboarding, dashboard, profile, progress, resources, scenarios, CyberGuard chat, and Admin screens;
- localized English, Malay, and Simplified Chinese UI strings;
- compact RAG source display and deterministic action-card rendering;
- Admin Resource and Scenario management surfaces.

The frontend uses `REACT_APP_API_BASE_URL` for the backend API origin and sends session-backed requests with `credentials: include`.

## Database

The standard database name is `cyberly`. The older `cyberwell` name is deprecated.

MySQL stores:

- users and sessions;
- learner profiles;
- assessment definitions, attempts, answers, scores, and translations;
- learner progress and recommendations;
- scenario definitions, steps, attempts, decisions, progress events, publication metadata, and translations;
- resources, translations, and review metadata;
- chat conversations, messages, generations, action cards, and persisted sources;
- RAG documents and chunks;
- Agentic execution traces.

## CyberGuard, RAG, and Agentic AI

CyberGuard is implemented through the backend AI gateway. Provider keys and provider calls remain backend-only.

The current generation flow includes safety/scope checks, learner context, RAG retrieval from reviewed Resource content, optional controlled Agentic context, provider generation, output validation, assistant-message persistence, source persistence, action-card persistence, and Agentic trace updates.

RAG is Resource-backed in the current MVP. Sources are persisted as citation metadata and are separate from action cards.

Controlled Agentic AI is backend-orchestrated. At most one controlled tool/proposal path is used per eligible response, and learner-write proposals require explicit confirmation.

## Resources and Admin

Resources are stored in MySQL through `resource_articles` and `resource_article_translations`, not as static frontend-only content. Admin Resource workflows can manage metadata/content states and synchronize Resource content with RAG governance paths.

The Admin Console and protected Admin APIs are implemented. Admin access uses server-side role checks and must not expose secrets, password hashes, raw prompts, or private learner data.

## Current Known Boundaries

- Legacy compatibility endpoints `/api/register` and `/api/login` have been removed. Current authentication uses only `/api/auth/*`.
- Legacy `users.username` and `users.password` columns remain temporarily in the schema and are scheduled for Phase 1C.2 removal after migration smoke tests.
- Migration rollback is not implemented.
- Learner-controlled action proposals are currently short-lived and in memory.

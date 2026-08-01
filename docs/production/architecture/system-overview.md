# System Overview

Cyberly uses a React frontend, an Express backend, and a MySQL database.

## Official Entry Points

- Frontend entry: `client/src/index.js`
- Frontend app shell: `client/src/App.jsx`
- Backend entry: `server/server.js`
- Database configuration: `server/src/database/pool.js`
- Migrations: `server/migrations/`

## Frontend

The official frontend lives in `client/`.

Important frontend areas:

- `client/src/App.jsx`: main application shell, hash routing, auth flow, learner pages, CyberGuard UI, Admin shell, and API calls used by the app shell.
- `client/src/admin/`: Admin console components, resource governance screens, scenario management screens, and Admin API wrappers.
- `client/src/chat/`: chat action-card and navigation helpers.
- `client/src/i18n/`: English, Malay, and Simplified Chinese locale setup and strings.
- `client/src/assets/`: production Cyberly logo assets.

## Backend

The backend entry point is `server/server.js`. It:

- loads backend environment variables;
- creates the Express app;
- configures CORS using `CLIENT_ORIGIN`;
- configures HTTP-only `express-session` cookies backed by MySQL;
- wires Profile, Account, Assessment, Progress, Scenario, Resource, Chat, AI, RAG, Agentic, Adaptive Learning, Wellness, and Admin services;
- mounts API routes;
- exposes `GET /api/health`.

Mounted route groups include:

- auth: `/api/auth/register`, `/api/auth/login`, `/api/auth/me`, `/api/auth/logout`
- profile/account: `/api/profile`, `/api/account`
- assessment: initial assessment and attempt routes
- progress/recommendations: `/api/progress`, `/api/recommendations/current`, recommendation state routes
- scenarios: `/api/scenarios`, scenario attempt routes
- resources: `/api/resources`
- chat and AI generation: `/api/chat`
- controlled learner actions: `/api/agent/actions/proposals`
- admin: `/api/admin`

Legacy compatibility routes `/api/register` and `/api/login` have been removed. Current authentication uses only `/api/auth/*`, and Admin status uses `/api/admin/status`.

## Database

MySQL schema is managed through `server/migrations/` and tracked by `schema_migrations`.

Major schema areas:

- users and sessions;
- learner profiles;
- assessment definitions, attempts, answers, scores, and translations;
- learner progress and recommendations;
- scenario definitions, steps, attempts, decisions, progress events, publication metadata, and translations;
- resource articles, translations, and review metadata;
- chat conversations, messages, generations, action cards, and persisted sources;
- RAG documents and chunks;
- Agentic execution traces.

The standard database name is `cyberly`.

## CyberGuard, RAG, and Agentic AI

CyberGuard generation runs through the backend AI gateway.

Current flow:

1. Validate safety and product scope.
2. Build learner context.
3. Retrieve reviewed RAG snippets from Resource content when relevant.
4. Optionally build deterministic learning-route or controlled Agentic context.
5. Call the configured AI provider through the backend provider gateway.
6. Validate output.
7. Persist assistant message, sources, action cards, and Agentic trace data when applicable.

RAG source material currently comes from reviewed/RAG-ready Resource content. Sources are persisted as citation metadata and are separate from deterministic action-card routes.

Controlled Agentic functionality is backend-orchestrated. The model does not directly execute arbitrary tools. Learner-write proposals require explicit learner confirmation.

## Admin

Admin is governance-focused, not a generic learner surveillance dashboard. Current Admin areas include:

- protected Admin Console;
- resource review/governance metadata;
- resource content and metadata workflows;
- scenario management workflows;
- AI provider status and Agentic trace visibility.

Admin endpoints must enforce server-side role checks and must not expose secrets, password hashes, raw prompts, or raw private learner data.

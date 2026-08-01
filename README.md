# Cyberly

Cyberly is an AI-powered cyber wellness toolkit for Malaysian teenagers, with a broader general-user mode for other age groups.

## Project Structure

- `client/` is the official and only frontend.
- `server/` is the Express backend.
- `docs/production/` contains production-oriented architecture, deployment, and configuration documentation.
- `cyberly` is the default local MySQL development database. The old `cyberwell` name is deprecated and should not be used for new setup, migrations, or tests.

## Local Requirements

- Node.js: verified locally with `v24.13.0`
- npm: verified locally with `11.6.2`
- MySQL Server must be running before starting the backend.
  MySQL 8.0 is the expected development target.

## Environment Files

Use the templates below and create local `.env` files as needed:

- `client/.env.example`
- `server/.env.example`

Do not commit real `.env` files or secrets.

PowerShell setup:

```powershell
Copy-Item client\.env.example client\.env
Copy-Item server\.env.example server\.env
```

Set the values in `server\.env` for your local MySQL user. The default database name is:

```env
DB_NAME=cyberly
```

Do not use `DB_NAME=cyberwell`; that was an older local database name and is no longer the project standard.

`OPENAI_API_KEY` is optional for normal setup. If it is empty, AI generation returns a safe not-configured error instead of crashing startup.

## Install Dependencies

```powershell
npm install
npm --prefix client install
npm --prefix server install
```

## Database Setup

Preferred setup creates the configured database if it does not exist, then applies migrations:

```powershell
npm --prefix server run db:ensure
npm --prefix server run migrate
```

For the CyberGuard RAG demo, ingest reviewed Resource content after migrations:

```powershell
npm --prefix server run rag:ingest
```

Equivalent root scripts:

```powershell
npm run db:ensure
npm run migrate
```

Manual database creation is also safe:

```sql
CREATE DATABASE cyberly CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## Start The Frontend

```bash
cd client
npm start
```

The frontend runs separately from the backend.

## Start The Backend

```bash
cd server
npm start
```

The backend expects MySQL to be available and the configured `cyberly` database to exist. Run `npm --prefix server run db:ensure` first on a fresh machine.

## Simple Render Deployment

For a public MVP deployment using a Render Static Site, Render Web Service, and managed MySQL database, see:

- `docs/deployment/RENDER_SIMPLE_DEPLOYMENT.md`

Deployment uses the official `client/` frontend and `server/` backend. Do not put secrets in frontend environment variables.

## Authentication And Learning APIs

Cyberly uses server-side authentication with MySQL-backed sessions:

- Registration: `POST /api/auth/register`
- Login: `POST /api/auth/login`
- Restore current session: `GET /api/auth/me`
- Logout: `POST /api/auth/logout`
- Admin authorization check: `GET /api/admin/status`
- Learner profile read/update: `GET /api/profile`, `PUT /api/profile`
- Initial assessment: `GET /api/assessments/initial`, `POST /api/assessments/initial/attempts`
- Assessment attempts: `GET /api/assessment-attempts/:attemptId`, `PUT /api/assessment-attempts/:attemptId/answers`, `POST /api/assessment-attempts/:attemptId/submit`
- Initial assessment result/status: `GET /api/assessments/initial/result`, `GET /api/assessments/initial/status`
- Progress: `GET /api/progress`, `POST /api/progress/sync-initial-assessment`
- Recommendations: `GET /api/recommendations/current`, `POST /api/recommendations/:id/viewed`, `POST /api/recommendations/:id/completed`
- Scenarios: `GET /api/scenarios`, `GET /api/scenarios/recommended`, `GET /api/scenarios/dashboard`, `GET /api/scenarios/:slug`
- Scenario attempts: `POST /api/scenarios/:slug/attempts`, `GET /api/scenario-attempts/:attemptId`, `PUT /api/scenario-attempts/:attemptId/decisions`, `POST /api/scenario-attempts/:attemptId/complete`, `GET /api/scenario-attempts/:attemptId/result`

Session cookies are HTTP-only and are sent by the official frontend with `credentials: include`. Local development defaults to `sameSite=lax`; production can use `SESSION_COOKIE_SAMESITE=none` with secure cookies for separate frontend/backend deployment domains. Public registration always creates `role=user`; admin self-registration is not allowed. Passwords are stored with bcrypt hashes only.

Seven-step onboarding preferences are saved to `learner_profiles` after account creation. The session still stores only `userId` and `role`.

The initial cyber wellness assessment uses a fixed 12-question versioned question bank and deterministic backend scoring. Assessment data is stored outside `users`, `learner_profiles`, and sessions.

Progress tracking now stores topic mastery, an overall summary, and recommendation history outside `users`, `learner_profiles`, and sessions. Recommendations are deterministic and based on measured assessment topic scores only. They do not use age, age group, education level, or self-reported familiarity as measured ability.

The scenario engine uses a fixed approved bank of eight published Malaysian-context cyber wellness scenarios. Scenario scoring, immediate feedback, final results, progress deltas, and recommendation refreshes are deterministic and handled by the backend.

## Database Migrations

Run migration status:

```bash
cd server
npm run migrate:status
```

Apply pending migrations:

```bash
cd server
npm run migrate
```

Migrations are stored in `server/migrations/` and tracked in the `schema_migrations` table. Rollback is not implemented yet; take a database backup before production changes.

Fresh-clone migration smoke test:

```powershell
npm --prefix server run test:migrations
```

This creates a temporary `cyberly_migration_test_*` database, runs the full migration chain, checks key tables and seed rows, and drops only that temporary database.

## Troubleshooting

- Database does not exist: run `npm --prefix server run db:ensure`, or manually run `CREATE DATABASE cyberly CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`.
- Wrong database name: ensure `server\.env` uses `DB_NAME=cyberly`. Do not use the deprecated `cyberwell` database for current project work.
- Access denied: check `DB_HOST`, `DB_PORT`, `DB_USER`, and `DB_PASSWORD` in `server\.env`. Do not assume the MySQL root password is empty.
- Migration already applied: this is normal; applied files are tracked in `schema_migrations` and skipped.
- Table already exists: check whether the database was partially created outside migrations. For local development, use a fresh database name or back up and repair manually.
- Port already in use: set `PORT` in `server\.env` or stop the process using the current backend port.
- Missing AI API key: leave `OPENAI_API_KEY` empty for non-AI work; the server can still start, and generation returns `AI_NOT_CONFIGURED`.

To reset a local development database safely, first confirm the database name is not shared or production data, then use a new database name in `server\.env` or manually back up before dropping anything.

## Production Documentation

Current production-oriented documentation lives in `docs/production/`:

- `docs/production/architecture/system-overview.md`
- `docs/production/deployment/current-deployment.md`
- `docs/production/deployment/deployment-roadmap.md`
- `docs/production/configuration/environment-variables.md`

These documents describe the current implementation and clearly separate planned production hardening work.

## Implementation Notes

- The official frontend is `client/`.
- The backend uses `cyberly` as the default MySQL database name.
- The `users`, `sessions`, `learner_profiles`, and assessment tables are under migration management while preserving legacy `username` and `password` columns temporarily.
- Progress and recommendation tables are under migration management through `007_create_progress_and_recommendations.sql`.
- Scenario definitions, steps, attempts, decisions, and scenario progress events are under migration management through `008_create_scenario_engine.sql`.
- Frontend registration calls `POST /api/auth/register`; login calls `POST /api/auth/login`.
- Frontend startup calls `GET /api/auth/me` to restore an existing session, and logout calls `POST /api/auth/logout`.
- Seven-step onboarding preferences are persisted with `PUT /api/profile` and restored through `GET /api/auth/me`.
- CyberGuard AI provider calls are routed through the backend.
- Browser-side direct AI provider calls are disabled.
- Assessment questions, scenario content, scoring, feedback, progress tracking, and recommendations remain deterministic backend/product logic.

## Verification

```bash
cd server
npm run migrate:status
npm run db:ensure
npm run migrate
npm run test:migrations
npm run test:auth
npm run test:profile
npm run test:assessment
npm run test:progress
npm run test:scenario
```

```bash
cd client
npm run test:profile-mappings
npm run build
```

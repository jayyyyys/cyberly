# Current Deployment

Cyberly is deployable as a static React frontend plus a persistent Express backend with managed MySQL.

**Deployment status note:** The previous Render/Aiven deployment was prototype infrastructure. Current operating mode is local development, and future hosting provider selection is deferred until staging and production requirements are evaluated.

## Current Shape

- Frontend: build `client/` as static React assets.
- Backend: run `server/server.js` as a Node web service.
- Database: MySQL with migrations applied from `server/migrations/`.
- Sessions: HTTP-only cookies stored in the MySQL-backed session table.
- AI: backend-only provider gateway. Provider keys must not be exposed to the frontend.

## Build and Start Commands

Frontend build:

```powershell
npm --prefix client run build
```

Root build delegates to the official frontend:

```powershell
npm run build
```

Backend start:

```powershell
npm --prefix server start
```

Database setup:

```powershell
npm --prefix server run db:ensure
npm --prefix server run migrate
```

RAG Resource ingestion, when needed for a CyberGuard RAG demo:

```powershell
npm --prefix server run rag:ingest
```

## Required Runtime Configuration

The backend needs production values for:

- `CLIENT_ORIGIN`
- `SESSION_SECRET`
- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `DB_SSL_MODE` and, for managed MySQL providers that require it, `DB_SSL_CA`
- AI provider keys only when live AI generation is enabled

The frontend needs:

- `REACT_APP_API_BASE_URL`

Do not put backend secrets in frontend variables.

## Render-Oriented Prototype Reference

The current repository can be deployed as a Render Static Site for `client/` and a Render Web Service for `server/`, but this is a prototype deployment reference rather than the final production hosting decision.

Static site:

- Build command: `npm --prefix client ci && npm --prefix client run build`
- Publish directory: `client/build`

Backend:

- Start command: `npm --prefix server start`
- Configure backend environment variables in Render.
- Run database bootstrap/migration commands from a trusted deployment operation.

## Operational Notes

- `CLIENT_ORIGIN` must exactly match the deployed frontend origin.
- Cross-origin cookies require HTTPS and correct `SameSite`/secure cookie behavior.
- `server/server.js` trusts the hosting proxy with `app.set('trust proxy', 1)`.
- `GET /api/health` checks database connectivity.
- `server/.env` is local-only and must not be committed.

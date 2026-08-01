# Cyberly Simple Render Deployment Guide

This guide prepares Cyberly for a simple public MVP deployment using:

- Render Static Site for the official React frontend in `client/`
- Render Web Service for the official Express backend in `server/`
- An external managed MySQL database

No real secrets should be committed to the repository. Enter secrets only in Render environment settings.

## What Codex Can Prepare

Codex can prepare repository code and configuration, verify build commands, document deployment settings, and help troubleshoot logs that you provide.

Codex should not create external accounts, create cloud databases, enter production secrets, run a real deployment, or claim that public deployment succeeded without user-run verification.

## What The User Must Do Manually

The user or project team must:

- create a Render account
- connect the GitHub repository
- create or obtain a managed MySQL database
- copy database credentials into Render environment variables
- create the Render backend Web Service
- create the Render frontend Static Site
- enter AI provider keys only in backend environment variables
- run cloud database setup and migrations
- copy public service URLs
- update `CLIENT_ORIGIN` after the frontend URL is known
- test registration, login, CyberGuard, Resources, Scenarios, Progress, and Admin flows in a real browser

## Deployment Order

1. Create the managed MySQL database.
2. Create the backend Web Service.
3. Run database setup and migrations against the managed database.
4. Create the frontend Static Site.
5. Update backend `CLIENT_ORIGIN` to the final frontend URL.
6. Redeploy the backend.
7. Verify registration and login.
8. Verify the main learner flows.

## Backend: Render Web Service

Use these settings:

| Field | Value |
| --- | --- |
| Service type | Web Service |
| Root directory | `server` |
| Build command | `npm install` |
| Start command | `npm start` |
| Health check path | `/api/health` |

If Render runs commands from the repository root instead, use:

```bash
npm --prefix server install
npm --prefix server start
```

### Backend Environment Variables

Set these in Render for the backend service:

| Variable | Purpose |
| --- | --- |
| `PORT` | Render usually provides this automatically. Leave unset unless Render instructs otherwise. |
| `NODE_ENV` | Set to `production`. |
| `CLIENT_ORIGIN` | The final public frontend origin, for example `https://your-frontend.onrender.com`. |
| `SESSION_SECRET` | Strong random secret for signing sessions. |
| `SESSION_NAME` | Optional. Defaults to `cyberly.sid`. |
| `SESSION_TTL_SECONDS` | Optional session lifetime. Defaults to `86400`. |
| `SESSION_COOKIE_SAMESITE` | Use `none` for separate frontend/backend Render domains. |
| `DB_HOST` | Managed MySQL host. |
| `DB_PORT` | Managed MySQL port, usually `3306`. |
| `DB_USER` | Managed MySQL username. |
| `DB_PASSWORD` | Managed MySQL password. |
| `DB_NAME` | Standard value: `cyberly`. |
| `DB_SSL_MODE` | Use `required` if the managed MySQL provider requires SSL/TLS; otherwise `disabled`. |
| `DB_SSL_CA` | Optional managed MySQL CA certificate PEM text. Use this for Aiven or any provider that gives a CA certificate for TLS verification. |
| `DB_SSL_REJECT_UNAUTHORIZED` | Keep `true`. Use `false` only as a temporary diagnostic/MVP fallback when no CA is available and the provider explicitly allows it. |
| `OPENAI_API_KEY` | Backend-only OpenAI API key, if CyberGuard AI should generate real replies. |
| `OPENAI_MODEL` | OpenAI model name configured for the project. |
| `ILMU_API_KEY` | Backend-only ILMU key, if used later. |
| `ILMU_BASE_URL` | ILMU base URL, if used later. |
| `ILMU_MODEL` | ILMU model name, if used later. |
| `AI_DEFAULT_PROVIDER` | Current default provider setting. |
| `ACTION_PROPOSAL_TTL_SECONDS` | Optional learner-controlled action proposal expiry. |

Do not put `OPENAI_API_KEY`, `ILMU_API_KEY`, `SESSION_SECRET`, or database credentials in frontend variables.

### Backend Cookie Notes

When the frontend and backend are on different Render domains, browser session cookies are cross-site. Use:

```env
NODE_ENV=production
SESSION_COOKIE_SAMESITE=none
```

The backend sets secure cookies in production. Render terminates HTTPS and the backend is configured with `trust proxy`.

## Cloud Database Setup

After the backend environment variables point to the managed MySQL database, run these commands from the Render Shell or a safe one-off backend job:

```bash
npm run db:ensure
npm run migrate
npm run migrate:status
```

For the CyberGuard RAG demo, run this after migrations:

```bash
npm run rag:ingest
```

Only run `rag:ingest` when you intentionally want to populate or refresh reviewed Resource chunks for the deployed environment.

## Frontend: Render Static Site

Use these settings:

| Field | Value |
| --- | --- |
| Service type | Static Site |
| Root directory | repository root, unless Render is configured to build from `client` |
| Build command | `npm --prefix client install && npm --prefix client run build` |
| Publish directory | `client/build` |

If the Static Site root directory is set to `client`, use:

| Field | Value |
| --- | --- |
| Build command | `npm install && npm run build` |
| Publish directory | `build` |

### Frontend Environment Variables

Set this in Render for the frontend Static Site:

| Variable | Purpose |
| --- | --- |
| `REACT_APP_API_BASE_URL` | Public backend URL, for example `https://your-backend.onrender.com`. |

The frontend variable is not a secret. It is bundled into the React app so browsers know where to send API requests.

## Verification Checklist

After both services are deployed:

1. Open the frontend public URL.
2. Register a new learner account.
3. Log out and log back in.
4. Refresh the page and confirm the session restores.
5. Complete onboarding.
6. Open Resources and Scenarios.
7. Complete or start a Scenario if demo data is available.
8. Ask CyberGuard a safe question.
9. Confirm CyberGuard sources and action cards render if RAG and AI keys are configured.
10. Log in as an admin account if one exists and verify Admin Console access.

## Troubleshooting

### Database Does Not Exist

Run:

```bash
npm run db:ensure
```

Or create the database manually with the managed MySQL provider:

```sql
CREATE DATABASE cyberly CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Access Denied

Check `DB_HOST`, `DB_PORT`, `DB_USER`, and `DB_PASSWORD`. Do not assume the MySQL root password is empty on managed hosting.

### SSL Connection Errors

If the provider requires SSL/TLS, set:

```env
DB_SSL_MODE=required
```

Aiven for MySQL normally provides a CA certificate for TLS verification. Add it as `DB_SSL_CA`. In Render, paste the full PEM text into the environment variable value. Either multiline PEM text or escaped newline text using `\n` is supported.

Example placeholder only:

```env
DB_SSL_CA=-----BEGIN CERTIFICATE-----\nPASTE_PROVIDER_CA_TEXT_HERE\n-----END CERTIFICATE-----
```

With `DB_SSL_MODE=required` and no `DB_SSL_CA`, Cyberly still requests encrypted TLS and uses Node/mysql2 certificate verification with the default trust store. For Aiven, prefer the proper CA certificate because the default trust store may not be enough and can surface as `HANDSHAKE_SSL_ERROR`.

Keep `DB_SSL_REJECT_UNAUTHORIZED=true`. Setting `DB_SSL_REJECT_UNAUTHORIZED=false` should be treated only as a temporary diagnostic/MVP fallback, not the final secure configuration.

### Login Works But Refresh Logs Out

Check:

```env
NODE_ENV=production
CLIENT_ORIGIN=https://your-frontend.onrender.com
SESSION_COOKIE_SAMESITE=none
```

Also confirm the frontend uses:

```env
REACT_APP_API_BASE_URL=https://your-backend.onrender.com
```

### CORS Error

`CLIENT_ORIGIN` must exactly match the frontend origin. Do not include a trailing slash.

### Frontend Calls Localhost

Set `REACT_APP_API_BASE_URL` in the Render Static Site environment and redeploy the frontend.

### Missing AI API Key

The app can still run without provider keys, but CyberGuard generation will return a safe not-configured response. Add backend-only AI keys in the backend service when AI demo behavior is needed.

### Port Already In Use Locally

Set `PORT` in `server/.env` for local development or stop the process using the current backend port. On Render, use the platform-provided `PORT`.

## Important Limitations

- This guide does not perform deployment.
- This guide does not create a managed MySQL database.
- Pending learner-controlled action proposals are stored in memory and do not survive backend restart or multi-instance deployment.
- Production monitoring, backups, rollback procedures, and custom domains are future operational work.

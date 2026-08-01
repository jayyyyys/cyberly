# Environment Variables

This document lists environment variable names and purposes only. Do not include real secret values in repository files or documentation.

## Frontend

| Variable | Purpose | Secret |
|---|---|---|
| `REACT_APP_API_BASE_URL` | Public backend API origin used by the React app. | No |

Only public, non-secret values should be exposed to the frontend.

## Backend Core

| Variable | Purpose | Secret |
|---|---|---|
| `PORT` | Backend listen port. Hosting platforms may provide this. | No |
| `CLIENT_ORIGIN` | Allowed frontend origin for credentialed CORS. | No |
| `NODE_ENV` | Runtime mode. Use `production` for production hosting. | No |

## Database

| Variable | Purpose | Secret |
|---|---|---|
| `DB_HOST` | MySQL host. | No |
| `DB_PORT` | MySQL port. Defaults to `3306` when unset. | No |
| `DB_USER` | MySQL username. | Yes |
| `DB_PASSWORD` | MySQL password. | Yes |
| `DB_NAME` | MySQL database name. Standard value: `cyberly`. | No |
| `DB_SSL_MODE` | Use `required` when the managed MySQL provider requires TLS. | No |
| `DB_SSL_CA` | Optional managed MySQL CA certificate PEM text. | Yes |
| `DB_SSL_REJECT_UNAUTHORIZED` | Certificate verification toggle. Keep `true` except for explicit diagnostics. | No |

## Sessions

| Variable | Purpose | Secret |
|---|---|---|
| `SESSION_SECRET` | Express-session signing secret. Must be strong in production. | Yes |
| `SESSION_NAME` | Session cookie name. Defaults to `cyberly.sid`. | No |
| `SESSION_TTL_SECONDS` | Session lifetime in seconds. | No |

## AI Providers

| Variable | Purpose | Secret |
|---|---|---|
| `OPENAI_API_KEY` | OpenAI provider key. | Yes |
| `OPENAI_MODEL` | OpenAI model override. | No |
| `GEMINI_API_KEY` | Gemini provider key. | Yes |
| `GEMINI_MODEL` | Gemini model override. | No |
| `ILMU_API_KEY` | ILMU provider key. | Yes |
| `ILMU_BASE_URL` | ILMU API base URL. | No |
| `ILMU_MODEL` | ILMU model override. | No |

## AI Runtime Selection

| Variable | Purpose | Secret |
|---|---|---|
| `AI_DEFAULT_PROVIDER` | Default provider selection. | No |
| `AI_DEFAULT_MODEL` | Default model fallback. | No |
| `AI_PROVIDER_CYBERGUARD` | Provider assignment for CyberGuard chat. | No |
| `AI_PROVIDER_AGENT_ROUTER` | Provider assignment for controlled Agentic planning. | No |
| `AI_PROVIDER_LIGHTWEIGHT` | Provider assignment for lightweight selection tasks. | No |
| `AI_PROVIDER_TRANSLATION` | Provider assignment for translation assistance. | No |
| `AI_PROVIDER_SAFETY` | Provider assignment for safety evaluation. | No |
| `AI_PROVIDER_RUNTIME_DISABLED` | Comma-separated provider IDs disabled at runtime. | No |
| `AI_PROVIDER` | Legacy/default provider alias still read by current config. | No |
| `AI_MODEL` | Legacy/default model alias still read by current config. | No |

## AI Limits

| Variable | Purpose | Secret |
|---|---|---|
| `AI_TIMEOUT_MS` | Provider request timeout. | No |
| `AI_MAX_OUTPUT_TOKENS` | Assistant output token cap. | No |
| `AI_CONTEXT_MESSAGE_LIMIT` | Conversation context message cap. | No |
| `AI_CONTEXT_CHARACTER_LIMIT` | Conversation context character cap. | No |
| `AI_PER_USER_MINUTE_LIMIT` | Per-user minute limit. | No |
| `AI_PER_USER_DAILY_LIMIT` | Per-user daily limit. | No |
| `AI_GENERATION_STALE_MS` | Stale generation recovery window. | No |
| `AI_DAILY_BUDGET_USD` | Optional estimated daily AI budget cap. | No |
| `ACTION_PROPOSAL_TTL_SECONDS` | Learner-controlled action proposal expiry. | No |


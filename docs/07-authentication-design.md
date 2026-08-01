# Authentication Design

## Backend Routes

Current primary auth routes:

- `POST /api/auth/register`: validates email, display name, password, and age; creates a `user` role account; starts a session.
- `POST /api/auth/login`: authenticates by email and password; starts a session.
- `GET /api/auth/me`: restores the current authenticated user and normalized learner profile from the server-side session.
- `POST /api/auth/logout`: destroys the current session and clears the session cookie.
- `GET /api/admin/status`: protected admin-only status route.

Legacy compatibility endpoints have been removed:

- `POST /api/register`
- `POST /api/login`

Current authentication uses only `/api/auth/*`. The legacy `users.username` and `users.password` columns remain temporarily in the schema and are scheduled for Phase 1C.2 removal.

## Session Model

Authentication uses `express-session` with a custom MySQL-backed store in `server/src/auth/mysql-session-store.js`.

Session payloads are intentionally minimal:

- `userId`
- `role`

Registration and login regenerate the session before storing these values. Learner profile data is not stored in the session.

## Session Restore

`GET /api/auth/me` uses the session `userId` to load:

- a safe user object;
- the normalized learner profile from `learner_profiles`.

This lets the frontend restore authenticated state and onboarding/profile state after refresh while keeping the server-side session small.

## Cookie and CORS Rules

The session cookie is configured as:

- HTTP-only;
- `sameSite=lax` by default for local development and test;
- `sameSite=none` when `SESSION_COOKIE_SAMESITE=none` is configured for separate frontend/backend domains;
- `secure=true` when `NODE_ENV=production` or when `sameSite=none`.

The frontend sends requests with `credentials: include`. The backend CORS configuration uses `CLIENT_ORIGIN` and credentials.

Mobile Safari and other browser-specific cross-origin cookie behavior still require deployed manual verification.

## Password Storage

Passwords are hashed with bcrypt before storage. API responses exclude password and password-hash fields.

The primary `/api/auth/register` route writes `password_hash` and does not write plaintext passwords into the legacy `password` column.

## Validation

Registration validates:

- email format;
- display name required and no longer than 100 characters;
- password at least 8 characters with at least one letter and one number;
- age as a whole number from 1 to 120.

Age groups are mapped by backend logic:

- `child`
- `teen`
- `young_adult`
- `adult`

## Role Rules

- Public registration creates `role=user`.
- Admin self-registration is not allowed.
- Admin APIs use server-side role checks.
- Request-body role spoofing must not grant access.

## Learner Profile Persistence

Seven-step onboarding and profile data is stored in `learner_profiles` through Profile APIs.

The Profile APIs persist fields such as education level, preferred language, familiarity level, help topics, learning style, AI nickname, onboarding completion, and profile confirmation timestamps.

Assessment records, scenario progress, recommendations, chat history, and Admin data are stored separately from the session.

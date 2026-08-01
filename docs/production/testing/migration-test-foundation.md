# Migration Test Foundation

Status: Production Testing Foundation; Repository-Derived; No Live Database Verification by Default; Snapshot Date: 2026-07-27.

This document describes Cyberly's isolated migration-test foundation. It exists to support future destructive schema cleanup planning, including the eventual cleanup of legacy `users.username`, `users.password`, and compatibility behavior.

This phase does not create cleanup migrations and does not change existing migration files.

## Purpose

Migration tests should prove that the current migration chain can build the repository-derived baseline schema in an isolated database. They must never run against the normal local `cyberly` database, Aiven, production, or prototype credentials.

## Strict Isolation Requirements

- Migration tests require explicit `TEST_DB_*` configuration.
- The harness does not fall back to `DB_NAME`.
- Generated test databases must start with `cyberly_test_`.
- Protected database names are rejected, including `cyberly`, `mysql`, `information_schema`, `performance_schema`, and `sys`.
- Known deployed/prototype host patterns such as Aiven/Render hostnames are rejected.
- Passwords and full connection strings must not be printed.
- The isolated database is dropped in a `finally` cleanup path after the test.

## Required Variables

Use safe local or isolated test MySQL credentials only:

```powershell
$env:TEST_DB_HOST="127.0.0.1"
$env:TEST_DB_PORT="3306"
$env:TEST_DB_USER="test_admin_user"
$env:TEST_DB_PASSWORD="<test-only-password>"
$env:TEST_DB_ADMIN_DATABASE="mysql"
```

Do not use Aiven, production, prototype, or shared developer database credentials.

`TEST_DB_NAME` is not required. The harness generates a unique database name similar to:

```text
cyberly_test_migrations_20260727_153000_abcdef
```

## Commands

Pure safety and ordering tests:

```powershell
npm --prefix server run test:migration-foundation-unit
```

Full isolated fresh-schema migration test, only after safe `TEST_DB_*` variables are set:

```powershell
npm --prefix server run test:migrations
```

Safe backend test orchestration:

```powershell
npm --prefix server test
```

If `TEST_DB_*` variables are missing, `npm --prefix server test` runs the pure migration foundation unit tests and explicitly skips the live isolated migration DB test.

## Fresh-Schema Assertions

The isolated migration test verifies:

- migrations are recorded in `schema_migrations`;
- migration `026_create_agentic_execution_traces.sql` is recorded;
- all expected current baseline tables exist;
- current pre-cleanup identity columns exist, including `users.username`, `users.password`, `users.password_hash`, `users.email`, `users.display_name`, `users.age`, `users.age_group`, `users.role`, and `users.account_status`;
- `users` email and legacy username indexes exist;
- compatibility triggers exist;
- representative uniqueness constraints and foreign keys exist;
- RAG and Agentic trace tables exist.

These assertions validate the current baseline only. They do not assert the target cleanup schema.

## Migration Boundary Support

The shared migration runner supports a test-only boundary such as:

```js
runMigrations({
  connection,
  migrationsDir,
  through: "026_create_agentic_execution_traces.sql"
});
```

Unknown boundaries are rejected. The default normal migration command still runs all pending migrations.

Future upgrade-path tests can use this boundary to:

1. build schema through the current baseline;
2. apply a future cleanup migration;
3. compare pre/post schema expectations.

## Cleanup Behavior

The harness creates an isolated database, runs migrations, performs assertions, and drops the isolated database in a `finally` block. If cleanup fails, the report includes only the safe generated database name and a redacted host identifier.

## Prohibitions

- Do not use Aiven credentials.
- Do not use production or prototype credentials.
- Do not use `server/.env` as migration-test configuration.
- Do not run against `cyberly`.
- Do not paste secrets into documentation.
- Do not treat a skipped isolated migration test as proof that migrations work.

## Latest Verified Rehearsal
- Result: Passed
- Migration range: 001–026
- Environment: Local isolated MySQL
- Normal development database touched: No
- Test database cleanup: Successful
- Live/prototype database used: No
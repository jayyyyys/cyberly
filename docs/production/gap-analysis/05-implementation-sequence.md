# Implementation Sequence

Status: Production Gap Analysis; Based on Proposed Target Architecture and Repository-Derived Current Inventory; No Live Database Verification; Snapshot Date: 2026-07-27; Priorities are planning decisions, not implementation completion claims.

This is a recommended sequence for future phases. It is not a detailed implementation prompt and contains no SQL.

## 1. Operational Prototype Retirement

- Objective: confirm prototype Render/Aiven status, backup needs, and credential rotation.
- Prerequisites: authorized infrastructure access by a human operator.
- Expected artifacts: shutdown/retention note, backup confirmation, credential rotation record.
- Code/schema impact: none expected.
- Verification gate: documented confirmation; no secret values recorded.
- Rollback/restore expectation: backup exists before deletion.
- Next-step entry condition: prototype infrastructure status is no longer unknown.

## 2. Legacy Identity Schema Cleanup

- Objective: remove legacy `users.username`, `users.password`, and compatibility behavior through phased forward migration planning.
- Prerequisites: runtime dependency verification and isolated migration test strategy.
- Expected artifacts: migration plan, test plan, rollback/restore procedure.
- Code/schema impact: schema impact in a later implementation phase.
- Verification gate: fresh-schema and upgrade-path rehearsal.
- Rollback/restore expectation: database backup and forward-fix path.
- Next-step entry condition: active auth fields are explicitly preserved.

## 3. Learner Age Ownership Design and Migration

- Objective: decide and migrate learner-age ownership without fabricating precision.
- Prerequisites: birth-year/age-band/eligibility decision.
- Expected artifacts: privacy rationale, profile-field plan, compatibility transition plan.
- Code/schema impact: future learner profile and account runtime changes.
- Verification gate: registration, account, onboarding, and profile tests.
- Rollback/restore expectation: preserve original age data until migration is verified.
- Next-step entry condition: target learner age field is approved.

## 4. Agentic Proposal Persistence and Token Hardening

- Objective: replace in-memory proposals and plaintext token storage for production-suitable controlled actions.
- Prerequisites: proposal schema, token verifier, expiry, and idempotency design.
- Expected artifacts: schema plan, repository/service plan, restart/concurrency test plan.
- Code/schema impact: future Agentic schema and service changes.
- Verification gate: double-click, restart, expiry, and replay-protection tests.
- Rollback/restore expectation: ability to disable learner-write proposals if unsafe.
- Next-step entry condition: token handling design is accepted.

## 5. Backend Test and Migration-Test Hardening

- Objective: make backend and migration verification reliable before destructive cleanup.
- Prerequisites: inventory of current server scripts and test database strategy.
- Expected artifacts: backend test orchestration plan, isolated migration rehearsal process.
- Code/schema impact: likely test/script changes later.
- Verification gate: repeatable local and staging-oriented test commands.
- Rollback/restore expectation: no production data touched during testing.
- Next-step entry condition: migration rehearsals are automated or documented enough to repeat.

## 6. Content Versioning

- Objective: design Resource and Scenario stable identity/versioned publication.
- Prerequisites: content governance lifecycle decisions.
- Expected artifacts: Resource/Scenario versioning plan, translation binding plan, Admin compatibility plan.
- Code/schema impact: future content schema and Admin API changes.
- Verification gate: historical attempt and citation integrity tests.
- Rollback/restore expectation: old content rows remain interpretable during transition.
- Next-step entry condition: learner API compatibility requirements are documented.

## 7. Learning Event Expansion

- Objective: define and expand event-source coverage for learning-state changes.
- Prerequisites: event contract and producer-specific design.
- Expected artifacts: event schema plan, dual-write plan, rebuild validation plan.
- Code/schema impact: future learning-state schema and service changes.
- Verification gate: progress rebuild comparison and idempotency tests.
- Rollback/restore expectation: snapshots remain authoritative until event rebuild is proven.
- Next-step entry condition: event contract is approved.

## 8. Staging Preparation

- Objective: create a production-like staging environment for rehearsals.
- Prerequisites: secret separation, database strategy, deployment requirements.
- Expected artifacts: staging environment checklist, migration rehearsal runbook, monitoring baseline.
- Code/schema impact: deployment/configuration only unless gaps are found.
- Verification gate: backup/restore, cookie/CORS, migration, browser, and provider checks.
- Rollback/restore expectation: staging reset procedure.
- Next-step entry condition: staging validates production readiness candidates.

## 9. Production Readiness

- Objective: complete security, privacy, retention, monitoring, backup/restore, and launch checklist decisions.
- Prerequisites: staging evidence and critical blocker closure.
- Expected artifacts: production readiness checklist and go/no-go review.
- Code/schema impact: only approved hardening fixes.
- Verification gate: release-blocker review.
- Rollback/restore expectation: documented operational rollback and incident process.
- Next-step entry condition: controlled public launch criteria are satisfied.

## 10. Controlled Public Launch

- Objective: launch gradually with monitoring, rate limits, cost controls, and incident response.
- Prerequisites: production readiness sign-off.
- Expected artifacts: launch checklist, monitoring dashboard, support/incident process.
- Code/schema impact: none expected unless launch findings require fixes.
- Verification gate: browser/device acceptance, performance baseline, alerts, and cost controls.
- Rollback/restore expectation: ability to disable public access or high-risk features safely.
- Next-step entry condition: post-launch monitoring confirms stable operation.


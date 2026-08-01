# 09. Roadmap and Migration Strategy

**Document status:** Proposed Target Architecture  
**Implementation status:** Not Fully Implemented  
**Review status:** Subject to Current-System Audit

This roadmap defines the target sequence from Capstone prototype cleanup to production readiness. It intentionally avoids exact calendar dates.

## P0 Prototype Infrastructure Retirement

Retire assumptions from the previous Render and Aiven prototype deployment. Keep current operation local while production requirements are clarified.

## P1 Architecture Specification

Create and maintain this production architecture specification and ADR register. Use it as the target model for future audits and migration planning.

## P2 Current-System Audit

Audit the repository and database-facing code against this specification. Verify what is implemented, partially implemented, planned, obsolete, or contradictory.

## P3 Gap Analysis and Decision Register

Compare current implementation with target architecture. Record decisions, open questions, risks, and deferred choices. Update ADRs as decisions become accepted or superseded.

## P4 Migration and Refactoring Planning

Create dependency-aware migration plans. Do not clean up schema before runtime references are removed and tests pass.

## P5 Implementation

Implement approved changes through small, tested phases. Use forward migrations for schema changes and avoid broad rewrites.

## P6 Staging

Create a production-like staging environment for migration rehearsal, browser acceptance, AI provider validation, RAG verification, Admin governance tests, backup restore checks, and operational monitoring.

## P7 Production Readiness

Complete security review, privacy review, data retention decisions, monitoring, backup/restore runbooks, launch checklist, incident response, and cost/latency evaluation.

## P8 Controlled Public Launch

Launch gradually only after production readiness criteria are satisfied. A public launch date is not guaranteed by this document.

## Migration Strategy

Use this order for risky cleanup:

1. Remove application references.
2. Add focused tests proving the old path is unused.
3. Update documentation.
4. Verify local behavior.
5. Add a forward migration.
6. Rehearse in staging.
7. Apply to production with backup/restore plan.

## Phase 1C.2 Direction

The legacy `users.username` and `users.password` fields are scheduled for removal after runtime dependencies are eliminated and verified. Their removal must be done through a future migration, not by editing historical migrations.

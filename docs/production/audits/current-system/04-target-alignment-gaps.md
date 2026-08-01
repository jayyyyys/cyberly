# Target Alignment Gaps

Status: Current Implementation Inventory; Repository-Derived; No Live Database Verification; Snapshot Date: 2026-07-27; Subject to revision if local/database schema differs from migration reconstruction.

This matrix compares the current repository-derived implementation with approved target decisions in the production architecture specification and ADRs.

| # | Target statement | Current implementation | Alignment | Evidence | Production impact | Dependency before change |
|---|---|---|---|---|---|---|
| 1 | `users` is a general account table. | `users` is the account table, but also stores learner-age fields. | PARTIAL | `server/server.js`, migrations 001-004 | Identity/Learner boundary remains blurred. | Age-data migration decision. |
| 2 | `display_name` remains in `users`. | `display_name` is active in auth/account runtime. | ALIGNED | migration 002; `server/server.js` | Stable account display identity. | None known. |
| 3 | Learner-specific age belongs in `learner_profiles`. | `age` and `age_group` remain in `users`; `learner_profiles` has no age target field. | NOT_ALIGNED | migrations 002, 005; account repository | Privacy and domain ownership cleanup blocked. | Decide birth-year/age-band migration. |
| 4 | `birth_year` is preferred over DOB or permanently stored age. | No verified `birth_year` field exists. | NOT_ALIGNED | migration 005 | Future age handling unresolved. | Data migration design. |
| 5 | `username` and legacy password fields are scheduled for removal. | Runtime auth no longer uses them, but schema/index/trigger compatibility remains. | PARTIAL | migrations 001, 004; runtime searches | Schema cleanup remains. | Forward migration after smoke tests. |
| 6 | Assessment records learning facts. | Attempts, answers, and topic scores are stored. | ALIGNED | migration 006; assessment service | Good learning fact foundation. | None known. |
| 7 | Learning Events are intended source of truth. | Only `scenario_progress_events` provides event-like coverage. | PARTIAL | migration 008; progress service | Progress rebuildability incomplete. | Define event contract. |
| 8 | Progress is materialized/current-state snapshot. | Topic and summary progress are maintained as snapshots. | ALIGNED | migration 007; progress repository | Snapshot behavior is explicit. | Future event-source rebuild rules. |
| 9 | Recommendations are historical system decisions. | `learner_recommendations` stores rows and statuses. | ALIGNED | migration 007; progress repository | Supports history and status transitions. | Recommendation expiry policy. |
| 10 | Scenario and Resource content should support stable identity and versioned publication. | Scenario has `version`; Resource does not. Admin edits mutate current rows. | PARTIAL | migrations 008, 013, 024; admin routes | Historical attempts/citations may reference changed content. | Content versioning design. |
| 11 | RAG data is derived and rebuildable. | RAG docs/chunks are derived from approved Resource content; chunks are replaceable. | ALIGNED | migration 020; rag repository | Good cleanup boundary. | Ingestion-run governance later. |
| 12 | AI cannot directly update protected domain state. | AI generation is separated; controlled agentic actions are backend-mediated. | PARTIAL | AI service; action catalogue | Needs continued guardrails as agentic grows. | Keep model/tool boundary enforced. |
| 13 | Agentic actions require proposal, confirmation, controlled execution, idempotency, and audit. | Proposal/confirmation/control/audit exist; storage is in-memory. | PARTIAL | action proposal service; trace repository | Not production durable. | Persistent proposal/idempotency design. |
| 14 | Confirmation tokens must not be stored in plaintext. | Pending proposal token is stored in memory as plaintext. | NOT_ALIGNED | action proposal service | Token handling needs hardening before production. | Hash/verifier design. |
| 15 | Previous Render/Aiven deployment was prototype infrastructure and is being retired. | Production docs mark Render/Aiven as prototype/retired; deployment guide remains as reference. | PARTIAL | production deployment docs | Documentation must avoid operational confusion. | Confirm infrastructure shutdown/credential rotation. |
| 16 | Current operating mode is local development. | Production architecture docs state local mode. Runtime defaults use localhost. | ALIGNED | production docs; database pool default | Clear current mode. | None known. |
| 17 | Future sequence is Local -> Staging -> Production. | Documented target sequence exists. | ALIGNED | architecture specification | Good roadmap framing. | Staging requirements. |
| 18 | Hosting provider selection is deferred. | Production docs defer provider choice; Render guide still exists as prototype guide. | PARTIAL | production deployment docs | Avoid accidental provider lock-in. | Provider evaluation criteria. |
| 19 | Existing migrations must never be rewritten after application. | Repository uses numbered migrations; no rewrite was performed in this audit. | ALIGNED | migrations directory | Supports safe history. | Continue forward-only practice. |
| 20 | Destructive schema changes must use phased forward migrations. | Legacy fields still exist pending future migration; no destructive schema changes done here. | PARTIAL | migrations and docs | Cleanup needs staged plan. | Phase design and rollback plan. |

## Summary

The strongest alignment areas are RAG derivation, current authentication route cleanup, progress-as-snapshot semantics, recommendation history, and citation snapshots.

The largest gaps are Identity/Learner age ownership, general Learning Event coverage, content versioning, and production-grade Agentic proposal persistence/token handling.


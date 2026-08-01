# Disposition Register

Status: Current Implementation Inventory; Repository-Derived; No Live Database Verification; Snapshot Date: 2026-07-27; Subject to revision if local/database schema differs from migration reconstruction.

Allowed classifications: KEEP, CLEAN, NORMALIZE, VERSION, REPLACE, DEFER, UNKNOWN.

| Item | Domain | Classification | Evidence | Reason | Risk | Prerequisite | Earliest planning phase |
|---|---|---|---|---|---|---|---|
| `users.email` | Identity | KEEP | Auth login/register runtime | Core account identifier. | Low | None | P3 |
| `users.display_name` | Identity | KEEP | Migration 002; account runtime | Approved account display field. | Low | None | P3 |
| `users.password_hash` | Identity | KEEP | Migration 002; login runtime | Active bcrypt password hash. | Low | None | P3 |
| `users.role` | Identity / Administration | KEEP | Migration 001/002; admin middleware | Current admin access depends on server-side role. | Medium | Role policy review later | P3 |
| `users.account_status` | Identity | KEEP | Migration 002; login runtime | Active/disabled account control. | Low | None | P3 |
| `users.username` | Identity legacy | CLEAN | Migration 001/004; no current auth runtime use found | Legacy compatibility field. | Medium if removed before smoke tests | Forward migration and rollback plan | P4 |
| `users.password` | Identity legacy | CLEAN | Migration 001/004; no current auth runtime use found | Legacy plaintext-compatible field should not remain long-term. | High if misunderstood or populated | Forward migration and verification that it is unused | P4 |
| `users.age` | Learner / Identity conflict | NORMALIZE | Registration/account runtime writes age | Learner-specific data currently lives in account table. | Medium | Age migration decision | P4 |
| `users.age_group` | Learner / Identity conflict | NORMALIZE | Registration/account runtime writes age group; trigger updates it | Derived learner-age classification in account table. | Medium | Target learner age field decision | P4 |
| `learner_profiles` | Learner | NORMALIZE | Migration 005 lacks birth-year/age target | Useful profile table but not yet target-complete. | Medium | Profile boundary decision | P4 |
| `learner_topic_progress` | Learning | KEEP | Migration 007; progress runtime | Current per-topic snapshot. | Medium | Event-source rebuild design later | P3 |
| `learner_progress_summary` | Learning | DEFER | Migration 007; progress runtime | Useful snapshot, but operational necessity should be revalidated after event architecture. | Medium | Learning Events decision | P5 |
| `learner_recommendations` | Learning | KEEP | Migration 007; progress runtime | Historical recommendation decisions and statuses. | Low | Expiry policy later | P3 |
| `scenario_progress_events` | Learning | KEEP | Migration 008; scenario completion runtime | Provides scenario completion idempotency. | Low | None | P3 |
| General Learning Event architecture | Learning | DEFER | No general event table verified | Target exists but design is not yet implemented. | High if rushed | Define event contract | P3 |
| Resource current-row publication model | Content | VERSION | Admin updates current Resource rows | Needs stable publication history for production content governance. | High | Content versioning ADR expansion | P4 |
| Scenario current-row publication model | Content | VERSION | Admin updates current Scenario rows despite `version` field | Historical attempts may rely on mutable content rows. | High | Versioned scenario publication design | P4 |
| `rag_documents` | AI / Content | KEEP | Migration 020; RAG repository | Derived, filtered, rebuildable RAG metadata. | Low | Ingestion-run governance later | P3 |
| `rag_chunks` | AI / Content | KEEP | Migration 020; replace-chunks runtime | Derived/rebuildable retrieval text. | Low | Ingestion-run governance later | P3 |
| `chat_message_sources` | AI | KEEP | Migration 021; AI repository | Citation snapshots preserve historical source metadata. | Low | None | P3 |
| In-memory Agentic proposals | Agentic | REPLACE | Action proposal service store | Does not survive restart/multi-instance deployment. | High | Persistent proposal table design | P4 |
| Plaintext in-memory confirmation-token handling | Agentic / Security | REPLACE | Action proposal service stores `confirmationToken` | Target requires non-plaintext token storage. | High | Token hash/verifier design | P4 |
| `agentic_execution_traces` | Agentic / Administration | KEEP | Migration 026; trace repository | Sanitized audit trace foundation exists. | Medium | Privacy review and retention policy | P3 |
| Render/Aiven provider coupling | Infrastructure | KEEP | Production docs mark as prototype reference | Historical/prototype documentation can remain if clearly labelled. | Medium if mistaken for target production | Confirm shutdown/credential rotation | P3 |

## Counts

| Classification | Count |
|---|---:|
| KEEP | 12 |
| CLEAN | 2 |
| NORMALIZE | 3 |
| VERSION | 2 |
| REPLACE | 2 |
| DEFER | 2 |
| UNKNOWN | 0 |


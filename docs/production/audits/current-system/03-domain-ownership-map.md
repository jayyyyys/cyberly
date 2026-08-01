# Domain Ownership Map

Status: Current Implementation Inventory; Repository-Derived; No Live Database Verification; Snapshot Date: 2026-07-27; Subject to revision if local/database schema differs from migration reconstruction.

The target domains are Identity, Learner, Learning, Content, AI, Agentic, Administration, Analytics, and Infrastructure. Infrastructure is a supporting technical layer, not a business domain.

## Table Ownership

| Table or subsystem | Current owner | Notes and conflicts |
|---|---|---|
| `users` | Identity / Learner conflict | Account fields live beside active learner-age fields. Target wants age-specific learner data outside `users`. |
| `sessions` | Infrastructure | Session storage. |
| `learner_profiles` | Learner | Holds onboarding/preferences, but does not currently own target age data. |
| Assessment definitions/questions/translations | Content | Learning content used by the assessment flow. |
| Assessment attempts/answers/topic scores | Learning | Learner facts produced by assessment activity. |
| `learner_topic_progress` | Learning | Current per-topic snapshot, not event source of truth. |
| `learner_progress_summary` | Learning | Aggregate snapshot. Operational need should be revalidated. |
| `learner_recommendations` | Learning | Historical recommendation decisions and statuses. |
| Scenario definitions/steps/translations | Content | Scenario content. Admin can mutate current rows. |
| Scenario attempts/decisions | Learning | Learner activity facts. |
| `scenario_progress_events` | Learning | Scenario-specific idempotency/audit event. |
| Resource articles/translations | Content / Administration | Content data plus review/RAG governance metadata operated by Admin. |
| Chat conversations/messages/generations | AI | AI conversation and generation records. |
| Chat actions | AI / Learning | Persisted deterministic next-step UI generated from AI/backend logic. |
| Chat sources | AI / Content | Citation snapshots derived from RAG/content at answer time. |
| RAG documents/chunks | AI / Content | Derived AI retrieval data sourced from reviewed Content. |
| Agent tool registry and executor | Agentic | Backend-controlled tool layer. |
| Agent action proposals | Agentic / Learning | Proposals are agentic control objects; confirmed recommendation actions may write Learning status. |
| `agentic_execution_traces` | Agentic / Administration | Audit trace data intended for governance visibility. |
| Admin routes and middleware | Administration | Governance access layer; operates Content, AI provider diagnostics, traces, and lifecycle metadata. |
| Analytics | UNKNOWN | No dedicated analytics domain tables were verified in migrations 001-026. |

## Key Mixed Responsibilities

### `users`

`users` currently contains account identity fields and active learner-age fields. Evidence: current authentication returns `age` and `ageGroup`, registration writes `age` and `age_group`, and account update can modify them. This conflicts with the target account/profile boundary.

### Content Versus Learning

Assessment and Scenario definitions are Content. Attempts, answers, decisions, and scores are Learning. Current foreign keys bind learner facts directly to content definition rows. This is workable now but becomes risky when Admin edits mutate content rows in place.

### Resource Governance

Resource review fields such as `review_status`, `rag_ready`, source metadata, and review notes live on `resource_articles`. They are Content data, but their lifecycle is operated through Administration.

### RAG

RAG data is AI-derived but sourced from Content. It should not be treated as authoritative content because chunks can be deleted and rebuilt during ingestion.

### Progress Service

The progress service orchestrates assessment sync, scenario completion impact, recommendation generation, and recommendation status transitions. This places multiple Learning concerns behind one service boundary.


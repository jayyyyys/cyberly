# Open Questions

Status: Current Implementation Inventory; Repository-Derived; No Live Database Verification; Snapshot Date: 2026-07-27; Subject to revision if local/database schema differs from migration reconstruction.

All questions in this document are unresolved.

## Identity and Learner

- Is `birth_year` actually required, or would age-band/eligibility confirmation be enough?
- How should existing age data be migrated without fabricating precision?
- Should learner profile creation happen transactionally at registration or during onboarding?
- Which account roles are genuinely current versus future?
- Should `age_group` remain as a derived runtime value, or should it be recomputed from a learner-owned age attribute when needed?

## Learning

- What is the exact event contract for Learning Events?
- Which progress changes require event coverage?
- Can progress be rebuilt from existing facts?
- Is `learner_progress_summary` operationally necessary?
- How should recommendation regeneration and expiry work?
- Should initial assessment progress sync have an event/idempotency record equivalent to `scenario_progress_events`?

## Content

- Which edits require a new version?
- How should translations bind to versions?
- How should historical scenario attempts reference content?
- How should historical citations remain interpretable?
- What is the draft/review/published/RAG-ready lifecycle?
- Should Resource content receive a separate immutable publication/version table?

## Agentic

- What proposal data must be persisted?
- What is the token hash/verifier design?
- What is the proposal expiry policy?
- What is the idempotency-key scope?
- What audit metadata is necessary and privacy-safe?
- Should proposal confirmation tokens be one-time verifiers only, or also bound to session/device metadata?

## Deployment

- Has prototype Render/Aiven infrastructure been operationally shut down?
- Has the Aiven schema/data backup been captured?
- Have prototype credentials been revoked or rotated?
- What are future staging requirements?
- Which provider requirements should decide future hosting instead of inheriting prototype Render/Aiven choices?


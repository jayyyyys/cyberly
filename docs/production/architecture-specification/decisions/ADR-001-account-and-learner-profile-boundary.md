# ADR-001: Account and Learner Profile Boundary

## Status

Proposed Target Architecture. Not Fully Implemented. Subject to Current-System Audit.

## Context

Cyberly needs a durable distinction between account identity and learner-specific educational profile data. The existing prototype has account, profile, and legacy compatibility fields that need cleanup before production.

## Decision

`users` is a general account table. `display_name` remains in `users`.

Learner-specific age information belongs in `learner_profiles`. Production design should prefer `birth_year` over full date of birth or permanently stored age.

`username` and legacy password fields are scheduled for removal through a future forward migration after runtime references are removed and verified.

## Alternatives Considered

- Store all learner information in `users`: rejected because it mixes identity with learner state.
- Store full date of birth: rejected as higher privacy exposure than needed for current learning use cases.
- Keep legacy username/password compatibility indefinitely: rejected because it increases schema confusion and cleanup risk.

## Consequences

- Account concerns remain simpler and easier to secure.
- Learner profile can evolve without expanding account identity scope.
- Age-band logic can use lower-risk learner data.
- Schema cleanup requires careful phased migration.

## Implementation Status

Current implementation must be audited. Documentation indicates current `/api/auth/*` uses email and `password_hash`, while legacy `username` and `password` columns remain temporarily.

## Follow-up Work

- Verify no runtime references to `users.username` or `users.password`.
- Plan Phase 1C.2 forward migration.
- Add or update learner profile fields for target `birth_year` handling when approved.

# ADR-002: Learning State Architecture

## Status

Proposed Target Architecture. Not Fully Implemented. Subject to Current-System Audit.

## Context

Cyberly includes assessments, scenario practice, progress summaries, and recommendations. Production architecture needs a clear source of truth so progress and recommendations remain explainable and recoverable.

## Decision

Assessment records learning facts. Learning Events are the intended source of truth for learning-state changes. Progress is a materialized/current-state snapshot. Recommendations are historical system decisions.

## Alternatives Considered

- Treat progress rows as the only source of truth: rejected because snapshots can become stale or hard to audit.
- Treat recommendations as current state only: rejected because recommendations are decisions that should remain explainable historically.
- Recalculate everything from UI state: rejected because protected learning logic belongs on the backend.

## Consequences

- Future learning-state changes should flow through facts/events before snapshots.
- Progress can be rebuilt or audited from source events where coverage exists.
- Recommendations can be reviewed as historical decisions.
- Migration may be needed to reach full learning-event coverage.

## Implementation Status

Current implementation has assessment, scenario, progress, and recommendation records, but complete learning-event-source coverage is not claimed by this ADR.

## Follow-up Work

- Audit current tables and services against the target learning-state flow.
- Identify missing learning events.
- Plan migration and backfill strategy if learning events become production source of truth.

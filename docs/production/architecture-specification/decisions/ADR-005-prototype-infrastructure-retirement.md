# ADR-005: Prototype Infrastructure Retirement

## Status

Proposed Target Architecture. Not Fully Implemented. Subject to Current-System Audit.

## Context

Cyberly previously used Render and Aiven during prototype deployment work. The project is now transitioning toward production-oriented architecture, and provider selection should be made from requirements rather than inherited prototype setup.

## Decision

The previous Render and Aiven deployment was prototype infrastructure and is being retired. Current operating mode is local development.

The future sequence is Local -> Staging -> Production. Hosting provider selection is deferred until infrastructure requirements and cost/latency criteria are evaluated.

## Alternatives Considered

- Keep Render/Aiven as the assumed production platform: rejected because production requirements and cost/latency criteria have not been evaluated.
- Jump directly from local to production: rejected because staging is needed for migration rehearsal, operational testing, and acceptance checks.
- Choose a provider before requirements are known: rejected because it would hard-code operational constraints too early.

## Consequences

- Production documentation should not treat prototype deployment as final architecture.
- Staging becomes a required future step.
- Provider choice remains open until requirements, budget, privacy, latency, support, and operational capacity are understood.

## Implementation Status

Current operation is local development. Staging and production infrastructure are planned and not claimed as implemented by this ADR.

## Follow-up Work

- Define hosting evaluation criteria.
- Define staging requirements.
- Prepare backup, restore, monitoring, and deployment runbooks before production launch.

# ADR-004: AI and Agentic Boundary

## Status

Proposed Target Architecture. Not Fully Implemented. Subject to Current-System Audit.

## Context

CyberGuard combines AI generation, RAG grounding, deterministic action cards, and controlled Agentic proposals. Production safety requires a strict boundary between model output and protected domain-state changes.

## Decision

AI cannot directly update protected domain state.

Agentic actions require proposal, confirmation, controlled execution, idempotency, and audit. Confirmation tokens must not be stored in plaintext.

## Alternatives Considered

- Let the model directly call write tools: rejected because it increases risk of unauthorized or unsafe mutations.
- Let frontend submit trusted action parameters: rejected because trusted targets must remain server-controlled.
- Store confirmation tokens in plaintext: rejected because tokens are authorization material.

## Consequences

- Learners stay in control of write actions.
- Backend policy remains the enforcement point.
- Proposal persistence, replay protection, and audit trails must be designed carefully.
- Model-origin proposals require trusted provenance.

## Implementation Status

Current documentation describes controlled Agentic behavior, but this ADR does not claim that every planned persistence, audit, or token-storage detail is complete.

## Follow-up Work

- Audit controlled proposal implementation against this ADR.
- Verify token storage behavior before persistent proposal storage.
- Expand audit trails only through approved future phases.

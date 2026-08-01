# ADR-003: Content Versioning

## Status

Proposed Target Architecture. Not Fully Implemented. Subject to Current-System Audit.

## Context

Cyberly Resources and Scenarios support learning, RAG grounding, action cards, and Agentic learning routes. Production content needs stable identity, review metadata, and versioned publication behavior so learner history and citations remain trustworthy.

## Decision

Scenario and Resource content should support stable identity and versioned publication. RAG data is derived and rebuildable from reviewed, approved, RAG-ready content.

## Alternatives Considered

- Edit live content in place with no version boundary: rejected because it weakens auditability and learner history.
- Treat RAG chunks as authoritative content: rejected because RAG data should be derived from reviewed content sources.
- Make every published item RAG-ready automatically: rejected because source quality and safety review are separate from publication.

## Consequences

- Content governance can distinguish draft, reviewed, published, archived, and RAG-ready states.
- RAG can be rebuilt from reviewed source content.
- Historical citations and scenario attempts need stable references.
- Future Admin workflows must support review and version discipline.

## Implementation Status

Current repository documentation describes Resource review metadata and RAG-derived chunks, but full content versioning is a target architecture element and must be audited before being treated as implemented.

## Follow-up Work

- Audit Resource and Scenario schemas for stable identity and version fields.
- Plan content relationship governance.
- Plan version-aware Admin workflows before production content expansion.

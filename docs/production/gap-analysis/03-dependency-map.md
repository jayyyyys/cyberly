# Dependency Map

Status: Production Gap Analysis; Based on Proposed Target Architecture and Repository-Derived Current Inventory; No Live Database Verification; Snapshot Date: 2026-07-27; Priorities are planning decisions, not implementation completion claims.

This document records dependency relationships only. It is not an implementation plan.

## Legacy Identity Cleanup

```mermaid
flowchart LR
  A["Runtime legacy route removal"] --> B["Verify no runtime users.username/users.password dependency"]
  B --> C["Isolated migration rehearsal"]
  C --> D["Forward migration for legacy username/password cleanup"]
  D --> E["Fresh-schema and upgrade-path verification"]
```

Related gaps: GAP-IDN-001, GAP-IDN-002, GAP-IDN-003, GAP-IDN-004, GAP-ENG-002, GAP-ENG-003.

## Prototype Infrastructure Retirement

```mermaid
flowchart LR
  A["Confirm prototype service shutdown/retention"] --> B["Capture backup before deletion"]
  B --> C["Rotate or revoke prototype credentials"]
  C --> D["Update infrastructure/deployment records"]
```

Related gaps: GAP-OPS-001, GAP-OPS-002, GAP-OPS-003, GAP-OPS-004.

## Learner Age Ownership

```mermaid
flowchart LR
  A["Learner age target decision"] --> B["Profile schema addition"]
  B --> C["Dual-read/write or compatibility phase"]
  C --> D["Data migration without fabricated precision"]
  D --> E["Runtime switch"]
  E --> F["Old users.age/users.age_group removal"]
```

Related gaps: GAP-LRN-001, GAP-LRN-002, GAP-LRN-003, GAP-LRN-004, GAP-LRN-005.

## Agentic Proposal Hardening

```mermaid
flowchart LR
  A["Agentic proposal schema"] --> B["Token verifier design"]
  B --> C["Persistence repository"]
  C --> D["Execution idempotency"]
  D --> E["Restart and multi-instance tests"]
```

Related gaps: GAP-AGT-001, GAP-AGT-002, GAP-AGT-003, GAP-AGT-004, GAP-AGT-005, GAP-AGT-006.

## Content Versioning and RAG

```mermaid
flowchart LR
  A["Content identity/version design"] --> B["Resource schema plan"]
  A --> C["Scenario schema plan"]
  B --> D["Admin API changes"]
  C --> D
  D --> E["Learner API compatibility"]
  E --> F["RAG re-ingestion strategy"]
```

Related gaps: GAP-CNT-001 to GAP-CNT-006, GAP-AI-001, GAP-ADM-001.

## Learning Event Expansion

```mermaid
flowchart LR
  A["Learning Event contract"] --> B["Producer-specific event design"]
  B --> C["Dual-write phase"]
  C --> D["Rebuild validation"]
  D --> E["Snapshot authority decision"]
```

Related gaps: GAP-LNG-001 to GAP-LNG-005.


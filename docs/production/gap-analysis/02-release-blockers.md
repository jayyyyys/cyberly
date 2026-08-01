# Release Blockers

Status: Production Gap Analysis; Based on Proposed Target Architecture and Repository-Derived Current Inventory; No Live Database Verification; Snapshot Date: 2026-07-27; Priorities are planning decisions, not implementation completion claims.

This document separates blockers by environment or milestone. It does not claim any blocker has been resolved.

## Local Development

| Type | Blocker | Related gaps | Notes |
|---|---|---|---|
| Mandatory blocker | None identified from current documentation as preventing local development. | none | Current operating mode is local development. |
| Recommended hardening | Keep documentation clear that target architecture is not current implementation. | GAP-OPS-004 | Prevents planning confusion. |
| Recommended hardening | Keep large dirty worktree phase boundaries visible. | risk register | Reduces accidental scope mixing. |

## Staging

| Type | Blocker | Related gaps |
|---|---|---|
| Mandatory blocker | Isolated staging database exists and is not production/prototype data. | GAP-ENG-002 |
| Mandatory blocker | Migration rehearsal supports fresh-schema and upgrade-path verification. | GAP-IDN-004, GAP-ENG-002, GAP-ENG-003 |
| Mandatory blocker | Secret separation between local, staging, and future production. | GAP-OPS-003 |
| Mandatory blocker | Production-like cookie/CORS behavior tested. | GAP-OPS-004 |
| Conditional blocker | Persistent Agentic proposal behavior if Agentic writes are enabled in staging. | GAP-AGT-001 to GAP-AGT-005 |
| Mandatory blocker | Monitoring/error visibility exists for backend and database connectivity. | GAP-OPS-004 |
| Mandatory blocker | Backup/restore rehearsal is performed before destructive migration testing. | GAP-OPS-002, GAP-ENG-002 |
| Recommended hardening | RAG freshness/retrieval checks are repeatable. | GAP-AI-001 |

## Production

| Type | Blocker | Related gaps |
|---|---|---|
| Mandatory blocker | Legacy plaintext-compatible password schema removed or formally risk-accepted. | GAP-IDN-002 |
| Mandatory blocker | Legacy username schema and compatibility behavior removed or formally risk-accepted. | GAP-IDN-001, GAP-IDN-003 |
| Mandatory blocker | Verified database backup/restore procedure. | GAP-OPS-002, GAP-ENG-002 |
| Mandatory blocker | Prototype credentials rotated/revoked and production secrets separated. | GAP-OPS-003 |
| Mandatory blocker | Secure secrets and session configuration confirmed. | GAP-OPS-003 |
| Mandatory blocker | Migration rollback/restore procedure defined and rehearsed. | GAP-ENG-002, GAP-ENG-003 |
| Mandatory blocker | Privacy and retention decisions for learner data and agentic traces. | GAP-LRN-001, GAP-AGT-006 |
| Mandatory blocker | Content governance appropriate for public content. | GAP-CNT-006, GAP-ADM-001 |
| Conditional blocker | Agentic persistence and replay protection if learner-write Agentic actions are enabled. | GAP-AGT-001 to GAP-AGT-005 |
| Recommended hardening | Content versioning model implemented before frequent public content edits. | GAP-CNT-001 to GAP-CNT-005 |

## Controlled Public Launch

| Type | Blocker | Related gaps |
|---|---|---|
| Mandatory blocker | Browser/device acceptance completed. | GAP-ENG-001 |
| Mandatory blocker | Performance baseline established. | GAP-ENG-001 |
| Mandatory blocker | Monitoring and alerting active. | GAP-OPS-004 |
| Mandatory blocker | Incident response process defined. | GAP-OPS-004 |
| Mandatory blocker | User-facing privacy information available. | GAP-LRN-001, GAP-AGT-006 |
| Mandatory blocker | Deletion/retention process defined. | GAP-LRN-001, GAP-AGT-006 |
| Mandatory blocker | Cost and rate-limit controls defined for AI/provider usage. | GAP-AI-002 |
| Conditional blocker | RAG stale-content checks if CyberGuard RAG is public-facing. | GAP-AI-001 |
| Recommended hardening | Recommendation expiry/regeneration policy reviewed. | GAP-LNG-005 |


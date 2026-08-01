# Current System Inventory

Status: Current Implementation Inventory; Repository-Derived; No Live Database Verification; Snapshot Date: 2026-07-27; Subject to revision if local/database schema differs from migration reconstruction.

This folder records verified current Cyberly repository facts. It is separate from the proposed target architecture in `docs/production/architecture-specification/`.

The target architecture describes where Cyberly should move next. This inventory describes what the repository currently contains, based only on files available in this workspace.

## Evidence Sources

- Numbered migrations in `server/migrations/`.
- Runtime route mounting in `server/server.js` and route modules.
- Service and repository code in `server/src/`.
- Frontend API wrappers and current production documentation where relevant.
- Test scripts where they clarify temporary compatibility behavior.

## Limitations

- No live Aiven database was accessed.
- No local database was inspected.
- No migrations were executed.
- No RAG ingestion, AI provider call, or deployment command was run.
- The actual deployed schema is not verified by this inventory.

## Relationship to Other Documents

- `docs/production/architecture-specification/` is the proposed target architecture and ADR register.
- This folder is the repository-derived current implementation inventory.
- Future gap analysis should compare these two sources before migration or cleanup work.
- Future migration planning should treat this inventory as evidence, not as the final production schema.


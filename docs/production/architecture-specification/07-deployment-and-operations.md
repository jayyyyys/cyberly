# 07. Deployment and Operations

**Document status:** Proposed Target Architecture  
**Implementation status:** Not Fully Implemented  
**Review status:** Subject to Current-System Audit

## Deployment Position

The previous Render and Aiven deployment was prototype infrastructure and is being retired. Current operating mode is local development.

Future production path:

```mermaid
flowchart LR
  Local["Local"] --> Audit["Current-System Audit"]
  Audit --> Staging["Staging"]
  Staging --> Readiness["Production Readiness"]
  Readiness --> Production["Production"]
  Production --> Launch["Controlled Public Launch"]
```

Hosting provider selection is deferred until infrastructure requirements and cost/latency criteria are evaluated.

## Local Development

Local development should use:

- `client/` for frontend work;
- `server/` for backend work;
- MySQL with standard database name `cyberly`;
- safe local `.env` files that are not committed;
- numbered migrations for schema changes.

## Staging Target

Staging is planned and should be production-like enough to test:

- migrations;
- login/session behavior;
- AI provider configuration without exposing secrets;
- RAG ingestion and retrieval;
- Admin governance flows;
- Agentic proposals and confirmation;
- backup and restore procedures;
- performance and browser acceptance.

## Production Target

Production should include:

- managed database with backup and restore support;
- TLS for public traffic and database connections where applicable;
- secret management;
- health checks and structured safe logs;
- migration process with rehearsal and rollback/restore plan;
- monitoring for API errors, latency, database health, and AI provider failures;
- controlled release process.

## Operations Rules

- Do not deploy directly from unreviewed local changes.
- Do not use prototype credentials or prototype infrastructure as final production assumptions.
- Do not store real secrets in repository documentation.
- Do not apply destructive migrations without backup and tested restore.

## Deferred Decisions

- Final hosting provider.
- Production database provider.
- Logging/monitoring stack.
- Backup schedule.
- Staging environment shape.
- Cost and latency thresholds.

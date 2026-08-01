# CyberGuard Agentic Auditability

## Purpose

Phase 3E adds a safe auditability layer for CyberGuard Agentic execution. The goal is to help administrators inspect whether the backend used controlled planning, read-only tools, learner-controlled proposals, fallbacks, and safety blocks without exposing sensitive learner content or provider internals.

This is not an expansion of Agentic authority. CyberGuard still uses backend-controlled planning, at most one read-only tool, and learner-controlled action proposals. The model does not directly execute tools, confirm actions, mutate scores, or start activities.

## Persisted Trace Model

Agentic execution traces are stored in `agentic_execution_traces`.

Each trace stores:

- `trace_id`
- `request_id`
- optional `conversation_id`
- optional `message_id`
- optional `learner_id`
- `safe_status`
- sanitized `trace_json`
- timestamps

The persisted JSON is intentionally allowlisted. It contains summary fields such as provider name, model name, request ID availability, planner status, safe tool name, proposal status, outcome, and latency summaries.

## Sanitized Trace Shape

Safe trace fields include:

- request classification flags
- provider and model labels
- provider request ID availability, not the actual request ID
- adaptive context status and signal quality
- planner provider/model/decision/fallback reason
- tool name, status, safe error code, and latency
- proposal source, action type, status, mode, risk level, and trusted-target flag
- configured model/tool/proposal limits and actual counts
- outcome status and safe error code
- timeline event names

## Deliberately Excluded Data

Traces must not store or expose:

- raw learner question text
- full assistant response text
- system prompts or hidden prompt rules
- full RAG context or retrieved chunk text
- tool arguments
- tool outputs
- raw adaptive learner context
- profile values such as email or full name
- raw assessment answers
- raw scenario decisions
- recommendation text
- provider request IDs
- token usage and cost
- API keys, session secrets, confirmation tokens, or passwords
- SQL or database console access

## Execution Lifecycle

Trace statuses are:

- `started`
- `completed`
- `completed_with_fallback`
- `safety_blocked`
- `failed_safely`

Proposal statuses recorded inside a trace include:

- `pending`
- `completed`
- `cancelled`
- `expired`
- `rejected`
- `failed`

Trace persistence is best-effort. If writing a trace fails, CyberGuard generation and learner confirmation continue safely.

## Admin Conversation Inspector

Admins can inspect traces from the AI Admin page. The backend endpoints are:

- `GET /api/admin/ai/traces`
- `GET /api/admin/ai/traces/:traceId`

Both endpoints require an authenticated active Admin session. Normal learners receive `403`, unauthenticated requests receive `401`, and disabled accounts cannot access the endpoints.

The frontend inspector shows recent sanitized traces, simple filters, pagination, refresh, and a detail timeline. It is designed for governance visibility, not learner surveillance.

## Security Notes

The frontend receives only sanitized metadata. It does not receive raw prompts, hidden context, action parameters, confirmation tokens, provider keys, or raw model output. Learner-controlled action confirmation still sends only the confirmation token to the proposal ID route; the frontend cannot alter trusted backend parameters.

## Known Limitations

- Pending learner action proposals remain in memory and do not survive backend restart or multi-instance deployment.
- The trace table stores safe summaries, not full forensic payloads.
- Trace correlation is strongest for new CyberGuard generations after Phase 3E.
- Admin trace UI is intentionally lightweight and not a full analytics dashboard.
- Browser verification should still be performed manually for layout, locale, and responsive acceptance.

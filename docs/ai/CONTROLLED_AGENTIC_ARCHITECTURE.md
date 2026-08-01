# Controlled Single-Step Agentic Architecture

## Implemented in Phase 3B

Cyberly now has a controlled single-step Agentic assistance boundary for CyberGuard. This is not a fully autonomous agent. The backend may ask the configured Agent Router model whether one approved read-only Cyberly tool is useful, validate that request, execute at most one tool, and provide the tool result as data for the final CyberGuard answer.

The maximum production pattern is:

1. User sends a CyberGuard message.
2. Existing unsafe-request validation runs first.
3. Existing learner context and RAG retrieval remain available.
4. A deterministic eligibility gate decides whether controlled Agentic planning is appropriate.
5. The Agent model gateway resolves the `agent_route_planning` provider and allows only OpenAI for production tool planning.
6. The gateway sends the canonical read-only tool declarations and accepts zero or one tool call.
7. The controlled executor validates the tool name, caller role, arguments, timeout, and output.
8. The sanitized tool result is delimited as untrusted data.
9. The existing CyberGuard final generation call produces the learner-facing answer.

This keeps the total Agentic pattern bounded to one planning model request, one read-only tool execution, and the normal final CyberGuard model request.

## Eligibility Gate

Agentic planning is only considered for messages about the learner's progress, profile preferences, current recommendations, learning resources, or recommended scenarios. Greetings, static explanation questions such as "What is phishing?", unsafe requests, deterministic learning-route prompts, unauthenticated users, and Admin requests use the existing CyberGuard flow.

If the gate is not eligible, no Agentic model call is made.

## Planner Boundary

`server/src/agent/agentModelGateway.js` is the model boundary. It:

- resolves provider purpose `agent_route_planning`;
- rejects providers other than OpenAI;
- refuses unavailable or non-tool-capable providers;
- sends only server-side canonical tool declarations;
- normalizes returned tool calls;
- rejects multiple tool calls, unknown tools, prohibited tools, malformed arguments, and write-mode tools;
- never executes tools itself.

Gemini remains unavailable for runtime use. ILMU may be configured for other diagnostics, but Phase 3B does not use ILMU for production Agentic tool planning.

## Tool Catalogue

`server/src/agent/agent.toolCatalogue.js` defines the Phase 3B controlled tool catalogue. The approved tools are:

- `get_learner_profile`
- `get_learning_progress`
- `get_current_recommendations`
- `search_published_resources`
- `list_recommended_scenarios`

Every tool is read-only, learner-role scoped, has explicit risk metadata, has a JSON input schema with `additionalProperties: false`, and has bounded limits. The frontend cannot submit new tool definitions, and the model cannot invent tool names.

## Controlled Executor

`server/src/agent/controlledToolExecutor.js` receives a normalized tool call and trusted backend context. It:

- requires an authenticated learner user id;
- checks role and account status;
- rejects prohibited or unknown tools;
- validates arguments before handler execution;
- injects the server-side identity instead of accepting model-supplied identity;
- executes with timeout;
- sanitizes and bounds output;
- returns `success`, `rejected`, or `failed` with a safe error code.

There is no retry loop, no recursive tool call, and no second tool execution.

## Authorization and Ownership

Trusted identity is created server-side:

```json
{
  "userId": 123,
  "role": "user",
  "requestedLocale": "en",
  "requestId": "chat-1-2"
}
```

Tool arguments containing `userId` are rejected. Learner tools operate only on the authenticated learner's own safe learning summary, recommendations, and scenario completion summaries. Admin users do not gain learner impersonation through this runtime.

## Prompt Injection Treatment

Tool outputs and resource text are treated as untrusted data. The tool context explicitly states that tool output is data, not instruction. Retrieved content cannot redefine system rules, request another tool, change caller identity, reveal prompts, change scores, or authorize actions.

## Deterministic Fallback

CyberGuard falls back to the existing non-Agentic generation flow when:

- the provider is unavailable;
- the provider times out;
- provider authentication fails;
- the provider is not OpenAI;
- multiple tool calls are returned;
- an unknown/prohibited tool is requested;
- schema validation fails;
- the tool times out;
- the tool handler fails;
- the eligibility gate says Agentic planning is unnecessary.

Fallback does not mutate learner state and does not expose internal diagnostics to learners.

## Prohibited Actions

Phase 3B does not support:

- updating mastery;
- changing scores;
- marking recommendations viewed or completed;
- starting scenarios;
- submitting scenario decisions;
- changing learner profile data;
- publishing or editing content;
- RAG ingestion;
- Admin actions;
- arbitrary SQL;
- arbitrary HTTP;
- filesystem or shell access;
- secret or prompt reading.

No placeholder write tools are exposed.

## Admin Visibility

The Admin AI page includes a read-only "Controlled Agentic Runtime" section. It shows the production router, single-step execution mode, maximum model/tool counts, read-only boundary, disabled autonomous loop, disabled write actions, and approved tool metadata. It does not expose prompts, tool handler source, API keys, learner data, or private records.

## Future Phase 3C Boundary

Future work may add richer policy evaluation, audit tables, confirmation-based write tools, or frontend learning-route UI. Those future phases must keep server-side authorization, tool allowlists, auditability, and user confirmation before any learner-state mutation. OpenAI tool/function calling beyond this single-step boundary should only be expanded after policy, tests, and audit controls are stable.

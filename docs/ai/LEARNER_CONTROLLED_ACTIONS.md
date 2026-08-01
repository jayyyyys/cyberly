# CyberGuard Learner-Controlled Action Proposals

## Purpose

Phase 3D adds a learner-controlled action proposal boundary for CyberGuard. The goal is to let CyberGuard prepare safe next actions while keeping execution authority with the learner. The AI can suggest a canonical action, but it cannot execute writes, start activities, change scores, or mutate learner state.

## Threat Model

The design protects against model overreach, prompt injection, parameter tampering, replay, cross-user proposal use, and accidental hidden writes. The frontend is not trusted to choose final action parameters during confirmation. Session identity is the source of truth.

## Proposal Lifecycle

1. A user request, adaptive recommendation, or action card produces a canonical action request.
2. The backend validates the action type and parameters against an allowlist.
3. The backend rechecks target ownership and visibility.
4. A short-lived proposal is created with a proposal ID and confirmation token.
5. The learner reviews what will happen and what will not happen.
6. The learner confirms or cancels.
7. Confirmation revalidates the target and executes one deterministic handler.
8. Duplicate confirmation returns the completed result without repeating the write.

## Action Catalogue

Enabled actions:

- `open_resource`: navigation only. Validates a published Resource and returns an internal Resources target.
- `open_scenario`: navigation only. Validates a published Scenario and returns an internal Scenarios target. It does not start or restore an attempt.
- `open_recommendation`: navigation only. Validates an owned recommendation and returns the Progress recommendation target. It does not mark the recommendation viewed.
- `mark_recommendation_viewed`: learner-authorized write. Updates recommendation status only.
- `mark_recommendation_completed`: learner-authorized write. Updates recommendation status only.

Deferred actions:

- `update_learning_preferences`: deferred because the current profile update path is wider than a bounded learning preference update.

Prohibited actions include score changes, mastery changes, progress mutations, scenario attempts, scenario decisions, assessment completion, recommendation creation, content publishing/deletion, SQL execution, secret reading, and safety bypass.

## Navigation Versus Learner-Write Actions

Navigation proposals do not require a scary confirmation dialog, but they still require an explicit learner click and never navigate automatically. Learner-write proposals require a confirmation surface that states the exact data change and that score, mastery, and progress are not changed.

## Trusted Identity

The backend uses the authenticated session user ID, role, and session ID. `userId`, ownership, role, and admin status from the model or frontend are rejected. Admin users cannot use learner action endpoints to impersonate learners.

## Validation

The proposal endpoint accepts only one canonical proposal. Unknown, prohibited, malformed, multiple, or identity-injected proposals are rejected. The frontend may not submit arbitrary routes or external URLs.

## Confirmation

Confirmation submits the proposal ID and confirmation token only. It does not submit action type or target parameters again. The stored backend proposal remains the trusted source of action parameters.

## Revalidation

At confirmation time, the backend revalidates:

- authenticated active learner session;
- proposal ownership and session binding;
- pending and unexpired proposal status;
- enabled action type;
- target existence, ownership, and published visibility;
- recommendation state for recommendation writes.

## Idempotency

Learner-write handlers are idempotent. Repeating confirmation after a completed proposal returns the previous completed result. Concurrent confirmation is serialized by the proposal object and does not produce duplicate writes.

## Replay Protection

Each proposal has a short lifetime, a server-side stored action payload, and a confirmation token. Cancelled and expired proposals cannot execute.

## Cancellation and Expiry

Cancellation changes only proposal state and performs no learner action. Expired proposals fail safely and must be prepared again.

## Provider Boundary

The Agent Router may return a canonical `actionProposal` shape, but providers do not receive backend handlers and do not execute actions. The backend validates suggestions before any trusted proposal exists.

Phase 3D.1 connects model-origin suggestions to the same learner-controlled proposal service used by deterministic action cards. The model may suggest one canonical action, such as opening a Resource or Scenario, but the backend only creates a visible proposal when the target is already present in trusted Cyberly context, such as published Resource candidates, published Scenario candidates, RAG source targets, route steps, or an owned current recommendation.

The frontend never receives the trusted execution parameters. It receives only safe display fields, a proposal ID, and a short-lived confirmation token. Confirmation sends the proposal ID and token back to the backend; it does not resend action type, SQL IDs, slugs, routes, or write parameters as trusted data.

If the model suggests an unsupported, prohibited, stale, untrusted, or ambiguous action, CyberGuard ignores the proposal and continues with the normal assistant reply and deterministic action-card behavior. This prevents model-origin routes or writes from bypassing Cyberly's backend policy.

## Model-Origin Proposal Flow

1. The unsafe request check runs before agentic planning.
2. Controlled Agentic planning may return zero or one canonical `actionProposal`.
3. The AI generation service builds a trusted target allowlist from current backend data.
4. The proposal is rejected unless it points to a trusted published/owned target.
5. The proposal service creates a short-lived pending proposal and validates the target through the action catalogue.
6. The assistant response returns the proposal separately from persisted action cards.
7. The frontend shows the proposal below the assistant response and sources, and above regular action cards.
8. Matching deterministic action cards are hidden for that response to avoid duplicate click choices.
9. The learner can confirm or cancel; no action executes automatically.

## Controlled Agentic Relationship

Controlled Agentic planning remains bounded. The planner may respond directly, request one read-only tool, or suggest one action proposal. It may not combine an executable action with an unsafe or ambiguous tool plan.

## Adaptive Learning Relationship

Adaptive learning may inform suggestions, but it cannot write scores, progress, mastery, recommendations, profile data, content, or safety rules. Learner choice remains required.

## Audit Metadata

Safe runtime logs may include request ID, proposal ID, learner internal ID, action type, status, timestamps, safe error code, and latency. Logs must not include API keys, raw model responses, full prompts, sensitive profile data, complete recommendation content, or confirmation tokens.

## Known Limitations

Phase 3D uses an in-memory short-lived proposal store. This avoids a migration and is suitable for local MVP validation, but proposals are lost on server restart and are not shared across multiple server instances. A later production phase should add a durable audited proposal table or signed-token design.

Frontend proposal state is session-scoped. Existing persisted chat messages and old action cards are not rewritten. Model-origin proposals are not persisted with chat history in Phase 3D.1; after refresh or server restart, the user can still use persisted deterministic action cards or ask CyberGuard again.

The optional live learner-action acceptance script is intentionally opt-in. It does not call a real provider unless the operator explicitly sets `AI_LIVE_TEST=1` and performs the live acceptance flow.

## Live Provider Acceptance

Phase 3D.2 ran the opt-in live learner-action acceptance script with `AI_LIVE_TEST=1` against OpenAI as the Agent Router. The observed planner provider was OpenAI and the configured model was `gpt-5.4-mini`. Gemini remained runtime-disabled for Agent Router purposes, and ILMU was not used for proposal planning.

The live script created isolated DB-backed learner fixtures, published Resource and Scenario fixtures, one learner-owned recommendation, and separate rejected target fixtures. It cleaned up the temporary users/content after execution. The script did not run RAG ingestion, did not print API keys, did not print confirmation tokens, and did not log full provider responses.

Live model-origin proposal cases verified:

- Resource navigation: created one `open_resource` proposal for a trusted published Resource.
- Scenario navigation: created one `open_scenario` proposal for a trusted published Scenario.
- Recommendation navigation: created one `open_recommendation` proposal for the authenticated learner-owned recommendation.
- Mark recommendation viewed: created one `mark_recommendation_viewed` proposal. Creation and cancellation caused no learner-domain mutation. Confirmation changed only the allowed recommendation viewed state.
- Mark recommendation completed: created one `mark_recommendation_completed` proposal. Confirmation changed only the allowed recommendation completed state.
- Learning-style change: remained deferred with no proposal.
- Score change, scenario completion, and prompt-injection bulk recommendation completion: produced no proposal and no mutation.

Live target-provenance checks rejected invented Resources, draft Resources, archived Resources, invented Scenarios, draft Scenarios, archived Scenarios, another learner's recommendation, and model/user-supplied identity fields. Rejections returned safe action error codes only.

The live script observed zero read-only tool executions in proposal-only cases and at most one model-origin proposal per CyberGuard response. Proposal creation preserved the normal assistant text answer.

## Learner Browser Acceptance

Phase 3D.2 started the real application locally and verified backend startup and frontend dev-server compilation structurally. Full click-through browser automation was limited by the current tool environment: the available Node REPL could not load a working Playwright/Chrome controller because the bundled `playwright` package could not resolve `playwright-core`, and no separate browser connector tool was exposed in this session.

The learner browser checks that still need manual confirmation are:

- Resource proposal card appears below the assistant answer and sources.
- Scenario proposal card appears without starting a scenario attempt.
- Recommendation navigation proposal opens Progress without marking viewed.
- Mark viewed and Mark completed proposal cards show consequence copy before confirmation.
- Cancel and Confirm buttons behave correctly in the visible UI.
- Duplicate deterministic Resource/Scenario action cards are hidden when a model-origin proposal targets the same item.
- Expired or restarted proposals show the safe unavailable state and can be dismissed.
- 390px mobile layout has no horizontal overflow.

The backend/API acceptance already verified the same state transitions, navigation targets, cancellation, confirmation, idempotency, expiry, restart invalidation, and non-mutation rules.

## Admin Browser Acceptance

Phase 3D.2 verified the Admin AI provider/action-control data through existing protected admin diagnostics and focused frontend tests. Manual browser checks remain recommended for `#/admin/ai-agentic` at 1440px, 1024px, 768px, and 390px in English, Bahasa Melayu, and Simplified Chinese because automated browser control was unavailable in this session.

The expected Admin display remains:

- Learner-Controlled Actions status enabled.
- Learner confirmation required.
- Automatic execution disabled.
- Maximum proposals per response is 1.
- Write tools exposed to AI is 0.
- Replay protection enabled.
- Enabled action list includes the bounded actions.
- Learning-preference update remains deferred.
- Prohibited mutation actions remain listed.
- No learner records, secrets, API keys, prompts, or confirmation tokens are displayed.

## Network and Security Review

The proposal confirmation API accepts only the proposal ID in the route and this JSON body:

```json
{
  "confirmationToken": "..."
}
```

The frontend helper does not send action type, target ID, route, handler, user ID, owner ID, score/mastery fields, or trusted backend parameters during confirmation. The token is not placed in the URL. Proposal view models do not include trusted execution `parameters`; those remain in the server-side short-lived proposal store.

The live acceptance script confirmed:

- no mutation at proposal creation;
- no mutation on cancellation;
- no mutation for navigation confirmation;
- bounded mutation only for recommendation viewed/completed fields;
- duplicate confirmation returns the completed result without repeating the write;
- expired proposals fail with a safe expired response;
- restarted server loses in-memory pending proposals and returns a safe invalid proposal response.

## Future Phase 3E Possibilities

- Durable proposal persistence with audit logs.
- Confirmation-based preference updates with strict enum controls.
- Dedicated Learning Route confirmation UI.
- Richer proposal history for learners.
- Admin AI safety review of proposal outcomes.
- Optional model-selected proposal suggestions only after stronger evaluation.

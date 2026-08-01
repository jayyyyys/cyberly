# CyberGuard Agentic AI Summary

## Purpose

This document summarises CyberGuard's Agentic AI MVP after Phase 8D-3. It is written for Capstone reporting, demo explanation, and supervisor discussion.

CyberGuard now has a backend-orchestrated learning-route planning layer. It can detect when a learner asks for a study plan, use approved read-only Cyberly tools to inspect safe learning state, build a suggested learning route, and return deterministic action cards for internal Cyberly next steps.

## Agentic AI Definition For Cyberly

In Cyberly, Agentic AI means CyberGuard can use safe read-only Cyberly tools to plan learning steps for a learner.

It does not mean CyberGuard is an uncontrolled autonomous agent. CyberGuard does not autonomously modify scores, start activities, edit content, publish content, delete data, change account settings, or perform hidden actions.

The current Agentic AI MVP is a backend-orchestrated learning-route planning layer:

- The backend decides when route planning is allowed.
- The backend runs approved read-only tools.
- The backend validates and maps tool outputs.
- The backend creates safe internal action cards.
- The learner remains in control of whether to open a Resource, try a Scenario, review Progress, or start an Assessment.

## Chatbot vs RAG Assistant vs Agentic Assistant

### Current AI Chatbot

The AI chatbot answers user messages. It can respond conversationally, explain cybersecurity concepts, and refuse unsafe requests.

### RAG-Based AI Assistant

The RAG assistant improves the chatbot by grounding answers in reviewed Cyberly Resource content. It retrieves reviewed Resource chunks, includes them in the prompt, persists source snapshots, and displays compact deduplicated sources in the chat UI.

This helps CyberGuard answer questions such as "What is phishing?" using reviewed Cyberly learning material instead of relying only on general model knowledge.

### Agentic Learning Assistant

The Agentic learning assistant goes one step further. It uses approved read-only Cyberly tools to inspect safe learning state and build a suggested learning route.

For example, when a learner asks, "Give me a 15-minute phishing practice plan," CyberGuard can:

1. Detect that the user wants a learning route.
2. Extract the topic and time budget.
3. Use read-only tools to find relevant Resources, Scenarios, Progress, and Recommendation data.
4. Build a suggested route such as Resource -> Scenario -> Progress.
5. Generate a learner-friendly explanation.
6. Return deterministic internal action cards for the route steps.

## Phase 8D-1 Planning Summary

Phase 8D-1 established the safe design direction:

- Agentic AI should be read-only first.
- A tool registry and policy layer are required before any tool use.
- Write tools should only come later, and only with explicit user confirmation.
- Some tools must be permanently prohibited.

Prohibited tools include:

- SQL execution.
- Assessment score mutation.
- Scenario score mutation.
- Account deletion.
- Password changes.
- Secret reading.
- Raw assessment answer access.
- Raw scenario decision access.
- Admin publishing.
- RAG source modification.
- Safety-rule bypassing.

This planning phase defined CyberGuard's Agentic AI as safe learning-route assistance, not unrestricted automation.

## Phase 8D-2 Implementation

Phase 8D-2 created the backend-only read-only Agent Tool Registry foundation.

Implemented files:

- `server/src/agent/agent.policy.js`
- `server/src/agent/agent.registry.js`
- `server/src/agent/agent.tools.js`
- `server/src/agent/agent.service.js`
- `server/src/agent/agent.mapper.js`
- `server/scripts/test-agent.js`

### Implemented Read-Only Tools

#### `get_learner_context`

Purpose: returns a compact safe learner summary.

Safe output includes:

- Learner level.
- Confidence level.
- Primary focus topic.
- Up to two secondary focus topics.
- Current recommendation summary.
- Safe age band.

It does not expose email, full name, private profile details, raw assessment answers, raw scenario decisions, hidden formulas, or exact private evidence.

#### `get_current_recommendation`

Purpose: returns the learner's current recommendation in a safe summary form.

Safe output includes:

- Topic code.
- Topic label where available.
- Recommended level or difficulty band.
- Safe reason text or reason code.
- Internal Progress target.

It does not expose hidden scoring formulas.

#### `search_learning_resources`

Purpose: searches reviewed Cyberly learning content.

Safe output includes:

- Resource title.
- Summary or snippet.
- Category or topic.
- Safe internal target such as `{ "page": "resources", "resourceSlug": "..." }`.
- Safe source label or organisation where available.

It uses reviewed RAG-ready Resource content and does not return arbitrary external routes as action targets.

#### `get_related_scenarios`

Purpose: returns published Scenarios related to a topic or category.

Safe output includes:

- Scenario title.
- Summary.
- Difficulty.
- Completion status.
- Safe internal target such as `{ "page": "scenarios", "scenarioSlug": "..." }`.

It does not expose scenario steps, raw choices, raw decisions, or answer history.

#### `get_completed_scenarios`

Purpose: returns safe completion summaries so CyberGuard can avoid repeating already completed scenarios.

Safe output includes:

- Completed count.
- Safe scenario titles and slugs.
- Topic and difficulty summaries.

It does not expose raw scenario decisions, selected options, or scoring details.

#### `build_learning_route`

Purpose: builds a deterministic, non-persisted learning route.

Safe output includes:

- Route title.
- Route summary.
- Two to four route steps.
- Step type: Resource, Scenario, Progress, or Assessment.
- Step reason.
- Safe internal target.
- Safety note.
- `requiresConfirmation: false`

It does not persist the route, start activities, complete activities, or modify learner progress.

## Phase 8D-3 Implementation

Phase 8D-3 connected the read-only Agent foundation to CyberGuard generation in a safe backend-orchestrated way.

Implemented behavior:

- Deterministic route-planning intent detection.
- Topic extraction.
- Time-budget extraction.
- Backend-only route builder integration.
- Compact route context included in the provider prompt.
- Route-aware deterministic action cards.

### Route-Planning Intent Detection

CyberGuard detects route-planning prompts using deterministic patterns, not the LLM.

Examples that trigger route planning:

- "Give me a 15-minute phishing practice plan."
- "Can you make me a study plan for phishing?"
- "What steps should I follow to improve password safety?"
- "Help me learn scams in 10 minutes."
- "I want a learning route for privacy."
- "Plan my next cybersecurity study session."
- "我想学习网络钓鱼，帮我安排步骤。"
- "给我一个15分钟的网络安全学习计划。"
- "Saya mahu pelan belajar phishing selama 15 minit."

Examples that do not trigger route planning:

- "What is phishing?"
- "What is a strong password?"
- "How do I protect my password?"
- "What should I learn next?"
- "How can I steal someone's password?"

### Topic Extraction

The route planner can extract obvious topics:

- Phishing and scams.
- Password and account security.
- Privacy and personal information.
- Misinformation and deepfakes.

If the topic is unclear, the route builder can fall back to learner recommendation or primary focus.

### Time-Budget Extraction

The route planner extracts simple time budgets such as:

- 10 minutes.
- 15 minutes.
- 20 minutes.

If no time budget is obvious, it defaults to 15 minutes.

### Route Context In Provider Prompt

When route planning is triggered, CyberGuard adds compact route context to the provider request.

The route context includes:

- Route title.
- Route summary.
- Topic where known.
- Time budget.
- Two to four route steps.
- Step type.
- Step title.
- Step reason.
- Internal target description only.

It does not include raw JSON, SQL, secrets, provider diagnostics, hidden scoring formulas, or raw private data.

### Route-Aware Action Cards

When a learning route is generated, action cards prefer route steps:

- First Resource step -> Resource action.
- First Scenario step -> Scenario action.
- Progress step -> Progress action.
- Assessment step -> Assessment action if present.

Rules still apply:

- Maximum three action cards.
- Internal targets only.
- No arbitrary external URLs.
- No LLM-invented routes.
- No score or progress mutation.
- No scenario auto-start.
- No route persistence.

## End-To-End Learning Route Flow

1. User asks for a study plan, learning route, practice plan, or steps to follow.
2. The user message is persisted.
3. Unsafe request checks run first.
4. The backend detects route-planning intent using deterministic patterns.
5. The backend extracts topic and time budget where obvious.
6. The read-only Agent route builder creates a safe non-persisted route.
7. Learner context and RAG grounding remain available.
8. Compact route context is included in the provider prompt.
9. The provider generates a learner-friendly assistant response.
10. The assistant message is persisted.
11. Sources are persisted when RAG sources are used.
12. Route-aware deterministic action cards are generated and persisted.
13. The frontend displays the assistant response, compact sources, and action cards.

## Demo Script

### 1. "Give me a 15-minute phishing practice plan."

This proves Agentic learning-route planning.

Expected result:

- CyberGuard explains a clear route.
- The route uses Resource, Scenario, and Progress style steps.
- Action cards match the route steps.
- No activity is automatically started.

### 2. "What is phishing?"

This proves normal RAG answering still works.

Expected result:

- CyberGuard gives a normal explanation.
- Sources may appear.
- The answer is not forced into route format.

### 3. "What should I learn next?"

This proves learner recommendation behavior still works.

Expected result:

- CyberGuard uses learner context and recommendation style guidance.
- Action cards follow recommendation/progress logic rather than route-planning logic.

### 4. "给我一个15分钟的网络钓鱼学习计划。"

This proves Chinese route intent support.

Expected result:

- CyberGuard detects a Chinese learning-plan request.
- The route planning layer can extract a 15-minute plan request and phishing topic.
- Response and UI labels should remain consistent with the selected locale.

### 5. "Saya mahu pelan belajar phishing selama 15 minit."

This proves Bahasa Melayu route intent support.

Expected result:

- CyberGuard detects a Malay study-plan request.
- The route planning layer can extract the topic and time budget.
- Action cards remain internal and deterministic.

### 6. "How can I steal someone's password?"

This proves safety checks run before route planning.

Expected result:

- CyberGuard blocks or refuses the unsafe credential-abuse request.
- No route is built for the unsafe prompt.
- No harmful instructions are shown.

## Safety Explanation

The current Agentic AI MVP is deliberately controlled.

Safety guarantees:

- No OpenAI tool calling yet.
- The model does not directly call tools.
- Tools are backend-controlled.
- Tools are read-only only.
- No score mutation.
- No scenario auto-start.
- No Resource or Scenario auto-completion.
- No route persistence.
- No raw private data exposure.
- No raw assessment answers.
- No raw scenario decisions.
- No SQL tools.
- No secrets exposed.
- No hidden provider prompts exposed.
- Unsafe prompts are checked before route planning.
- Action cards remain deterministic and internal.

This means CyberGuard can plan learning steps, but it cannot secretly take actions for the learner.

## Current Limitations

- No frontend Learning Route Card UI yet.
- Learning routes are not persisted.
- No `learning_routes` or `learning_route_steps` tables yet.
- No confirmation-based write tools.
- No tool audit logs yet.
- No OpenAI function calling.
- Route planning uses deterministic patterns, not flexible model-selected tool use.
- Route quality depends on available Resource and Scenario coverage.
- Route explanations are generated in chat text rather than displayed as a dedicated structured route component.

## Future Work

Recommended future phases:

1. Frontend Learning Route Card
   - Show route steps as a dedicated structured UI below the assistant response.
   - Keep action cards and route steps visually clear and accessible.

2. `learning_routes` and `learning_route_steps` tables
   - Persist learner-approved routes.
   - Allow learners to resume a route later.

3. Confirmation-based write tools
   - Add tools such as `save_learning_goal`, `start_learning_route`, or `schedule_reassessment`.
   - Require explicit user confirmation before any write.

4. Agent audit logs
   - Add `agent_tool_runs` and `agent_audit_logs`.
   - Record which tools were used, why, and what safe output was returned.

5. Admin integration later
   - Admin content workflow can improve Resource, FAQ, Scenario, and RAG coverage.

6. Richer RAG content
   - Add FAQ, safety summaries, and Malaysia response guidance once reviewed content governance exists.

7. Optional OpenAI tool calling later
   - Only consider model-selected tool calling after policy, audit, confirmation, and safety tests are stable.
   - Keep backend validation as the final authority.

## Supervisor-Facing Summary

CyberGuard now qualifies as an Agentic AI MVP because it goes beyond answering chat messages. It can detect when a learner wants a study route, use backend-approved read-only Cyberly tools to inspect safe learning state, build a structured learning plan, and return deterministic internal action cards that guide the learner to Resources, Scenarios, Progress, or Assessment.

The implementation is intentionally safe for a Capstone cybersecurity learning platform. The model does not directly call tools, no write actions are allowed, no scores or scenario states are changed, and unsafe cyber requests are blocked before route planning. This demonstrates Agentic AI behavior in a controlled educational context without introducing uncontrolled automation or privacy risk.

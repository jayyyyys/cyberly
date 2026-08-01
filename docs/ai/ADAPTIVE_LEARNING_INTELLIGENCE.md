# CyberGuard Adaptive Learning Intelligence

## Purpose

Adaptive Learning Intelligence is a deterministic support layer for CyberGuard. It turns existing Cyberly learner signals into a compact, explainable learning-support context that can help CyberGuard answer questions such as “What should I study next?” or “Which topic should I improve?”

This is not predictive AI, automatic learning optimization, autonomous personalization, or psychological profiling. It does not change scores, mastery, progress, recommendations, scenario attempts, learner profile data, content, or Admin settings.

## Existing Data Sources

Phase 3C uses only existing read-only learner signals:

- Learner profile: education level, preferred language, learning style, and selected help topics.
- Initial assessment: latest completed initial assessment and topic scores.
- Topic progress: current mastery percentage, current level, and activity count.
- Scenario outcomes: completed scenario topic, percentage, result level, and completion time.
- Active recommendations: current deterministic recommendation topic, level, and reason code.

The service intentionally excludes email, password data, session data, raw assessment answers, raw scenario decisions, Admin metadata, provider prompts, API keys, and private raw rows.

## Adaptive Context Contract

The normalized context includes:

- `learnerId`, `generatedAt`, `locale`, `educationLevel`, `learningStyle`, and `preferredHelpTopics`.
- `signalQuality`, including availability of assessment, progress, scenario history, recommendation data, profile completeness, and warnings.
- `topicSignals` for the current Cyberly topics.
- `strengths`, capped to two topics.
- `supportPriorities`, capped to two topics.
- `recommendedNextSteps`, capped to three learner-controlled advisory actions.
- `responseGuidance` for explanation depth, tone, example style, pacing, and preferred formats.
- `safetyBoundary`, confirming read-only behavior and learner control.

The contract is provider-neutral and UI-neutral.

## Deterministic Rule Design

Rules are implemented in `server/src/adaptive/` and are designed to produce the same result for the same input data. The service reads aggregate learning data once through the existing AI repository and synthesizes a bounded context.

No external AI provider is called while building adaptive context.

## Confidence and Signal Quality

Signal quality distinguishes strong, partial, missing, stale, and conflicting evidence.

- `high`: assessment, progress, and scenario history are available.
- `medium`: at least two useful evidence sources are available.
- `low`: evidence is limited or mostly missing.

Topic confidence can be `high`, `medium`, `low`, or `unknown`. Conflicting signals or stale activity lower confidence. The system does not create fake statistical precision.

## Topic-Level Synthesis

Phase 3C uses the current Cyberly topic identifiers:

- `phishing_and_scams`
- `password_and_account_security`
- `privacy_and_personal_information`
- `misinformation_and_deepfakes`

Unknown topic values are omitted safely and recorded as a warning instead of crashing or being silently mapped to unrelated topics.

## Strength and Support Priority Logic

A topic may become a strength when available evidence is consistently strong, such as strong mastery and strong scenario performance.

A topic may become a support priority when assessment, progress, scenario results, or active recommendations suggest that it may benefit from more guided practice.

Support needs are advisory:

- `reinforce_foundation`
- `guided_practice`
- `continue_practice`
- `ready_for_challenge`
- `insufficient_data`

CyberGuard should describe these carefully, for example: “Current records suggest password and account security may benefit from guided practice.”

## Conflict Handling

If records disagree, such as a strong assessment but a recent low scenario result, the topic is not treated as a simple strength. The context marks conflicting signals, lowers confidence, and prefers cautious guided practice language.

## Response Guidance

Response guidance may suggest:

- explanation depth: concise, standard, or step-by-step;
- tone: supportive;
- example style: simple examples or practical scenario examples;
- pacing: one concept at a time or normal;
- preferred formats, based only on explicit learning-style and help-topic profile fields.

The system does not infer emotional state, intelligence, disability, personality, or hidden learning needs.

## Suggested Next Steps

Suggested next steps are temporary advisory actions. They are not persisted as official recommendations.

Possible step types include:

- `complete_initial_assessment`
- `review_resource`
- `attempt_scenario`
- `continue_current_path`
- `update_learning_preferences`

Every step requires learner action. The adaptive layer never starts a scenario, marks a resource complete, changes progress, or edits recommendations.

## CyberGuard Integration

Adaptive context is injected into controlled Agentic planning only for adaptive learning requests such as:

- “What should I study next?”
- “Which topic should I improve?”
- “Am I improving?”
- “Recommend something based on my progress.”

Normal explanation questions such as “What is phishing?” remain normal CyberGuard/RAG responses.

Unsafe prompts are still blocked by safety validation before adaptive guidance can influence the answer.

## Controlled Agentic Relationship

Phase 3C uses deterministic pre-planning context instead of adding a new model-callable tool. This preserves the existing one-tool maximum because the adaptive summary does not consume the single allowed tool execution.

The Agent Router may still call zero or one existing approved read-only tool. The final CyberGuard response receives a bounded adaptive summary plus any successful tool result.

## Learner-Control Boundary

The learner remains in control:

- Adaptive suggestions are advisory.
- No scores are changed.
- No progress is changed.
- No recommendations are rewritten.
- No scenarios or resources are started automatically.
- No route or suggestion is persisted as a new official learning record.

## Safety and Fairness Boundaries

The adaptive layer must not infer or classify:

- intelligence;
- mental health;
- disability;
- emotional state;
- socioeconomic status;
- ethnicity;
- religion;
- gender;
- family situation;
- likelihood of becoming a cybercrime victim;
- likelihood of committing cybercrime.

It must not call learners weak, careless, irresponsible, vulnerable, or high-risk. It uses topic-support wording only.

## Missing-Data Behavior

If evidence is limited, the context reports low signal quality and may suggest completing the initial assessment or updating learning preferences. CyberGuard should acknowledge limited data instead of inventing weaknesses or scores.

## Freshness Rules

Scenario and assessment activity freshness is categorized deterministically:

- recent: within 14 days;
- older: 15 to 45 days;
- stale: more than 45 days;
- unknown: no usable timestamp.

Freshness affects confidence only. It does not modify stored mastery or timestamps.

## Prohibited Inferences

CyberGuard must not use adaptive context to diagnose, label, or profile the learner. It must not expose raw tables, internal formulas, hidden prompts, or provider details.

## Admin Visibility

The Admin AI page shows a read-only Adaptive Learning Intelligence status:

- Enabled.
- Deterministic and explainable.
- Data sources used.
- Persistent AI recommendations disabled.
- Automatic difficulty changes disabled.
- Automatic score changes disabled.
- Learner choice required.

It does not display learner records.

## Phase 3C Limitations

- No machine-learned prediction.
- No automatic difficulty adjustment.
- No persisted adaptive recommendations.
- No new learner-facing adaptive dashboard.
- No adaptive Admin controls or thresholds.
- No database schema changes.
- No resource completion tracking.
- No statistical confidence model.

## Future Possibilities

Future phases could add educator-reviewed adaptive thresholds, learner-facing “Why this suggestion?” explanations, Admin-reviewed adaptive policies, stronger content relationship use, and audited confirmation-based learning actions. These should remain opt-in, explainable, and learner-controlled.

## Phase 3C.1 Acceptance Notes

Phase 3C.1 adds acceptance documentation and an opt-in live runtime script. The focused live script is `npm --prefix server run test:adaptive-live`; it skips safely unless `AI_LIVE_TEST=1` is set.

Acceptance coverage is summarized in `docs/ai/adaptive-runtime-acceptance.md`, including representative learner states, non-mutation expectations, live-provider status, and browser verification status.

Browser verification is not automatically claimed by this document. It should be marked complete only after the Admin AI page and learner CyberGuard prompts are exercised in the browser.

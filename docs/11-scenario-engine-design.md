# Scenario Engine Design

## Purpose

Phase 1D.1 adds an interactive cyber wellness scenario engine with fixed approved content, deterministic scoring, immediate feedback after each submitted decision, and conservative progress updates after completion.

This phase does not add LLM-generated scenarios, Agentic AI orchestration, chatbot persistence, admin UI, or cost monitoring.

## Schema

Migration `008_create_scenario_engine.sql` creates:

- `scenario_definitions`: versioned scenario metadata.
- `scenario_steps`: ordered situation prompts and option JSON.
- `scenario_attempts`: user-owned attempt state and final score.
- `scenario_decisions`: one final choice per attempt/step.
- `scenario_progress_events`: durable marker proving scenario mastery was applied once.

Published scenario content is treated as immutable in practice. Future content edits should create a new version instead of changing completed-history meaning.

## Fixed Scenario Bank

The MVP bank contains exactly eight published scenarios:

- Suspicious parcel-delivery SMS
- Fake bank or e-wallet urgent message
- Friend asks to share an OTP
- Same password reused after a breach warning
- Social media location and school-uniform post
- Mobile app requests excessive permissions
- Viral emergency claim in a group chat
- AI-generated celebrity investment video

There are exactly two scenarios per topic:

- `phishing_and_scams`
- `password_and_account_security`
- `privacy_and_personal_information`
- `misinformation_and_deepfakes`

Each scenario has three ordered decision steps in this MVP.

## Decision Rules

Options use stable keys such as `A`, `B`, and `C`.

Scores are deterministic:

- safest/best choice: 2 points
- partially safe choice: 1 point
- unsafe choice: 0 points

Choices are final after submission. Users may review submitted feedback but cannot change answers inside the same attempt. This preserves experiment integrity.

Hidden fields are not returned before submission:

- option score
- outcome code
- feedback
- safety explanation

## Result Thresholds

- `0-39`: `needs_review`
- `40-69`: `developing`
- `70-84`: `proficient`
- `85-100`: `strong`

The backend calculates all scores, percentages, and result levels. The frontend cannot submit authoritative score data.

## Progress Synchronization

Progress updates only after a valid scenario completion.

Prototype mastery deltas:

- `0-39`: +0
- `40-69`: +2
- `70-84`: +4
- `85-100`: +6

Mastery is capped at 100. No mastery loss is applied in this phase.

`scenario_progress_events.scenario_attempt_id` is unique, so repeated completion calls cannot apply mastery twice. Opening a scenario, starting an attempt, submitting a step, viewing a recommendation, or opening a resource does not update mastery.

These deltas are prototype rules and require later empirical validation.

## Recommendation Integration

After scenario progress is applied, the progress service recalculates the learner progress summary and refreshes the active recommendation from current topic mastery.

`GET /api/scenarios/recommended` selects published scenarios deterministically:

- exact topic and difficulty where possible
- same topic with the nearest lower difficulty
- same topic with the nearest higher difficulty
- same topic beginner fallback

No AI routing is used.

## Resume Flow

In-progress attempts survive refresh and later login because they are stored in MySQL.

Restore behavior:

- completed decision feedback is visible
- current unanswered step is visible
- future-step feedback remains hidden
- if all steps are answered but not completed, the attempt is ready to complete

Users can access only their own attempts.

## API Surface

- `GET /api/scenarios`
- `GET /api/scenarios/recommended`
- `GET /api/scenarios/dashboard`
- `GET /api/scenarios/:slug`
- `POST /api/scenarios/:slug/attempts`
- `GET /api/scenario-attempts/:attemptId`
- `PUT /api/scenario-attempts/:attemptId/decisions`
- `POST /api/scenario-attempts/:attemptId/complete`
- `GET /api/scenario-attempts/:attemptId/result`

All routes require authentication in this phase.

## Future Integration Points

Future Agentic AI can consume scenario results as transparent learning events. It should not rewrite fixed approved scenario content at runtime.

Future admin tooling should manage draft, approval, publishing, archiving, and new-version creation. It should not mutate already-published content in a way that changes historical attempt meaning.

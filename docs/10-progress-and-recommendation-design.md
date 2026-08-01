# Progress And Recommendation Design

## Purpose

Phase 1C.2 added measured progress records and transparent rule-based recommendations. Phase 1D.1 extends those records with completed scenario outcomes. This area still does not add AI, chatbot persistence, admin UI, or cost monitoring.

## Ability Signals

Authoritative ability signals:

- completed initial assessment topic scores
- future learning activity outcomes
- completed scenario outcomes
- future admin/research adjustments

Non-authoritative profile fields:

- age
- age group
- education level
- self-reported familiarity

These profile fields may help personalize wording or interface defaults later, but they must not be used as measured ability.

## Current Tables

- `learner_topic_progress`: one measured row per user/topic.
- `learner_progress_summary`: one summary row per user.
- `learner_recommendations`: recommendation history and current status.

The tables are created by `server/migrations/007_create_progress_and_recommendations.sql`.

## Rule Set

Mastery thresholds:

- `0-39`: beginner
- `40-69`: developing
- `70-84`: intermediate
- `85-100`: advanced

Recommendation selection:

- Select the lowest current mastery topic.
- Break ties by fixed priority:
  1. `phishing_and_scams`
  2. `password_and_account_security`
  3. `privacy_and_personal_information`
  4. `misinformation_and_deepfakes`
- If no completed initial assessment exists, recommend completing the assessment first.

Reason codes:

- `assessment_pending`
- `weak_topic`
- `developing_topic`
- `continue_progress`
- `high_mastery_challenge`
- `lowest_topic_score`

The implementation currently emits deterministic reason text from templates. No LLM is used.

## API Surface

- `GET /api/progress`
- `POST /api/progress/sync-initial-assessment`
- `GET /api/recommendations/current`
- `POST /api/recommendations/:id/viewed`
- `POST /api/recommendations/:id/completed`

All routes require authentication and only operate on the current session user.

## Frontend Behavior

The dashboard and progress page show measured progress when available. The recommendation call-to-action prefers a matching scenario where available, then falls back to matching static resource content.

Viewing resources does not currently update mastery. Learning-activity progress updates are deferred until a real learning activity model exists.

Completed scenarios apply conservative prototype mastery deltas exactly once:

- `0-39`: +0
- `40-69`: +2
- `70-84`: +4
- `85-100`: +6

Mastery remains capped at 100. These deltas require later empirical validation.

## Verification

Run:

```bash
cd server
npm run test:progress
```

The script verifies rule thresholds, tie-breaking, API authorization, assessment-to-progress sync, recommendation status changes, idempotent topic progress rows, persistence after logout/login, and cleanup.

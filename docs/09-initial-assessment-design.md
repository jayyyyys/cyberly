# Initial Assessment Design

## Purpose

The Initial Cyber Wellness Assessment records a deterministic baseline before adaptive learning is added. It is not an AI-generated quiz and not a scenario engine.

## Structure

- Name: Initial Cyber Wellness Assessment
- Type: `initial`
- Version: `1`
- Questions: 12
- Format: single-choice multiple choice
- Scoring: 1 point per correct answer, no negative marks

Topics:

- `phishing_and_scams`
- `password_and_account_security`
- `privacy_and_personal_information`
- `misinformation_and_deepfakes`

Each topic has exactly three published questions.

## Question Bank

The MVP question bank is fixed and seeded by migration `006_create_initial_assessment_system.sql`. Questions use stable option keys `A`, `B`, `C`, and `D`.

Correct answers and explanations are stored server-side and are not returned before final submission.

## Scoring

The backend calculates all scores:

- `percentage = round((total_score / maximum_score) * 100)`
- `0-39`: beginner
- `40-69`: developing
- `70-84`: intermediate
- `85-100`: advanced

Topic scores are calculated independently. A topic at `67%` or higher is shown as a relative strength; below `67%` is shown as an improvement area.

No score, percentage, correctness flag, awarded score, or topic score is trusted from frontend input.

## Familiarity Versus Ability

`learner_profiles.familiarity_level` is self-reported. Assessment `measured_level` is calculated from actual answers. The assessment does not overwrite learner-profile familiarity and does not infer ability from age, age group, or education level.

## APIs

- `GET /api/assessments/initial`
- `POST /api/assessments/initial/attempts`
- `GET /api/assessment-attempts/:attemptId`
- `PUT /api/assessment-attempts/:attemptId/answers`
- `POST /api/assessment-attempts/:attemptId/submit`
- `GET /api/assessments/initial/result`
- `GET /api/assessments/initial/status`

All routes require authentication. Attempts are accessible only by their owning user.

## Progress Sync

Submitting the initial assessment syncs measured progress and generates a rule-based current recommendation in the same transaction.

The sync writes:

- four `learner_topic_progress` rows, one per topic
- one `learner_progress_summary` row
- one active `learner_recommendations` row

Re-syncing preserves exactly one topic-progress row per topic and supersedes any active/viewed recommendation before creating the latest active recommendation.

Scenario completion can later adjust topic mastery from this baseline through conservative positive deltas. The initial assessment baseline remains preserved in assessment tables.

## Retake Policy

The first completed initial assessment is preserved. Starting the assessment after completion returns the existing completed result instead of silently creating a new attempt. Admin/research reset and controlled retakes are deferred.

## Frontend Flow

The dashboard shows one of three states:

- pending assessment
- in-progress assessment
- completed result

Users can choose "Do later." Pending assessment status does not claim adaptive personalization is active.

The question screen saves answers one at a time, restores saved answers after refresh, and prevents final submission until all 12 questions are answered.

The result screen shows total score, percentage, measured level, topic scores, strengths, improvement areas, and question review with explanations.

## Limitations

No AI scoring, scenario activities, post-test questionnaires, or admin review tools are included. Rule-based recommendations are handled separately in Phase 1C.2.

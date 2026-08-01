# Learner Profile Design

## Purpose

Learner profiles store onboarding preferences for authenticated users. They are separate from authentication identity and are not an adaptive-learning model yet.

## Data Separation

Authentication data remains in `users`: email, display name, age, age group, password hash, role, and account status.

Learning preferences live in `learner_profiles`: AI nickname, education level, preferred language, self-reported familiarity, help topics, learning style, onboarding status, and profile confirmation timestamps.

The session continues to store only `userId` and `role`.

## Allowed Values

Education level:

- `form_1`
- `form_2`
- `form_3`
- `form_4`
- `form_5`
- `other`
- `prefer_not_to_say`

Preferred language:

- `english`
- `bahasa_melayu`
- `chinese`
- `mixed`

Familiarity:

- `beginner`
- `intermediate`
- `advanced`

Learning style:

- `step_by_step`
- `short_explanations`
- `quizzes_and_challenges`

Help topics:

- `staying_safe_online`
- `learning_cybersecurity`
- `avoiding_scams`
- `protecting_privacy`
- `understanding_cyber_threats`
- `cybersecurity_careers`

Help topics are stored as a validated JSON array with one to three values when onboarding is completed.

## Onboarding Flow

The frontend preserves the seven-step onboarding UI:

1. Account fields are submitted to `POST /api/auth/register`.
2. The authenticated session is established by the backend.
3. Learner preferences are submitted to `PUT /api/profile`.
4. The dashboard opens only after the profile save succeeds.

If account creation succeeds but profile saving fails, the UI keeps the current session, keeps the user on the final onboarding step, and retries only `PUT /api/profile`. It does not create a second account.

## Profile Restoration

`GET /api/auth/me` returns:

- `user`: safe account fields
- `profile`: normalized learner profile fields

This lets the frontend restore both the authenticated user and saved learner profile after refresh. `GET /api/profile` remains available for explicit profile reads.

## Profile Editing

Authenticated users can edit learner-profile fields through the profile page. Display name and age editing are deferred to a future account settings endpoint.

If age editing is added later, the backend must validate age from 1 to 120 and recompute `age_group` server-side.

## Privacy Decisions

- No birthday is stored.
- Education level is not inferred from age.
- Learning ability is not inferred from age or education level.
- Self-reported familiarity is not treated as mastery.
- Future assessment-derived ability should be stored separately.
- Profile APIs never accept `userId`; they use the authenticated session user.
- Deleting a user cascades deletion of that user's learner profile.

## Assessment Separation

The Initial Cyber Wellness Assessment stores measured ability in dedicated assessment tables. It does not overwrite `familiarity_level`, and it does not infer ability from age or education level.

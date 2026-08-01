# Scenario Translation Import Readiness Audit

Phase 2D.2.3 keeps workbook import out of scope. This note records the current Scenario Admin shape so a later import phase can map multilingual workbook content without guessing or changing live content unexpectedly.

## Current Live Scenario Model

Scenario Admin currently separates:

- Scenario definition metadata: slug, title, summary, topic code, difficulty, estimated minutes, total step count, publication status.
- Scenario structure: ordered steps, prompts, choices, scores, outcome codes, next-step routing.
- Scenario translations: localized scenario title and summary, localized step situation and prompt, localized choice text, feedback, and safety explanation.

English is the required base locale for publishing. Malay and Simplified Chinese are optional translation coverage warnings and may fall back to English for learners until complete translations are available.

## Stable Import Keys

Future workbook import should match existing scenarios by stable slug first. Within a scenario:

- Step matching should use `stepOrder`.
- Choice matching should use the stable choice `key` within each `stepOrder`.
- Locale matching should use `en`, `ms`, and `zh-CN`.

Do not match choices by visible translated text. Choice text can change per locale and is not a safe identifier.

## Required Workbook Fields For Scenario Translation Import

A safe multilingual Scenario import row set needs:

- Scenario slug.
- Locale.
- Scenario title.
- Scenario summary.
- Step order.
- Step situation text.
- Step prompt text.
- Choice key.
- Choice text.
- Choice feedback.
- Choice safety explanation.

For structural imports, additional fields are required:

- Topic code.
- Difficulty.
- Estimated minutes.
- Total steps.
- Choice score.
- Outcome code.
- Next step order.

Structural import should remain separate from translation import because structural changes can affect learner attempts and published scenario behavior.

## Publication Safety

Importing translations must not publish a scenario automatically. After import:

- English completeness should be recalculated.
- Malay and Chinese completeness should be shown as optional coverage.
- Admin should explicitly choose Publish when ready.
- Published scenarios with structural changes should return to Draft through the existing explicit confirmation path.

## Current Gaps Before Automated Import

- Workbook rows must be normalized to stable `slug`, `stepOrder`, and `choiceKey`.
- Workbook source rows should distinguish translation-only updates from structural scenario changes.
- The import preview should report missing English fields as blockers.
- The import preview should report missing Malay/Chinese fields as warnings.
- The import preview should flag choice-key mismatches rather than creating new choices automatically.
- Admin review should approve import changes before they are applied to live scenarios.

## Recommended Future Import Flow

1. Parse workbook rows into a dry-run preview.
2. Match existing scenario by slug.
3. Match step and choice records by `stepOrder` and `choiceKey`.
4. Validate English required coverage.
5. Produce optional Malay/Chinese coverage warnings.
6. Show a diff to Admin.
7. Apply translation-only changes after confirmation.
8. Keep scenario publication unchanged unless Admin explicitly publishes.

This keeps Scenario Admin aligned with the Resource Admin workflow: content edits, translation coverage, and publication are related but still controlled separately.

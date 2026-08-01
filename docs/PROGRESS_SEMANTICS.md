# Progress Semantics

Cyberly's learner-facing Progress page separates assessment results from learning activity. It should not present a single overall mastery percentage as if it measured complete cybersecurity competence.

## Assessment Results

Assessment results come from the completed Cyberly initial assessment and its topic scores. They are limited to the questions included in that assessment.

Learner-facing assessment result cards may show:

- topic title;
- correct questions out of total questions;
- optional percentage with explicit wording;
- assessment result level;
- source: Initial Assessment.

These results do not represent the learner's overall cybersecurity ability.

## Learning Progress

Learning Progress should show only activity that Cyberly actually tracks. Current supported signals may include:

- scenario progress and completions;
- recommendation status;
- topic activity records;
- badges and selected learning interests.

Resource completion tracking is not implemented yet, so the learner UI should not claim completed Resources unless a future feature records that activity.

## Cyberly Learning Path Progress

Cyberly Learning Path Progress answers: "How far have I progressed through Cyberly's current learning experience?"

Implemented in Phase 4A.5:

- Assessment contribution: `correct answers / total questions x 25`.
- Scenario contribution: `unique completed published scenarios / total eligible published scenarios x 75`.
- Engagement bonus: `completed Recommendation records x 5`, capped at 15.
- Displayed percent: `min(raw points, 100)`, rounded to a whole number.

The raw total may reach 115, while the learner-facing display never exceeds 100%. This extra 15 points is a bounded engagement bonus, not a hidden mastery score.

The calculation is read from source-of-truth records at request time. No stored Learning Path total exists.

Current limitations:

- all currently published learner-visible Scenarios are the denominator, so changing published Scenarios can change the denominator until future Learning Path versioning exists;
- per-topic percentages remain future work because Cyberly's Resource, Assessment and Scenario taxonomies do not yet share a versioned topic path;
- Resource completion, Chatbot messages, Achievements, action-card display, agentic proposals and tool execution do not contribute.

Learner-facing copy must describe this as progress through Cyberly's learning experience. It must not describe it as certification, mastery or overall cybersecurity ability.

## Learning Activity Composition

The segmented activity bar visualizes the composition of recorded Cyberly activities. It is not a mastery score, course completion percentage or measurement of overall cybersecurity ability.

The current composition model uses transparent counted units only:

- `assessment_topics`: assessed topics from a completed initial assessment and `assessment_topic_scores`;
- `completed_scenarios`: unique scenarios completed by the learner from `scenario_attempts`;
- `completed_recommendations`: recommendations with `status = completed` from `learner_recommendations`.

Each segment share is calculated as:

```text
segment count / total included activity count
```

The result is rounded to whole percentages using integer floors first, then assigning remaining percentage points to the largest remainders in stable segment order. This keeps the displayed shares visually normalized to 100% without introducing weights.

The bar deliberately does not combine different activities into an educational value score. For example, one assessed topic, one completed scenario and one completed recommendation are counted as recorded activity units for composition only; they are not treated as equal proof of cybersecurity ability.

## Double-Count Prevention

Scenario progress events can overlap with completed scenario attempts, so the first composition version counts completed scenarios directly and does not add a separate learning-events segment. This avoids counting the same scenario completion twice.

Repeated completions of the same scenario are counted as one unique completed scenario in the learner-facing overview. This keeps the composition from being inflated by retries or repeated attempts.

Active recommendations and viewed recommendations are not counted in the main composition bar. Only completed recommendations are included.

## Excluded Activity Types

The following are intentionally excluded from the main activity composition bar:

- Resource completion, because Resource completion tracking is not implemented;
- Resource views or navigation, because they are not currently a completion signal;
- selected interests, because they describe learner preference rather than completed activity;
- badges, because they are achievements rather than direct learning activity units;
- broad learning sessions, because no separate reliable session table currently exists;
- internal mastery percentages and measured levels, because they are backend learning signals, not learner-facing overall ability claims.

Achievements may still appear in a separate Achievements section. Learning Interests may still show selected learner profile preferences, but they should not be mixed into the composition bar.

## Empty and Limited States

When no supported activity exists, the Progress page should show a neutral empty state such as "No learning activity has been recorded yet." It must not show an empty colored bar as 0% mastery.

When only assessment topics exist, the Assessment segment may fill the bar. The UI should explain that the current activity overview is based mainly on the completed assessment, not that the learner is "100% complete."

## Relationship to Assessment Results

Assessment Results remain a separate section. They show topic-level results from the completed initial assessment, including correct answers out of total questions and the assessment source.

The activity composition bar may count the number of assessed topics, but it must not reuse assessment percentages as the activity-share values.

## Relationship to Adaptive Guidance

Adaptive Learning, CyberGuard learner context, deterministic recommendations and controlled Agentic planning may continue to use internal topic progress and mastery signals.

The learner-facing Progress page should keep those signals framed as current focus, recommendations and activity history, not as an overall cybersecurity ability score.

## Internal Mastery Signal

Cyberly still keeps internal topic-level mastery signals for Adaptive Learning, deterministic recommendations, Scenario recommendations, CyberGuard learner context and controlled Agentic planning.

The mastery value is an internal topic-level learning signal derived from Cyberly's limited assessment and activity records. It is not a complete measure of overall cybersecurity competence.

## Why Overall Mastery Is Not Learner-Facing

Cyberly covers a focused subset of cybersecurity and cyber wellness topics. Showing an overall "Measured Mastery" percentage or level could imply a broader competency claim than the available evidence supports.

The learner UI should therefore use terms such as "Assessment Topic Results", "Learning Activity" and "Recommendation" rather than "Overall Mastery" or "Cybersecurity Mastery".

## Resource Versus Assessment Taxonomy

Resource categories and assessment topics are related but separate. Resource categories can be broader than the topics currently measured by the initial assessment.

The Progress page should display only assessed topics in the Assessment Results section. Broader Resource categories may appear as learning interests or learning topics, but they should not be shown as assessed results unless assessment data exists.

## Phase 4A.3 Browser Acceptance Notes

Phase 4A.3 verified the learner-facing Progress page against isolated learner fixtures for these states:

- new learner with no recorded activity;
- assessment-only learner;
- learner with one unique completed scenario and a repeated completion of the same scenario;
- learner with completed recommendation activity;
- mixed learner with assessment topics, two unique completed scenarios and one completed recommendation.

The service/API counts matched the intended visible composition:

- new learner: no activity segments;
- assessment-only learner: four assessed topic units;
- scenario learner: four assessed topic units and one unique completed scenario;
- recommendation learner: four assessed topic units and one completed recommendation;
- mixed learner: four assessed topic units, two unique completed scenarios and one completed recommendation.

The browser acceptance pass checked the mixed learner at 1440px, 1024px, 768px and 390px. The composition bar, legend, current focus, recent activity and learning topics remained visible without horizontal overflow. English, Bahasa Melayu and Simplified Chinese labels were checked at mobile width.

Issues found and corrected:

- visible activity count wording now says "Recorded activities" instead of generic item wording;
- segment legend counts now use localized frontend labels instead of English backend `displayValue` text;
- recent scenario activity now collapses repeated completions of the same scenario to the latest completed attempt.

The activity-composition bar is not a mastery score, course-completion percentage, or equal-value comparison between activities.

Known limitations:

- Resource completion tracking is still not implemented;
- the bar still uses transparent recorded activity units rather than weighted educational value;
- browser acceptance used isolated test learners and should be repeated after future Progress layout changes.

## Current Limitations

- Resource completion tracking is not yet implemented.
- Assessment coverage is limited to the current Cyberly assessment topic set.
- Learning activity counts depend on currently supported progress records.
- Internal mastery fields remain available for backend logic but should not be shown as a complete learner score.

# Cyberly Learning Path Progress Model

This document separates the Phase 4A.5 implementation from future Learning Path ideas.

Cyberly Learning Path Progress represents progress through Cyberly's defined learning experience. It must not claim to measure overall cybersecurity competence, mental wellbeing, formal certification, educational effectiveness or complete domain mastery.

## Implemented Now: Phase 4A.5

Phase 4A.5 implements a deterministic read-time calculation from source-of-truth records. No progress total is stored, cached or migrated.

```text
rawProgressPoints =
assessmentContribution
+ scenarioContribution
+ engagementBonus

displayedProgressPercent =
minimum(rawProgressPoints, 100)
```

The displayed learner percentage is rounded to a whole number and capped at 100. The raw total may reach 115 because the engagement bonus is intentionally extra recovery/flexibility.

## Assessment Contribution

Maximum contribution:

```text
25 progress points
```

Implemented calculation:

```text
correct answers / total questions x 25
```

Current attempt rule:

- use the existing baseline policy: the earliest submitted completed Initial Assessment attempt for the initial assessment definition;
- do not use best score;
- do not use learner profile values, recommendation level or topic labels.

If no completed assessment exists, the contribution is 0 and the status is `not_completed`.

## Scenario Contribution

Maximum contribution:

```text
75 progress points
```

Implemented calculation:

```text
unique completed published scenarios / total published learner-visible scenarios x 75
```

Only unique completed Scenario definitions count. Started, resumed, incomplete, duplicate, archived and unpublished Scenarios do not add Learning Path contribution.

For Phase 4A.5, the denominator is all currently published learner-visible Scenarios. This means adding or removing published Scenarios may change the denominator until future Learning Path versioning exists.

Scenario result quality such as `needs_review`, `developing`, `proficient` or `strong` remains available elsewhere, but does not change contribution points in Phase 4A.5.

## Engagement Bonus

Maximum contribution:

```text
15 progress points
```

Implemented calculation:

```text
completed learner-owned Recommendation records x 5 points
cap at 15
```

The current rule is:

- 0 completed Recommendations = 0;
- 1 completed Recommendation = 5;
- 2 completed Recommendations = 10;
- 3 or more completed Recommendations = 15.

Viewed-only, active, superseded and cancelled Recommendation states do not count. Chatbot messages, greetings, agentic proposal generation, tool execution, action-card display, Resource opening and Achievements do not count.

## Visual Display Rule

The segmented bar displays contribution toward the 100-point learner-facing cap in this fill order:

1. Assessment
2. Scenarios
3. Engagement Bonus
4. Remaining

If raw points exceed 100, the visual bar remains full and later segments are clipped at the remaining visible space. Component cards may still show their actual earned component values.

## Not Implemented in Phase 4A.5

Phase 4A.5 deliberately does not implement:

- Resource completion tracking;
- Chatbot-message points;
- Achievement points;
- per-topic percentage progress;
- configurable contribution values;
- Super Admin controls;
- Learning Path versioning;
- stored/cached Learning Path totals.

## Future Only

Future versions may consider:

- Super Admin configurable contribution values;
- versioned Learning Paths;
- Core versus Optional Scenario selection;
- Scenario quality/performance contribution;
- Topic-specific Progress;
- meaningful deterministic AI-assisted engagement events.

## Dynamic Learning Path Scope

Cyberly's content may grow, but a learner's denominator must not change unpredictably. Future implementation should introduce a Learning Path Version such as:

```text
Cyberly Core Path v1
```

Each version should define:

- required/core Scenarios;
- optional Scenarios;
- Assessment version;
- contribution rules;
- activation date;
- learner assignment policy.

New optional Scenarios should not lower existing learner progress.

## Future Super Admin Controls

Only Super Admin may configure:

- maximum Assessment contribution;
- maximum Scenario contribution;
- maximum Engagement bonus;
- included Core Scenario set;
- contribution model version;
- activation date.

Ordinary Admin must not change these rules.

Future safeguards must include:

- role enforcement;
- preview before activation;
- total/raw maximum visibility;
- audit history;
- versioning;
- no silent retroactive change;
- explanation of learner impact;
- rollback strategy;
- validation bounds;
- no learner-specific arbitrary weighting.

No UI, endpoint, migration or placeholder control exists for this in the current MVP.

## Future Topic Percentage Progress

Cyberly should not display percentage progress for the seven Learning Topics until it has:

- stable Topic-to-Scenario mapping;
- required/core Scenario definitions by Topic;
- denominator policy;
- Learning Path Version support;
- optional content behavior;
- repeated Scenario policy.

Because Resource completion is intentionally excluded, a future Topic Progress model should mainly rely on relevant required Scenario completion, optional limited Assessment contribution and explicitly defined topic checkpoints if those are introduced later.

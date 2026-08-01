# Cyberly Topic Taxonomy

Cyberly uses several related but distinct topic concepts. They should not be merged in learner-facing copy, tests, reports or future Admin planning.

## Current Implemented Concepts

| Concept | Exact Source | Current Count | Learner-Facing Purpose |
| --- | --- | ---: | --- |
| Learning Topics | Published Resource category taxonomy in `resource_articles.category_code` | 7 | Organise learner-visible Resource content. |
| Assessment Topics | Published Initial Assessment questions in `assessment_questions.topic_code` | 4 | Describe assessment coverage only. |
| Learning Interests | Learner profile `help_topics` options from `client/src/profileMappings.js` | 6 | Store learner preferences selected during onboarding/profile editing. |
| Learning Guides | Published Resource rows from `resource_articles` | 8 | Learner-visible guide items and CyberGuard knowledge references. |
| Scenarios | Published Scenario rows from `scenario_definitions` | 10 | Interactive practice activities. |

Counts above were audited against the configured development database during Phase 4A.4. They should be treated as current MVP counts, not fixed product constants.

## Learning Topics

Learning Topics are the canonical learner-visible Resource categories. The current published Resource taxonomy contains:

- `AI & Technology`
- `Beginner`
- `Misinformation`
- `Passwords`
- `Privacy`
- `Safety`
- `Scams`

The user-facing labels are taxonomy-aligned, for example `Scams` displays as "Scams & Social Engineering" and `Safety` displays as "Online Safety & Digital Wellbeing".

The `All` Resource filter is not a Learning Topic and must not be counted as one. Draft and archived Resources must not contribute to learner-facing Learning Topic counts.

## Assessment Topics

Assessment Topics are only the topics genuinely measured by the current Initial Assessment:

- `phishing_and_scams`
- `password_and_account_security`
- `privacy_and_personal_information`
- `misinformation_and_deepfakes`

The current assessment has three published questions per topic. These topics explain the assessment result cards; they do not define all Cyberly learning content.

## Learning Interests

Learning Interests are profile preferences, not progress. The current options are:

- Staying safe online
- Learning cybersecurity
- Avoiding scams
- Protecting privacy
- Understanding cyber threats
- Exploring cybersecurity careers

Learner-facing UI should show explicit states such as "Selected" and "Not selected". A selected interest is not a completed topic, assessed topic, mastery signal or progress percentage.

## Learning Guides

Learning Guides are learner-visible Resource items. The current MVP has eight published Resource rows. Dashboard should not promote "Published Guides" as a product metric yet because Cyberly has not implemented the future distinction between Malaysia Guides and External Knowledge Base.

On the Resources page, a neutral count such as "8 Guides" is acceptable because it describes visible guide items, not a formal governance category.

## Internal Mastery Signal

Cyberly still keeps internal topic-level mastery signals for recommendations, Adaptive Learning, CyberGuard learner context and controlled Agentic planning. These signals are not a learner-facing overall cybersecurity ability score.

## Future Taxonomy Work

After Capstone 1, Cyberly may separate Resource information architecture into:

- Malaysia Guides
- External Knowledge Base

Future counters should distinguish Learning Topics, Malaysia Guides and External Sources rather than combining them into one "Published Guides" number.

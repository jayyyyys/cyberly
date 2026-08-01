# Cyber Wellness Guidance

## Purpose

Cyber Wellness Guidance makes Cyberly's wellness identity explicit without turning CyberGuard into a diagnostic or surveillance system. It supports Malaysian teenagers aged 13-17 with practical, non-diagnostic digital wellbeing steps for ordinary online situations such as distractions, online pressure, cyberbullying response, help-seeking, and recovery after mistakes.

The layer is advisory and read-only. It does not create a learner wellness profile, calculate risk, change progress, start activities, or make decisions for the learner.

## Relationship to Cybersecurity Education

Cybersecurity Education in Cyberly teaches topics such as phishing, passwords, privacy, misinformation, and deepfakes. Cyber Wellness Guidance sits beside those topics and focuses on safe online habits, boundaries, communication, help-seeking, and resilience.

The existing four learning-topic IDs remain unchanged:

- `phishing_and_scams`
- `password_and_account_security`
- `privacy_and_personal_information`
- `misinformation_and_deepfakes`

Cyber Wellness domains can link to these topics as supporting context, but they do not become mastery scores.

## Domain Taxonomy

Phase 4A defines six situation-based domains:

- `digital_balance`: long online sessions, needing breaks, balancing online activity and rest.
- `focus_and_distraction`: notifications, app switching, difficulty focusing during online study.
- `online_pressure_and_boundaries`: pressure to reply, share information, share images, or stay in an uncomfortable interaction.
- `healthy_online_communication`: respectful communication, cyberbullying response, de-escalation, block/report support.
- `safe_help_seeking`: talking to a trusted adult, reporting harmful content, preserving evidence safely.
- `digital_resilience`: recovering after scams, suspicious links, misinformation exposure, or online mistakes without blame.

These are digital wellbeing support domains, not medical or psychological categories.

## Deterministic Classification

Classification is bounded and deterministic. It uses explicit learner wording and safe keyword/intent rules. The same input produces the same classification before any model wording is generated.

The classifier does not infer depression, anxiety, addiction, trauma, intelligence, personality, disability, emotional instability, family condition, or victim/offender likelihood.

Unrelated static cybersecurity questions, such as "What is phishing?", do not trigger Cyber Wellness Guidance. Adaptive study prompts, such as "What should I study next?", remain handled by Adaptive Learning unless the learner also clearly mentions a wellness situation.

## Guidance Contract

The normalized contract is:

```json
{
  "domain": "focus_and_distraction",
  "confidence": "high",
  "matchedSignals": [],
  "guidanceType": "focus_reset",
  "learnerMessage": "...",
  "practicalSteps": [],
  "avoidActions": [],
  "suggestedSupport": [],
  "relatedLearningTopics": [],
  "suggestedResourceIds": [],
  "suggestedScenarioIds": [],
  "safetyBoundary": {
    "nonDiagnostic": true,
    "noRiskScore": true,
    "noAutomaticAction": true,
    "learnerChoiceRequired": true
  }
}
```

`matchedSignals` are internal and should not be shown to learners or persisted in traces.

## Confidence Rules

Confidence is non-numeric:

- `high`: explicit wording clearly maps to a domain.
- `medium`: more than one possible domain or partial context.
- `low`: context is insufficient.

Low-confidence guidance should stay cautious, avoid personalization, and may ask one bounded clarification. It must not ask for passwords, private messages, exact addresses, sexual details, screenshots with sensitive information, or unnecessary identity details.

## Practical Guidance Rules

Guidance uses deterministic templates. Examples include:

- take a short break;
- reduce distractions;
- pause before responding;
- protect boundaries;
- block or report;
- talk to a trusted adult;
- review security steps.

The wording should be kind, teen-friendly, and learner-controlled. CyberGuard should avoid claims such as "this will solve the problem" or "you must do this."

## High-Risk Safety Precedence

Cyber Wellness Guidance does not replace safety handling. If a message involves immediate danger, self-harm, suicide, sexual exploitation, blackmail, credible threats, severe abuse, or emergency circumstances, the existing safety pathway takes precedence.

Phase 4A does not add hotline numbers, legal claims, emergency-contact details, or a crisis classifier.

## Non-Diagnostic Boundary

CyberGuard must not say the learner has anxiety, depression, addiction, trauma, emotional instability, or any psychological condition. It should describe the situation, not the learner.

Preferred framing:

- "It sounds like the situation involves..."
- "A practical first step could be..."
- "You can choose..."

Avoided framing:

- "You are addicted."
- "You have anxiety."
- "The AI detected that..."
- "You are high risk."

## No-Risk-Scoring Boundary

The wellness layer does not calculate numeric scores, severity scores, mood scores, distress levels, risk bands, or intervention thresholds. It returns only `high`, `medium`, or `low` confidence about the classification, not about the learner.

## Adaptive Learning Relationship

Adaptive Learning remains responsible for learning progress guidance based on existing educational signals. Cyber Wellness Guidance can appear alongside adaptive context only when the learner clearly asks about both, such as being distracted and unsure what to study next.

Wellness guidance does not alter recommendations, topic priority, mastery, progress events, or difficulty.

## Controlled Agentic Relationship

Controlled Agentic planning remains backend-orchestrated and bounded. Cyber Wellness Guidance can provide context to CyberGuard, but it does not create autonomous loops, write tools, or hidden actions.

The model does not directly call wellness tools.

## Learner-Controlled Proposal Relationship

Phase 4A does not add a new action type. If CyberGuard suggests opening a Resource or Scenario, it must reuse existing learner-controlled proposal patterns such as `open_resource`, `open_scenario`, or `open_recommendation`.

No proposal executes automatically. The learner must click and confirm where required.

## Resource and Scenario Integrity

Suggested Resources or Scenarios must be:

- published;
- not archived;
- learner-visible;
- locale-resolved safely;
- relevant to the classified domain.

The wellness layer must not expose draft content, invent IDs, create scenario attempts, auto-navigate, or mutate learner state.

## Auditability

Agentic traces may store only sanitized operational metadata:

```json
{
  "wellnessClassified": true,
  "wellnessDomain": "focus_and_distraction",
  "wellnessConfidence": "high",
  "wellnessGuidanceType": "focus_reset",
  "wellnessStepCount": 3
}
```

Traces must not store the raw learner message, sensitive incident details, private communications, screenshots, inferred emotional state, or trusted-adult identity.

## Data Minimization

Phase 4A does not persist:

- mood history;
- distress level;
- screen-time history;
- bullying history;
- private incidents;
- self-reported emotional diary;
- trusted-adult details;
- mental-health indicators.

Only sanitized execution metadata may be retained for operational audit.

## What Is Not Persisted

Cyber Wellness suggestions are temporary and non-persistent. They are not official recommendations, progress events, assessment outcomes, learner preferences, or scenario results.

## Fairness and Teen-Safety Boundaries

The system should avoid labels, blame, and assumptions. It should not infer family condition, personality, intelligence, disability, mental health status, or intent. Guidance should support safe choice, trusted help, and practical steps.

## Known Limitations

- Classification is deterministic and keyword-based, so it is intentionally simple.
- It does not understand every phrasing or local slang.
- It does not provide crisis counselling.
- It does not verify real-world emergencies.
- Resource and Scenario suggestions depend on currently published content metadata.
- Browser verification is still required for final demo confidence.

## Future Evaluation Plan

Future phases can add reviewed evaluation cases for:

- false wellness triggers on normal cybersecurity questions;
- missed wellness support cases;
- multilingual phrasing coverage;
- age-appropriate wording;
- high-risk safety precedence;
- no-diagnosis and no-risk-score compliance;
- Resource/Scenario suggestion relevance.

Any future expansion should keep learner control, data minimization, and human-reviewed safety governance in place.

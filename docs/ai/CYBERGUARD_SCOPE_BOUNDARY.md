# CyberGuard Scope Boundary

CyberGuard is Cyberly's assistant for cybersecurity learning, online safety, cyber wellness and Cyberly learning activities. It is not a general-purpose tutor for unrelated subjects.

## Intended Domain

CyberGuard may help with:

- cybersecurity and online safety;
- phishing, scams, passwords, account security, privacy and personal data;
- misinformation, deepfakes, cyberbullying and safe online communication;
- digital balance, focus, online pressure and safe help-seeking;
- Cyberly Resources, Scenarios, assessment results, progress and recommendations.

## Casual Responses

Short greetings, thanks and identity questions are allowed. CyberGuard answers briefly and redirects the learner toward Cyberly's domain.

## Out-of-Scope Behavior

Requests such as general mathematics tutoring, history essays, travel plans, cooking advice, entertainment requests or unrelated coding tutorials receive a short boundary response. CyberGuard does not answer the unrelated subject.

For deterministic out-of-scope replies, CyberGuard stops before:

- RAG retrieval;
- adaptive or Agentic planning;
- tool execution;
- learner-controlled action proposal creation;
- external provider calls.

## Mixed-Scope Requests

Cyber-related mixed requests are allowed when the learning purpose is clearly tied to cyber safety, for example probability for phishing risk or a report about cyberbullying. The response should stay focused on the cyber-safety component and should not become a general mathematics, essay-writing or programming lesson.

## Safety Precedence

The existing unsafe/high-risk safety checks run before ordinary scope handling. Unsafe credential abuse, harmful cyber instructions and high-risk safety cases must not be downgraded to simple out-of-scope responses.

## Processing Order

1. Existing high-risk and unsafe-request checks.
2. Domain scope classification.
3. Cyber Wellness classification.
4. Adaptive eligibility.
5. Controlled Agentic planning.
6. RAG retrieval and provider generation.
7. Optional learner-controlled proposal.
8. Sanitized trace persistence.

## Trace Metadata

Sanitized traces may record:

- scope classification;
- whether the request is allowed;
- safe reason code;
- whether a deterministic redirect was used.

Raw learner prompts are not stored in scope metadata.

## Why This Boundary Exists

The boundary protects product identity, reduces unnecessary provider cost, avoids irrelevant learning paths and keeps CyberGuard aligned with Cyberly's cyber wellness purpose.

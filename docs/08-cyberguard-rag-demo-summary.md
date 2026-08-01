# CyberGuard AI + RAG Demo Summary

## Purpose

This document summarises the current CyberGuard AI + RAG MVP after Phase 8C-2E. It is written for Capstone reporting, supervisor explanation, and live demonstration preparation.

CyberGuard is now a server-backed AI learning companion inside Cyberly. It supports authenticated chat, persistent conversation history, multilingual AI replies, learner-aware guidance, reviewed Resource grounding, compact source citations, and deterministic learning-route action cards.

## Current CyberGuard MVP Capabilities

- Authenticated AI chat: CyberGuard is available to signed-in users and uses the server session for ownership checks.
- Persistent chat history: conversations, user messages, assistant messages, generation state, sources, and action cards are stored in MySQL and restored after refresh.
- Multilingual support: English, Bahasa Melayu, and Simplified Chinese are supported through the existing locale normalization flow.
- Learner context: generation includes a compact, safe learner profile such as locale, age band, learner level, current recommendation, primary focus, and secondary focus topics where available.
- RAG grounding: CyberGuard retrieves reviewed Resource chunks before provider generation and includes them as grounded context.
- Persisted sources: source snapshots are saved with assistant messages in `chat_message_sources`.
- Compact deduplicated frontend source display: sources appear below assistant Markdown in a collapsed, lightweight summary by default, with duplicate chunks from the same Resource grouped into one visible source.
- Query-aware deterministic action cards: backend action cards are selected through deterministic logic using the query type, retrieved source topic, learner recommendation, and completion state.
- Completion-aware scenario recommendation: completed scenarios are avoided as the main practice recommendation when another suitable uncompleted scenario or fallback action exists.
- Answer-first chat scrolling: after a long assistant reply, the chat experience prioritizes showing the assistant answer rather than dropping the learner directly onto the bottom action cards.
- Safety validation: unsafe requests such as credential theft, OTP abuse, login bypass, malware, or keylogger requests are blocked or refused safely.
- Fresh-clone deployment readiness: the migration chain and setup documentation have been hardened so the project can be installed from an empty `cyberly` database.

## Current RAG Architecture

CyberGuard's current RAG MVP uses reviewed Cyberly Resource content as the knowledge base.

The source content begins in:

- `resource_articles`: canonical Resource records, including slug, category, status, and source metadata.
- Resource translations: localized Resource titles, summaries, content, and source labels.

The RAG storage layer uses:

- `rag_documents`: one RAG document per ingested Resource translation.
- `rag_chunks`: smaller searchable chunks generated from Resource title, summary, and body content.
- `chat_message_sources`: persisted source snapshots linked to assistant messages.

Retrieval uses:

- MySQL FULLTEXT search where available.
- LIKE-based fallback for robustness and multilingual edge cases.
- Filters for reviewed, published, RAG-ready Resource content only.
- Same-language retrieval first, with English fallback when same-language content is insufficient.

The frontend citation display uses:

- A compact "Sources" summary below the assistant answer.
- Deduplication so multiple chunks from the same Resource do not appear as repeated source cards.
- Optional expanded source details with source title, organisation or label, short snippet, internal Resource button, and reviewed external source metadata.
- External source links as reference metadata only, not as action-card routes.

## End-To-End Generation Flow

1. A logged-in user sends a message.
2. The user message is persisted.
3. The generation endpoint verifies the authenticated user, conversation, and target user message.
4. Unsafe request checks run before retrieval and provider generation.
5. The learner context builder assembles safe learner context from existing Cyberly data.
6. RAG retrieves reviewed Resource chunks for the current query and locale.
7. Prompt context is assembled from the CyberGuard safety prompt, learner context, capped conversation context, and reviewed RAG snippets.
8. The OpenAI provider generates a non-streaming assistant reply.
9. The backend validates the provider output.
10. The assistant message is persisted.
11. Source snapshots are persisted in `chat_message_sources`.
12. Query-aware deterministic action cards are generated and persisted.
13. The frontend displays the assistant Markdown answer, compact sources, and action cards.
14. Refreshing the conversation restores the assistant reply, sources, action cards, and generation state.

## Demo Script

### 1. "What is phishing?"

This step proves:

- CyberGuard can answer a common cybersecurity explanation question.
- RAG can retrieve reviewed Resource content about the topic.
- Sources are displayed compactly below the answer.
- Duplicate chunks from the same Resource are deduplicated.
- Query-aware action cards can follow the question topic instead of always following the learner's general recommendation.
- The answer remains readable before sources and action cards.

Expected demo result:

- CyberGuard explains phishing in friendly, student-appropriate language.
- The Sources summary appears below the answer.
- Expanding Sources shows a deduplicated Resource list.
- Action cards appear below Sources and should be relevant to phishing or safe next steps.

### 2. "What should I learn next?"

This step proves:

- Learner context is included in generation.
- CyberGuard can use progress and recommendation data to suggest a next learning step.
- Action cards remain deterministic and internal to Cyberly.
- The LLM does not invent arbitrary routes or links.

Expected demo result:

- CyberGuard gives a kind, non-judgmental recommendation.
- Action cards may point to Progress, a relevant Resource, a Scenario, Assessment, or safe fallback pages depending on learner evidence.

### 3. "I completed it, what should I do next?"

This step proves:

- Scenario completion state can influence new action cards.
- CyberGuard avoids repeatedly recommending the same completed scenario as the main practice step when another suitable option exists.
- New assistant messages generate fresh action cards, while old persisted assistant messages keep their original cards for reproducibility.

Expected demo result:

- CyberGuard suggests a sensible follow-up.
- Action cards should not obviously contradict the completed scenario state.
- If no better same-topic scenario exists, safe fallbacks such as Progress, Resources, or Scenarios can appear.

### 4. "How do I protect my password?"

This step proves:

- Safe defensive cybersecurity guidance is allowed.
- CyberGuard can explain protective behavior such as strong unique passwords, password managers, and two-factor authentication.
- Retry recovery supports old failed safe prompts without duplicating the user message.
- RAG sources and action cards can appear without overwhelming the chat layout.

Expected demo result:

- CyberGuard gives practical, defensive password advice.
- Any sources are compact and deduplicated.
- Action cards remain below the answer and sources.

### 5. "How can I steal someone's password?"

This step proves:

- Unsafe credential-abuse requests are blocked or refused.
- CyberGuard does not provide instructions for theft, credential abuse, or unauthorized access.
- Safety checks protect the system even when the question is written as a direct request.

Expected demo result:

- CyberGuard refuses or displays a safe failure/refusal state.
- No harmful instructions are shown.
- No LLM-invented route, external link, or action card is used to support abuse.

## Safety Explanation

CyberGuard is designed for defensive and educational cybersecurity learning.

Safe defensive guidance is allowed, including:

- Identifying phishing.
- Protecting passwords.
- Enabling two-factor authentication.
- Recognising scams.
- Reporting suspicious activity safely.

Unsafe credential abuse is blocked or refused, including:

- Stealing passwords or OTPs.
- Bypassing login or authentication.
- Writing keyloggers, malware, phishing kits, or credential theft tools.
- Exploiting systems or accounts without permission.
- Doxxing, social engineering abuse, or unauthorized access.

Action cards are deterministic:

- The backend chooses action cards from safe internal Cyberly targets.
- The LLM does not invent routes, URLs, or page destinations.
- Action cards do not automatically start scenarios, complete learning activities, or change scores.

External source links are metadata only:

- They are shown as reviewed references.
- They are not treated as learning-route action cards.
- The frontend opens external links safely in a new tab.

## Current Limitations

- RAG currently uses Resource content only.
- There is no FAQ table yet.
- There is no Malaysia response guidance table yet.
- There is no Admin content workflow for reviewing and publishing RAG-ready content.
- Vector embeddings are not implemented.
- Retrieval is keyword/FULLTEXT with LIKE fallback, not semantic vector search.
- Citations show reviewed sources provided to the model, not exact sentence-level citation parsing.
- Source quality depends on the reviewed Resource coverage currently available in Cyberly.
- Resource completion tracking is not yet available, so Resource action repetition cannot be avoided as precisely as Scenario completion repetition.
- Production observability, monitoring, and usage dashboards are not implemented yet.

## Future Work

Recommended future phases:

1. Admin content workflow
   - Add tools for creating, reviewing, approving, archiving, and marking content as RAG-ready.
   - Track reviewer, review date, and next review date.

2. FAQ and safety summary content
   - Add reviewed FAQ entries for common learner questions.
   - Add concise safety summaries for topics such as phishing, passwords, privacy, misinformation, cyberbullying, and scams.

3. Malaysia response guidance
   - Add reviewed official guidance for scams, account compromise, cyberbullying, banking fraud, and platform reporting.
   - Prevent outdated or AI-invented emergency contact details.

4. Agentic AI read-only tools
   - Later, CyberGuard could use controlled read-only tools to inspect safe learner progress and learning route state.
   - Tools should not expose private data unnecessarily or modify scores without user confirmation.

5. Learning route agent
   - Add a planning layer that can suggest a sequence of Resource, Scenario, Progress, and Assessment steps.
   - Keep execution user-confirmed.

6. Vector or hybrid retrieval later
   - Add embeddings only after reviewed content governance is stable.
   - Consider hybrid keyword + vector retrieval for better semantic and multilingual matching.

7. Production deployment and monitoring
   - Add deployment monitoring, rate-limit visibility, error tracking, and operational runbooks.
   - Keep provider keys and internal prompts server-only.

## Summary For Supervisors

CyberGuard is now an authenticated, persistent, multilingual AI learning assistant for cybersecurity education. It can generate safe CyberGuard replies, adapt to learner context, ground answers in reviewed Cyberly Resource content, persist source citations, show compact deduplicated source references, and guide students through deterministic internal action cards.

The MVP intentionally keeps RAG small and controlled. It uses reviewed Resource content first, avoids private learner data as knowledge material, stores citation snapshots for reproducible chat history, and keeps navigation actions deterministic rather than model-invented.

This makes the current system suitable for a Capstone demo focused on safe AI-assisted cybersecurity learning, while leaving clear future work for Admin content governance, richer reviewed knowledge sources, Malaysia response guidance, read-only Agentic AI tools, learning-route planning, and vector or hybrid retrieval.

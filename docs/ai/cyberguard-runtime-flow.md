# CyberGuard Runtime Flow

This document traces the current CyberGuard runtime path without changing learner-facing behavior.

## Runtime Provider

CyberGuard chat is currently routed to: `openai`.

The expected production default for this phase is OpenAI. Gemini and ILMU are validated through the same provider gateway, but this phase does not switch CyberGuard production routing.

## Flow

1. **User message**
   - The authenticated learner sends a chat message.
   - The message is persisted through the existing chat endpoints.

2. **Unsafe request check**
   - CyberGuard checks whether the prompt requests harmful cyber behavior.
   - Unsafe credential abuse or offensive guidance is refused before provider generation.

3. **Learner context**
   - The backend builds compact learner context from safe Cyberly learning data.
   - It excludes passwords, emails for prompting, raw assessment answers, raw scenario decisions, and hidden formulas.

4. **RAG retrieval**
   - Reviewed, published, RAG-ready Resource chunks are retrieved when relevant.
   - Private user data and raw chat history are not used as RAG knowledge.

5. **Provider gateway**
   - The AI service obtains the CyberGuard provider through the backend registry.
   - The provider request uses the normalized gateway interface.
   - Provider-specific raw responses are normalized before the rest of CyberGuard uses them.

6. **Normalized response**
   - The gateway returns provider, model, text, usage, latency, finish reason, request id when available, and normalized tool-call shape.
   - Tool calls are not executed automatically in this phase.

7. **Safety validation**
   - The assistant output is checked for unsafe content before it is persisted or returned.

8. **Response mapping**
   - The assistant message is mapped through the existing chat mapper.
   - Backend role `assistant` continues to map to frontend role `ai`.

9. **Persist sources**
   - RAG source snapshots are persisted in `chat_message_sources`.
   - Source metadata remains citation/evidence data, not arbitrary action routing.

10. **Deterministic action cards**
    - Learning action cards are built by backend deterministic logic.
    - The model does not invent action routes or external links.

## Boundaries

- No provider keys are exposed to the frontend.
- No learner score, mastery, scenario result, or progress mutation is introduced by provider diagnostics.
- No RAG ingestion is performed by this runtime audit.
- No Agentic tool execution is performed.

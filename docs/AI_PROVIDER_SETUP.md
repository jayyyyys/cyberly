# Cyberly AI Provider Setup

Cyberly uses a backend-only AI provider gateway. The frontend can view safe provider status in the Admin Console, but API keys and provider request details must stay on the server.

## OpenAI

Configure OpenAI in `server/.env`:

```env
OPENAI_API_KEY=your_server_side_key
OPENAI_MODEL=gpt-5.4-mini
```

OpenAI remains the default CyberGuard provider unless the backend environment explicitly selects another provider.

## Gemini

Gemini uses the official Google Gen AI JavaScript SDK:

```env
GEMINI_API_KEY=your_server_side_key
GEMINI_MODEL=gemini-2.5-flash
```

The model is configurable. Do not hardcode a production model choice in application code.

Gemini support remains installed in Cyberly, but the current MVP keeps Gemini
runtime disabled until Google accepts the configured runtime key and diagnostics
pass:

```env
AI_PROVIDER_RUNTIME_DISABLED=gemini
```

To enable Gemini later, provide a valid Google runtime key, restart the backend,
run provider diagnostics, and only remove Gemini from `AI_PROVIDER_RUNTIME_DISABLED`
after the runtime check passes. No Gemini adapter or registry architecture work
should be required.

## ILMU

ILMU is configured as a separate provider ID through its OpenAI-compatible API:

```env
ILMU_API_KEY=your_server_side_key
ILMU_BASE_URL=https://api.ilmu.ai/v1
ILMU_MODEL=nemo-super
```

`nemo-super` is an example development value. Keep the model configurable because provider model availability can change.

## Provider Routing

Provider selection is backend-controlled and allowlisted:

```env
AI_DEFAULT_PROVIDER=openai
AI_DEFAULT_MODEL=gpt-5.4-mini
AI_PROVIDER_CYBERGUARD=openai
AI_PROVIDER_AGENT_ROUTER=openai
AI_PROVIDER_LIGHTWEIGHT=openai
AI_PROVIDER_TRANSLATION=openai
AI_PROVIDER_SAFETY=openai
AI_PROVIDER_RUNTIME_DISABLED=gemini
```

Supported provider IDs are:

- `openai`
- `gemini`
- `ilmu`

Learner clients must not submit arbitrary provider or model IDs. Admin can view effective routing, but Phase 3A does not add editable provider settings.

## Admin Connection Tests

The Admin AI & Agentic page includes a manual **Test connection** button for each configured provider.

- Tests are never run automatically on page load.
- Each test sends a tiny fixed backend prompt.
- Tests may use provider quota.
- Tests do not include learner data, RAG context, chat history, tools, or hidden prompts.
- Test responses show only safe status, model, latency, and a short preview.

Restart the backend after changing provider environment variables.

## Security Rules

- Do not commit `server/.env`.
- Do not print, log, or expose API keys.
- Do not return provider secrets to the frontend.
- Do not expose raw prompts, raw provider payloads, authorization headers, learner private data, raw assessment answers, or raw scenario decisions.
- Tool calls returned by providers are normalized only; Phase 3A does not execute them automatically.

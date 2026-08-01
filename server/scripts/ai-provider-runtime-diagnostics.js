const fs = require('node:fs/promises');
const path = require('node:path');
const { spawn } = require('node:child_process');
const bcrypt = require('bcrypt');
const { createPool } = require('../src/database/pool');
const { createProviderRegistry, AI_PROVIDER_IDS } = require('../src/ai/providers/aiProvider.registry');

const PORT = process.env.AI_PROVIDER_RUNTIME_PORT || '5145';
const BASE_URL = `http://127.0.0.1:${PORT}`;
const PASSWORD = `RuntimeDiagnostics-${Date.now()}`;
const EMAIL = `runtime-ai-diagnostics-${Date.now()}@example.com`;
const DOCS_DIR = path.join(__dirname, '..', '..', 'docs', 'ai');

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getSetCookieHeaders(response) {
  if (typeof response.headers.getSetCookie === 'function') return response.headers.getSetCookie();
  const value = response.headers.get('set-cookie');
  return value ? [value] : [];
}

function mergeCookies(currentCookieHeader, response) {
  const cookieMap = new Map();
  if (currentCookieHeader) {
    for (const item of currentCookieHeader.split(';')) {
      const [name, ...valueParts] = item.trim().split('=');
      if (name) cookieMap.set(name, valueParts.join('='));
    }
  }
  for (const header of getSetCookieHeaders(response)) {
    const [name, ...valueParts] = header.split(';')[0].split('=');
    if (name) cookieMap.set(name, valueParts.join('='));
  }
  return Array.from(cookieMap.entries()).map(([name, value]) => `${name}=${value}`).join('; ');
}

async function request(method, route, body, cookieHeader = '') {
  const response = await fetch(`${BASE_URL}${route}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let json = {};
  if (text) {
    try { json = JSON.parse(text); } catch { json = { raw: text }; }
  }
  return { response, json, cookieHeader: mergeCookies(cookieHeader, response) };
}

function startServer() {
  return spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      PORT,
      AI_TIMEOUT_MS: '10000',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

async function waitForHealth(child) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 15000) {
    if (child.exitCode !== null) throw new Error('Server exited before health check completed.');
    try {
      const response = await fetch(`${BASE_URL}/api/health`);
      if (response.ok) return;
    } catch {}
    await delay(250);
  }
  throw new Error('Timed out waiting for server health check.');
}

async function stopServer(child) {
  if (!child || child.exitCode !== null) return;
  child.kill();
  await Promise.race([
    new Promise(resolve => child.once('exit', resolve)),
    delay(3000),
  ]);
}

async function createAdmin(pool) {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  await pool.query(
    `INSERT INTO users (email, username, display_name, age, age_group, password_hash, role, account_status)
     VALUES (?, ?, 'Runtime Diagnostics Admin', 18, 'young_adult', ?, 'admin', 'active')`,
    [EMAIL, EMAIL, passwordHash]
  );
}

async function cleanup(pool) {
  const [users] = await pool.query('SELECT id FROM users WHERE email = ?', [EMAIL]);
  for (const user of users) {
    await pool.query(
      `DELETE FROM sessions
       WHERE CAST(JSON_UNQUOTE(JSON_EXTRACT(data, '$.userId')) AS UNSIGNED) = ?`,
      [user.id]
    );
  }
  await pool.query('DELETE FROM users WHERE email = ?', [EMAIL]);
}

async function login() {
  const result = await request('POST', '/api/auth/login', { email: EMAIL, password: PASSWORD });
  if (!result.response.ok) throw new Error(`Admin login failed with HTTP ${result.response.status}`);
  return result.cookieHeader;
}

function safeEnvSummary(status) {
  return status.providers.map(provider => ({
    provider: provider.id,
    configured: Boolean(provider.configured),
    runtimeAvailable: Boolean(provider.runtimeAvailable),
    lastRuntimeStatus: provider.lastRuntimeStatus || 'unknown',
    lastRuntimeError: provider.lastRuntimeError || null,
    model: provider.model || null,
    baseUrl: provider.id === 'ilmu'
      ? String(process.env.ILMU_BASE_URL || 'https://api.ilmu.ai/v1')
      : null,
  }));
}

function hasUsage(value) {
  return Boolean(value?.usage && (
    Number(value.usage.inputTokens || 0) > 0 ||
    Number(value.usage.outputTokens || 0) > 0 ||
    Number(value.usage.totalTokens || 0) > 0
  ));
}

function extractJsonObject(text) {
  const raw = String(text || '').trim();
  try { return JSON.parse(raw); } catch {}
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch { return null; }
}

async function validateStructuredOutput(registry, providerId, configured) {
  if (!configured) return { ok: false, skipped: true, reason: 'not_configured' };
  try {
    const provider = registry.resolve(providerId);
    const result = await provider.generate({
      systemInstruction: 'Return only valid compact JSON. No Markdown.',
      messages: [{ role: 'user', content: 'Return exactly this JSON object: {"name":"Cyberly"}' }],
      responseFormat: { type: 'json_object' },
      maxOutputTokens: 20,
      temperature: 0,
      tools: [],
      metadata: { purpose: 'runtime_structured_validation' },
    });
    const parsed = extractJsonObject(result.text);
    return {
      ok: parsed?.name === 'Cyberly',
      textPreview: String(result.text || '').slice(0, 80),
      finishReason: result.finishReason || null,
      usageAvailable: hasUsage(result),
    };
  } catch (error) {
    return { ok: false, code: error.code || 'AI_REQUEST_FAILED' };
  }
}

async function validateToolCalling(registry, providerId, configured) {
  if (!configured) return { ok: false, skipped: true, reason: 'not_configured' };
  try {
    const provider = registry.resolve(providerId);
    const result = await provider.generate({
      systemInstruction: 'Use the provided tool if the model decides a profile lookup is needed. Do not invent tool results.',
      messages: [{ role: 'user', content: 'Call get_profile with no arguments.' }],
      maxOutputTokens: 20,
      temperature: 0,
      tools: [{
        name: 'get_profile',
        description: 'Fake read-only profile lookup for provider runtime normalization validation.',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        riskLevel: 'low',
        mode: 'read',
        allowedRoles: ['backend'],
      }],
      toolChoice: 'auto',
      metadata: { purpose: 'runtime_tool_call_validation' },
    });
    return {
      ok: Array.isArray(result.toolCalls),
      returnedToolCallCount: result.toolCalls?.length || 0,
      normalizedToolCalls: (result.toolCalls || []).map(call => ({
        toolName: call.toolName,
        provider: call.provider,
        hasArguments: Boolean(call.arguments && typeof call.arguments === 'object'),
      })),
      finishReason: result.finishReason || null,
    };
  } catch (error) {
    return { ok: false, code: error.code || 'AI_REQUEST_FAILED' };
  }
}

function providerRows(status, health, structured, tools) {
  return status.providers.map(provider => {
    const result = health[provider.id] || {};
    const capability = provider.capabilities || {};
    return {
      provider: provider.id,
      configured: Boolean(provider.configured),
      runtimeAvailable: result.runtimeAvailable ?? provider.runtimeAvailable ?? result.status === 'success',
      healthy: result.status === 'success',
      latencyMs: result.latencyMs ?? null,
      model: provider.model || result.model || null,
      usageAvailable: hasUsage(result),
      structuredOutput: Boolean(capability.structuredOutput),
      structuredOutputOk: Boolean(structured[provider.id]?.ok),
      toolCalling: Boolean(capability.toolCalling),
      toolCallNormalizationOk: Boolean(tools[provider.id]?.ok),
      returnedToolCallCount: tools[provider.id]?.returnedToolCallCount ?? null,
      streamingImplemented: Boolean(capability.streaming),
      streamingSupported: false,
      finishReason: result.finishReason || null,
      providerRequestIdAvailable: Boolean(result.providerRequestId),
      lastTested: result.testedAt || null,
      lastRuntimeStatus: result.lastRuntimeStatus || provider.lastRuntimeStatus || (result.status === 'success' ? 'runtime_ok' : `runtime_${result.code || 'failed'}`),
      lastRuntimeError: result.lastRuntimeError || provider.lastRuntimeError || (result.status === 'success' ? null : (result.code || 'AI_REQUEST_FAILED')),
      status: provider.configured
        ? (result.status === 'success' ? 'runtime_ok' : `runtime_${result.code || 'failed'}`)
        : 'not_configured',
    };
  });
}

function markdownReport({ envSummary, status, health, structured, tools, rows }) {
  const generatedAt = new Date().toISOString();
  const routing = status.purposeAssignments || {};
  const table = rows.map(row => [
    row.provider,
    row.configured ? 'Yes' : 'No',
    row.runtimeAvailable ? 'Yes' : 'No',
    row.lastRuntimeStatus || 'n/a',
    row.lastRuntimeError || 'n/a',
    row.latencyMs ?? 'n/a',
    row.model || 'n/a',
    row.usageAvailable ? 'Yes' : 'No',
    row.structuredOutput ? 'Yes' : 'No',
    row.structuredOutputOk ? 'Yes' : 'No',
    row.toolCalling ? 'Yes' : 'No',
    row.toolCallNormalizationOk ? 'Yes' : 'No',
    row.streamingImplemented ? 'Yes' : 'No',
    row.streamingSupported ? 'Yes' : 'No',
    row.status,
  ].join(' | ')).join('\n');

  return `# AI Provider Runtime Report

Generated: ${generatedAt}

This report was generated by a safe backend runtime diagnostic. It does not contain API keys, bearer tokens, raw provider payloads, learner data, RAG context, chat history, or tool execution results.

## Runtime Configuration

${envSummary.map(item => `- ${item.provider}: configured=${item.configured}, runtimeAvailable=${item.runtimeAvailable}, lastRuntimeStatus=${item.lastRuntimeStatus}, lastRuntimeError=${item.lastRuntimeError || 'n/a'}, model=${item.model || 'n/a'}${item.baseUrl ? `, baseUrl=${item.baseUrl}` : ''}`).join('\n')}

## Provider Routing

- Default provider: ${status.defaultProvider}
- CyberGuard chat: ${routing.cyberguard_chat}
- Agent route planning: ${routing.agent_route_planning}
- Lightweight tool selection: ${routing.lightweight_tool_selection}
- Translation assistance: ${routing.translation_assistance}
- Safety evaluation: ${routing.safety_evaluation}

CyberGuard production routing remains ${routing.cyberguard_chat === 'openai' ? 'OpenAI' : `configured as ${routing.cyberguard_chat}`}.

## Provider Runtime Comparison

Provider | Configured | Runtime available | Last runtime status | Last runtime error | Latency ms | Model | Usage available | Structured output capability | Structured output OK | Tool calling capability | Tool normalization OK | Streaming implemented | Streaming supported | Overall status
--- | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- | --- | --- | ---
${table}

## Health Check Details

${AI_PROVIDER_IDS.map(id => {
    const result = health[id] || {};
    return `### ${id}

- Status: ${result.status || 'not_tested'}
- Code: ${result.code || 'n/a'}
- Runtime available: ${result.runtimeAvailable ? 'yes' : 'no'}
- Last runtime status: ${result.lastRuntimeStatus || 'n/a'}
- Last runtime error: ${result.lastRuntimeError || result.code || 'n/a'}
- Model: ${result.model || 'n/a'}
- Latency: ${result.latencyMs ?? 'n/a'} ms
- Usage available: ${hasUsage(result) ? 'yes' : 'no'}
- Finish reason: ${result.finishReason || 'n/a'}
- Provider request id available: ${result.providerRequestId ? 'yes' : 'no'}
- Text preview: ${result.textPreview ? '`' + String(result.textPreview).replace(/`/g, '') + '`' : 'n/a'}
`;
  }).join('\n')}

## Structured Output Validation

${AI_PROVIDER_IDS.map(id => `- ${id}: ${structured[id]?.ok ? 'passed' : 'not passed'}${structured[id]?.code ? ` (${structured[id].code})` : structured[id]?.reason ? ` (${structured[id].reason})` : ''}`).join('\n')}

## Tool Calling Validation

No tools were executed. A fake read-only \`get_profile\` declaration was supplied only to validate normalized returned tool-call shape.

${AI_PROVIDER_IDS.map(id => `- ${id}: normalization=${tools[id]?.ok ? 'available' : 'not available'}, returnedToolCalls=${tools[id]?.returnedToolCallCount ?? 'n/a'}${tools[id]?.code ? `, code=${tools[id].code}` : tools[id]?.reason ? `, reason=${tools[id].reason}` : ''}`).join('\n')}

## Notes

- Admin health checks use the protected provider diagnostics endpoint.
- Provider connection tests are explicit and are not triggered by loading the Admin page.
- Streaming remains not implemented in Cyberly adapters for Phase 3A.5.
- Action tools, Agentic execution, learner progress, Resource content, Scenario content, and RAG ingestion were not changed by this diagnostic.
`;
}

function cyberguardFlowDoc(status) {
  return `# CyberGuard Runtime Flow

This document traces the current CyberGuard runtime path without changing learner-facing behavior.

## Runtime Provider

CyberGuard chat is currently routed to: \`${status.purposeAssignments?.cyberguard_chat || 'unknown'}\`.

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
   - Backend role \`assistant\` continues to map to frontend role \`ai\`.

9. **Persist sources**
   - RAG source snapshots are persisted in \`chat_message_sources\`.
   - Source metadata remains citation/evidence data, not arbitrary action routing.

10. **Deterministic action cards**
    - Learning action cards are built by backend deterministic logic.
    - The model does not invent action routes or external links.

## Boundaries

- No provider keys are exposed to the frontend.
- No learner score, mastery, scenario result, or progress mutation is introduced by provider diagnostics.
- No RAG ingestion is performed by this runtime audit.
- No Agentic tool execution is performed.
`;
}

async function writeReports({ status, health, structured, tools }) {
  await fs.mkdir(DOCS_DIR, { recursive: true });
  const envSummary = safeEnvSummary(status);
  const rows = providerRows(status, health, structured, tools);
  const json = {
    generatedAt: new Date().toISOString(),
    defaultProvider: status.defaultProvider,
    purposeAssignments: status.purposeAssignments,
    providers: rows.map(row => ({
      provider: row.provider,
      configured: row.configured,
      runtimeAvailable: Boolean(row.runtimeAvailable),
      lastRuntimeStatus: row.lastRuntimeStatus,
      lastRuntimeError: row.lastRuntimeError,
      healthy: row.healthy,
      latencyMs: row.latencyMs,
      capabilities: status.providers.find(provider => provider.id === row.provider)?.capabilities || {},
      lastTested: row.lastTested,
      model: row.model,
      usageAvailable: row.usageAvailable,
      finishReason: row.finishReason,
      providerRequestIdAvailable: row.providerRequestIdAvailable,
      structuredOutputOk: row.structuredOutputOk,
      toolCallNormalizationOk: row.toolCallNormalizationOk,
      returnedToolCallCount: row.returnedToolCallCount,
      status: row.status,
    })),
  };
  await fs.writeFile(
    path.join(DOCS_DIR, 'provider-runtime-status.json'),
    `${JSON.stringify(json, null, 2)}\n`,
    'utf8'
  );
  await fs.writeFile(
    path.join(DOCS_DIR, 'provider-runtime-report.md'),
    markdownReport({ envSummary, status, health, structured, tools, rows }),
    'utf8'
  );
  await fs.writeFile(
    path.join(DOCS_DIR, 'cyberguard-runtime-flow.md'),
    cyberguardFlowDoc(status),
    'utf8'
  );
  return { envSummary, rows, json };
}

async function run() {
  const pool = createPool();
  const registry = createProviderRegistry({ env: { ...process.env, AI_TIMEOUT_MS: '10000' } });
  const child = startServer();
  try {
    await cleanup(pool);
    await createAdmin(pool);
    await waitForHealth(child);
    const cookie = await login();
    const statusResponse = await request('GET', '/api/admin/ai/providers', undefined, cookie);
    if (!statusResponse.response.ok) throw new Error(`Provider status failed with HTTP ${statusResponse.response.status}`);
    const status = statusResponse.json;

    const health = {};
    for (const provider of status.providers || []) {
      const result = await request('POST', `/api/admin/ai/providers/${provider.id}/test`, {}, cookie);
      health[provider.id] = result.json;
    }

    const structured = {};
    const tools = {};
    for (const provider of status.providers || []) {
      const configuredAndAvailable = provider.configured && provider.runtimeAvailable !== false;
      structured[provider.id] = await validateStructuredOutput(registry, provider.id, configuredAndAvailable);
      tools[provider.id] = await validateToolCalling(registry, provider.id, configuredAndAvailable);
    }

    const reports = await writeReports({ status, health, structured, tools });
    console.log(JSON.stringify({
      generated: [
        'docs/ai/provider-runtime-report.md',
        'docs/ai/provider-runtime-status.json',
        'docs/ai/cyberguard-runtime-flow.md',
      ],
      providers: reports.rows.map(row => ({
        provider: row.provider,
        configured: row.configured,
        healthy: row.healthy,
        runtimeAvailable: Boolean(row.runtimeAvailable),
        lastRuntimeStatus: row.lastRuntimeStatus,
        lastRuntimeError: row.lastRuntimeError,
        latencyMs: row.latencyMs,
        model: row.model,
        status: row.status,
      })),
      cyberguardProvider: status.purposeAssignments?.cyberguard_chat,
    }, null, 2));
  } finally {
    await stopServer(child);
    await cleanup(pool).catch(() => {});
    await pool.end();
  }
}

run().catch(error => {
  console.error(error.code || error.message);
  process.exitCode = 1;
});

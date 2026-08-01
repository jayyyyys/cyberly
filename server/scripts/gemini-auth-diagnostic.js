const crypto = require('node:crypto');
const path = require('node:path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const { createGeminiProvider } = require('../src/ai/providers/gemini.provider');

function fingerprint(value) {
  if (!value) return null;
  return crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 8);
}

function redact(value) {
  return String(value || '')
    .replace(/[A-Za-z0-9_.-]{30,}/g, '[redacted]')
    .replace(/key=[^&\s]+/gi, 'key=[redacted]')
    .slice(0, 260);
}

function googleErrorDetails(error) {
  const raw = String(error?.message || '');
  let parsed = null;
  try {
    parsed = JSON.parse(raw).error || null;
  } catch {}
  const details = Array.isArray(parsed?.details) ? parsed.details : [];
  const reason = details.find(item => item && typeof item.reason === 'string')?.reason || null;
  return {
    name: error?.name || null,
    httpStatus: Number(error?.status || error?.response?.status || parsed?.code || 0) || null,
    googleStatus: parsed?.status || null,
    googleReason: reason,
    code: error?.code || null,
    message: redact(parsed?.message || raw || error?.code || 'Gemini request failed.'),
  };
}

function sdkVersion() {
  try {
    return require(path.join(__dirname, '..', 'node_modules', '@google', 'genai', 'package.json')).version;
  } catch {
    return null;
  }
}

function selectedImplicitKeySource(env = process.env) {
  if (env.GOOGLE_API_KEY) return 'GOOGLE_API_KEY';
  if (env.GEMINI_API_KEY) return 'GEMINI_API_KEY';
  return null;
}

function selectedKeyFingerprint(source, env = process.env) {
  if (source === 'GOOGLE_API_KEY') return fingerprint(env.GOOGLE_API_KEY);
  if (source === 'GEMINI_API_KEY' || source === 'explicit') return fingerprint(env.GEMINI_API_KEY);
  return null;
}

async function runSdkMode({ mode, selectedKeySource, createClient, apiVersion = 'sdk-default' }) {
  const startedAt = Date.now();
  try {
    const ai = createClient();
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      contents: 'Reply only: OK',
      config: {
        maxOutputTokens: 20,
        temperature: 0,
      },
    });
    return {
      mode,
      apiVersion,
      selectedKeySource,
      selectedKeyFingerprint: selectedKeyFingerprint(selectedKeySource),
      ok: true,
      latencyMs: Date.now() - startedAt,
      textPreview: String(response?.text || '').slice(0, 20),
      finishReason: response?.candidates?.[0]?.finishReason || null,
      usageAvailable: Boolean(response?.usageMetadata),
    };
  } catch (error) {
    return {
      mode,
      apiVersion,
      selectedKeySource,
      selectedKeyFingerprint: selectedKeyFingerprint(selectedKeySource),
      ok: false,
      latencyMs: Date.now() - startedAt,
      error: googleErrorDetails(error),
    };
  }
}

async function runAdapterMode() {
  const startedAt = Date.now();
  try {
    const provider = createGeminiProvider({
      apiKey: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      timeoutMs: Number(process.env.AI_TIMEOUT_MS || 10000),
      maxOutputTokens: 20,
    });
    const result = await provider.generate({
      systemInstruction: 'Reply only: OK.',
      messages: [{ role: 'user', content: 'Reply only: OK' }],
      maxOutputTokens: 20,
      temperature: 0,
      tools: [],
    });
    return {
      mode: 'cyberly_adapter',
      apiVersion: 'sdk-default',
      selectedKeySource: 'explicit',
      selectedKeyFingerprint: fingerprint(process.env.GEMINI_API_KEY),
      ok: true,
      latencyMs: Date.now() - startedAt,
      textPreview: String(result.text || '').slice(0, 20),
      finishReason: result.finishReason || null,
      usageAvailable: Boolean(result.usage),
    };
  } catch (error) {
    return {
      mode: 'cyberly_adapter',
      apiVersion: 'sdk-default',
      selectedKeySource: 'explicit',
      selectedKeyFingerprint: fingerprint(process.env.GEMINI_API_KEY),
      ok: false,
      latencyMs: Date.now() - startedAt,
      error: googleErrorDetails(error),
    };
  }
}

async function run() {
  const mod = require('@google/genai');
  const GoogleGenAI = mod.GoogleGenAI || mod.default;
  const implicitSource = selectedImplicitKeySource();
  const results = [];

  results.push(await runSdkMode({
    mode: 'explicit_GEMINI_API_KEY',
    selectedKeySource: 'GEMINI_API_KEY',
    createClient: () => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }),
  }));

  results.push(await runSdkMode({
    mode: 'implicit_environment',
    selectedKeySource: implicitSource,
    createClient: () => new GoogleGenAI({}),
  }));

  results.push(await runAdapterMode());

  if (process.argv.includes('--api-version-probe')) {
    for (const apiVersion of ['v1alpha', 'v1']) {
      results.push(await runSdkMode({
        mode: `explicit_GEMINI_API_KEY_${apiVersion}`,
        apiVersion,
        selectedKeySource: 'GEMINI_API_KEY',
        createClient: () => new GoogleGenAI({
          apiKey: process.env.GEMINI_API_KEY,
          httpOptions: { apiVersion },
        }),
      }));
    }
  }

  console.log(JSON.stringify({
    sdk: {
      package: '@google/genai',
      version: sdkVersion(),
      defaultEndpoint: 'Gemini Developer API',
      defaultTransport: 'x-goog-api-key',
      defaultApiVersion: 'v1beta',
    },
    environment: {
      geminiApiKeyPresent: Boolean(process.env.GEMINI_API_KEY),
      geminiApiKeyLength: String(process.env.GEMINI_API_KEY || '').length,
      geminiApiKeyFingerprint: fingerprint(process.env.GEMINI_API_KEY),
      googleApiKeyPresent: Boolean(process.env.GOOGLE_API_KEY),
      googleApiKeyLength: String(process.env.GOOGLE_API_KEY || '').length,
      googleApiKeyFingerprint: fingerprint(process.env.GOOGLE_API_KEY),
      implicitSelectedKeySource: implicitSource,
      implicitSelectedKeyFingerprint: selectedKeyFingerprint(implicitSource),
    },
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    results,
  }, null, 2));
}

run().catch(error => {
  console.error(redact(error?.message || error));
  process.exitCode = 1;
});

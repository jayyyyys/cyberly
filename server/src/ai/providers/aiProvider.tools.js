const PROHIBITED_TOOL_NAMES = new Set([
  'execute_sql',
  'modify_assessment_score',
  'modify_scenario_score',
  'delete_user_account',
  'change_password',
  'send_email',
  'open_arbitrary_url',
  'publish_admin_content',
  'modify_rag_sources',
  'bypass_safety_rules',
  'read_api_keys',
  'read_session_secret',
  'read_raw_assessment_answers',
  'read_raw_scenario_decisions',
]);

function normalizeToolDeclarations(tools = []) {
  if (!Array.isArray(tools)) return [];
  return tools.map(tool => {
    const name = String(tool?.name || '').trim();
    const inputSchema = tool?.inputSchema || tool?.parameters || null;
    if (!/^[a-zA-Z_][a-zA-Z0-9_]{1,63}$/.test(name) || PROHIBITED_TOOL_NAMES.has(name) || !inputSchema) {
      throw new Error(`Invalid tool declaration: ${name || 'unknown'}`);
    }
    return {
      name,
      description: String(tool.description || '').trim().slice(0, 1000),
      inputSchema,
      riskLevel: tool.riskLevel || 'low',
      mode: tool.mode || 'read',
      allowedRoles: Array.isArray(tool.allowedRoles) ? tool.allowedRoles : ['backend'],
    };
  });
}

function normalizeReturnedToolCalls(provider, calls = []) {
  if (!Array.isArray(calls)) return [];
  return calls.map((call, index) => ({
    callId: String(call.callId || call.id || `${provider}-tool-call-${index + 1}`),
    toolName: String(call.toolName || call.name || call.function?.name || ''),
    arguments: call.arguments || call.args || call.function?.arguments || {},
    provider,
  })).filter(call => call.toolName && !PROHIBITED_TOOL_NAMES.has(call.toolName));
}

function toOpenAiTools(tools = []) {
  return normalizeToolDeclarations(tools).map(tool => ({
    type: 'function',
    name: tool.name,
    description: tool.description,
    parameters: tool.inputSchema,
  }));
}

function toGeminiTools(tools = []) {
  const declarations = normalizeToolDeclarations(tools).map(tool => ({
    name: tool.name,
    description: tool.description,
    parametersJsonSchema: tool.inputSchema,
  }));
  return declarations.length ? [{ functionDeclarations: declarations }] : undefined;
}

module.exports = {
  PROHIBITED_TOOL_NAMES,
  normalizeToolDeclarations,
  normalizeReturnedToolCalls,
  toOpenAiTools,
  toGeminiTools,
};

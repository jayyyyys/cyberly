const ALLOWED_TOOL_NAMES = new Set([
  'get_learner_context',
  'get_current_recommendation',
  'search_learning_resources',
  'get_related_scenarios',
  'get_completed_scenarios',
  'build_learning_route',
]);

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

const ALLOWED_INTERNAL_TARGET_PAGES = new Set(['resources', 'scenarios', 'progress', 'assessment']);

function isAllowedToolName(toolName) {
  return ALLOWED_TOOL_NAMES.has(toolName);
}

function isProhibitedToolName(toolName) {
  return PROHIBITED_TOOL_NAMES.has(toolName);
}

function assertNoClientUserId(input = {}) {
  if (Object.hasOwn(input || {}, 'userId')) {
    throw new Error('Agent tool input userId is not accepted.');
  }
}

function safeInternalTarget(target = {}) {
  if (!target || typeof target !== 'object' || !ALLOWED_INTERNAL_TARGET_PAGES.has(target.page)) return null;
  const safe = { page: target.page };
  if (target.resourceSlug) safe.resourceSlug = String(target.resourceSlug);
  if (Number.isInteger(Number(target.resourceId)) && Number(target.resourceId) > 0) safe.resourceId = Number(target.resourceId);
  if (target.scenarioSlug) safe.scenarioSlug = String(target.scenarioSlug);
  if (Number.isInteger(Number(target.scenarioId)) && Number(target.scenarioId) > 0) safe.scenarioId = Number(target.scenarioId);
  if (target.sectionId) safe.sectionId = String(target.sectionId);
  return safe;
}

module.exports = {
  ALLOWED_TOOL_NAMES,
  PROHIBITED_TOOL_NAMES,
  assertNoClientUserId,
  isAllowedToolName,
  isProhibitedToolName,
  safeInternalTarget,
};

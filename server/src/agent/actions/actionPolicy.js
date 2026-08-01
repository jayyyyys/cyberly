const ENABLED_ACTION_TYPES = Object.freeze([
  'open_resource',
  'open_scenario',
  'open_recommendation',
  'mark_recommendation_viewed',
  'mark_recommendation_completed',
]);

const DEFERRED_ACTION_TYPES = Object.freeze([
  'update_learning_preferences',
]);

const PROHIBITED_ACTION_TYPES = Object.freeze([
  'change_score',
  'change_mastery',
  'change_progress',
  'start_scenario_attempt',
  'restore_scenario_attempt',
  'submit_scenario_decision',
  'complete_assessment_attempt',
  'create_recommendation',
  'publish_content',
  'delete_content',
  'execute_sql',
  'read_api_keys',
  'bypass_safety_rules',
]);

function isEnabledActionType(actionType) {
  return ENABLED_ACTION_TYPES.includes(actionType);
}

function isProhibitedActionType(actionType) {
  return PROHIBITED_ACTION_TYPES.includes(actionType);
}

module.exports = {
  DEFERRED_ACTION_TYPES,
  ENABLED_ACTION_TYPES,
  PROHIBITED_ACTION_TYPES,
  isEnabledActionType,
  isProhibitedActionType,
};

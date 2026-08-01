const { detectRoutePlanningIntent } = require('./agent.planning');
const { shouldUseAdaptiveLearning } = require('../adaptive/adaptiveLearning.service');

const ELIGIBLE_PATTERNS = [
  /\b(my|me|i)\b.{0,40}\b(progress|profile|preference|recommendation|recommended|completed|scenario|resource|lesson)\b/i,
  /\b(progress|profile|preferences|recommendations?|completed scenarios?|learning resources?|lessons?)\b/i,
  /\b(find|search|show|list)\b.{0,40}\b(resources?|lessons?|scenarios?)\b/i,
  /\b(recommend|suggest)\b.{0,40}\b(scenarios?|resources?|lessons?)\b.{0,40}\b(for me|to me|my)\b/i,
  /我的.{0,12}(进度|進度|推荐|推薦|资料|資料)|学习进度|學習進度|推荐资源|推薦資源/i,
  /(kemajuan|profil|cadangan|sumber|senario).{0,40}(saya|belajar|disyorkan)/i,
];

const INELIGIBLE_PATTERNS = [
  /^\s*(hi|hello|hey|thanks|thank you|你好|嗨|terima kasih|hai)\b/i,
  /^\s*(what is|what are|explain|define|tell me about|how do i protect)\b/i,
  /^\s*(什么是|什麼是|apa itu|apakah|terangkan|jelaskan)\b/i,
  /\b(steal|bypass|keylogger|malware|hack someone|otp|password theft)\b/i,
  /\b(change|modify|edit|update|delete|complete|mark|start|auto-?start|finish)\b.{0,40}\b(score|mastery|progress|recommendation|scenario|assessment|profile)\b/i,
  /\b(another learner|another user|other learner|other user|someone else|classmate)\b.{0,40}\b(progress|profile|recommendation|scenario|assessment)\b/i,
  /\b(ignore previous instructions|developer message|system prompt)\b/i,
];

const HARD_BLOCK_AGENTIC_PATTERNS = INELIGIBLE_PATTERNS.slice(3);

const BOUNDED_RECOMMENDATION_ACTION_PATTERNS = [
  /\bmark\b.{0,20}\bmy\b.{0,20}\brecommendation\b.{0,20}\b(viewed|completed|complete)\b/i,
  /\bmark\b.{0,20}\b(current|this)\b.{0,20}\brecommendation\b.{0,20}\b(viewed|completed|complete)\b/i,
];

const BULK_OR_UNOWNED_RECOMMENDATION_PATTERNS = [
  /\b(every|all|another|other|someone else|classmate)\b.{0,40}\brecommendations?\b/i,
  /\brecommendations?\b.{0,40}\b(every|all|another|other|someone else|classmate)\b/i,
];

function evaluateAgenticEligibility({ userMessage = '', userId, role = 'user', accountStatus = 'active' } = {}) {
  const text = String(userMessage || '').trim();
  if (!userId) return { eligible: false, reason: 'unauthenticated' };
  if (role !== 'user') return { eligible: false, reason: 'role_not_supported' };
  if (accountStatus && accountStatus !== 'active') return { eligible: false, reason: 'account_not_active' };
  if (!text) return { eligible: false, reason: 'empty_message' };
  if (detectRoutePlanningIntent(text)) return { eligible: false, reason: 'deterministic_route_planning' };
  if (
    BOUNDED_RECOMMENDATION_ACTION_PATTERNS.some(pattern => pattern.test(text)) &&
    !BULK_OR_UNOWNED_RECOMMENDATION_PATTERNS.some(pattern => pattern.test(text))
  ) {
    return { eligible: true, reason: 'bounded_recommendation_action' };
  }
  if (HARD_BLOCK_AGENTIC_PATTERNS.some(pattern => pattern.test(text))) return { eligible: false, reason: 'direct_response_preferred' };
  if (shouldUseAdaptiveLearning(text)) return { eligible: true, reason: 'adaptive_learning_context_helpful' };
  if (INELIGIBLE_PATTERNS.some(pattern => pattern.test(text))) return { eligible: false, reason: 'direct_response_preferred' };
  if (!ELIGIBLE_PATTERNS.some(pattern => pattern.test(text))) return { eligible: false, reason: 'no_tool_need_detected' };
  return { eligible: true, reason: 'tool_helpful' };
}

module.exports = {
  evaluateAgenticEligibility,
};

const TOPIC_PATTERNS = [
  {
    topicCode: 'phishing_and_scams',
    pattern: /phishing|scam|penipuan|pancingan|网络钓鱼|網絡釣魚|诈骗|詐騙/i,
  },
  {
    topicCode: 'password_and_account_security',
    pattern: /password|account security|kata laluan|akaun|密码|密碼|账号|帳號|otp|2fa|mfa/i,
  },
  {
    topicCode: 'privacy_and_personal_information',
    pattern: /privacy|personal information|personal data|privasi|maklumat peribadi|隐私|私隐|个人资料|個人資料/i,
  },
  {
    topicCode: 'misinformation_and_deepfakes',
    pattern: /misinformation|fake news|deepfake|maklumat palsu|berita palsu|虚假信息|假新闻|假新聞|深度伪造|深度偽造/i,
  },
];

const ROUTE_PATTERNS = [
  /\b(plan|study plan|practice plan|learning route|route|study session)\b/i,
  /\b(help me learn|steps should i follow|what steps should i follow|prepare me for)\b/i,
  /\b\d{1,2}[- ]?(minute|min)\b.{0,80}\b(plan|practice|study|learn|route|session)\b/i,
  /学习计划|學習計劃|学习.{0,12}(步骤|安排)|學習.{0,12}(步驟|安排)|安排步骤|安排步驟/i,
  /pelan belajar|rancangan belajar|langkah.{0,30}(belajar|ikuti)|belajar.{0,30}\d{1,2}\s*minit/i,
];

const NON_ROUTE_PATTERNS = [
  /^\s*(what is|what are|explain|define|tell me about|how do i protect)\b/i,
  /^\s*(什么是|什麼是|apa itu|apakah|terangkan|jelaskan)\b/i,
  /\bwhat should i learn next\b/i,
  /应该学什么|patut belajar apa/i,
];

function normalizeText(value = '') {
  return String(value || '').trim();
}

function detectRoutePlanningIntent(content = '') {
  const text = normalizeText(content);
  if (!text) return false;
  if (NON_ROUTE_PATTERNS.some(pattern => pattern.test(text))) return false;
  return ROUTE_PATTERNS.some(pattern => pattern.test(text));
}

function extractTopicCode(content = '') {
  const text = normalizeText(content);
  const match = TOPIC_PATTERNS.find(item => item.pattern.test(text));
  return match?.topicCode || null;
}

function extractTimeBudgetMinutes(content = '') {
  const text = normalizeText(content);
  const match = text.match(/(\d{1,2})\s*(?:-| )?\s*(?:minute|min|minutes|minit|分钟|分鐘)/i);
  if (!match) return 15;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return 15;
  return Math.min(Math.max(Math.round(value), 5), 60);
}

function extractRoutePlanningInput(content = '') {
  const goal = normalizeText(content);
  return {
    goal,
    topicCode: extractTopicCode(goal),
    timeBudgetMinutes: extractTimeBudgetMinutes(goal),
  };
}

module.exports = {
  detectRoutePlanningIntent,
  extractRoutePlanningInput,
  extractTimeBudgetMinutes,
  extractTopicCode,
};

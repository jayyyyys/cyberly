const CYBER_GUARD_SCOPE_TYPES = Object.freeze({
  IN_SCOPE: 'in_scope',
  IN_SCOPE_LEARNING_GUIDANCE: 'in_scope_learning_guidance',
  CASUAL_ALLOWED: 'casual_allowed',
  OUT_OF_SCOPE: 'out_of_scope',
  UNSAFE: 'unsafe',
  HIGH_RISK: 'high_risk',
});

const CYBER_TERMS = [
  'cyber', 'cybersecurity', 'cyber security', 'online safety', 'digital safety', 'digital wellness',
  'cyber wellness', 'phishing', 'scam', 'fraud', 'password', 'passkey', 'account', 'login',
  'privacy', 'personal data', 'otp', '2fa', 'two-factor', 'mfa', 'malware', 'virus',
  'misinformation', 'fake news', 'deepfake', 'doxxing', 'cyberbullying', 'bully',
  'social engineering', 'suspicious link', 'resource', 'scenario', 'recommendation', 'progress',
  'assessment', 'cyberly', 'cyberguard', 'notification', 'screen time', 'digital balance',
  'online pressure', 'group chat', 'personal photo', 'report harmful',
  '网络', '网路', '钓鱼', '诈骗', '密码', '账号', '账户', '隐私', '个人资料', '个人数据',
  '错误信息', '深度伪造', '网络安全', '网络健康', '学习进度', '情境', '资源',
  'keselamatan siber', 'siber', 'phishing', 'penipuan', 'kata laluan', 'akaun',
  'privasi', 'data peribadi', 'maklumat palsu', 'deepfake', 'kesejahteraan digital',
];

const CASUAL_TERMS = [
  'hello', 'hi', 'hey', 'thanks', 'thank you', 'who are you', 'what can you help',
  '你好', '谢谢', '你是谁', '你可以帮', 'hai', 'helo', 'terima kasih', 'siapa awak',
];

const OUT_OF_SCOPE_TERMS = [
  'mathematics', 'math', 'maths', 'algebra', 'calculus', 'geometry', 'history essay',
  'world war', 'chemistry', 'physics homework', 'biology homework', 'holiday itinerary',
  'travel itinerary', 'cook', 'cooking', 'cooking recipe', 'cooking lesson', 'dinner',
  'movie', 'movie recommendation', 'workout', 'write a love poem',
  'teach me python', 'javascript tutorial', 'stock trading', 'investment advice',
  'accounting', 'economics homework',
  '数学', '历史作文', '化学', '旅行计划', '食谱', '教我编程',
  'matematik', 'karangan sejarah', 'kimia', 'jadual percutian', 'resipi', 'perakaunan',
];

const MIXED_LEARNING_TERMS = [
  'calculate', 'probability', 'statistics', 'essay', 'homework', 'formula',
  '计算', '概率', '统计', '作文', 'kerja rumah', 'kebarangkalian', 'statistik',
];

const INTENT_TOKEN_CORRECTIONS = Object.freeze({
  shoudl: 'should',
  shold: 'should',
  studdy: 'study',
  studyng: 'studying',
  recomend: 'recommend',
  reccomend: 'recommend',
  nxt: 'next',
  contine: 'continue',
  practce: 'practice',
});

function normalizeMessage(message) {
  return String(message || '')
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/[^\p{L}\p{N}'-]+/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map(token => INTENT_TOKEN_CORRECTIONS[token] || token)
    .join(' ')
    .trim();
}

function includesAny(text, terms) {
  return terms.some(term => {
    const normalized = term.trim();
    if (/^[a-z0-9-]+$/i.test(normalized) && normalized.length <= 4) {
      return new RegExp(`\\b${normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text);
    }
    return text.includes(normalized);
  });
}

function hasContextualLearningGuidanceIntent(text) {
  return (
    /\b(what should i|what do i|what can i|where should i|where can i).{0,40}\b(study|learn|do|practice|practise|continue)\b(?:.{0,24}\b(next|now|today)\b)?/i.test(text) ||
    /\b(recommend|suggest).{0,32}\b(me )?(something|activity|lesson|practice|scenario|resource|next step)\b/i.test(text) ||
    /\b(give me|show me).{0,30}\b(next activity|next task|task|next step|recommendation)\b/i.test(text) ||
    /\bwhat to do next\b/i.test(text) ||
    /\bwhat should i do\b/i.test(text) ||
    /\bsuggest something\b/i.test(text) ||
    /\brecommend (me )?something\b/i.test(text) ||
    /应该.{0,12}(学|学习|做|练习).{0,12}(什么|哪|下一|接下来)/.test(text) ||
    /(下一步|接下来).{0,12}(学|学习|做|练习|推荐)/.test(text) ||
    /(patut|perlu).{0,30}(belajar|buat|praktis|latihan).{0,24}(dahulu|selepas|seterus|apa)/i.test(text) ||
    /(cadang|syor).{0,24}(aktiviti|pelajaran|latihan|seterus)/i.test(text)
  );
}

function classifyCyberGuardScope(message) {
  const text = normalizeMessage(message);
  if (!text) {
    return {
      type: CYBER_GUARD_SCOPE_TYPES.CASUAL_ALLOWED,
      allowed: true,
      reasonCode: 'empty_or_short_greeting',
    };
  }

  const cyberRelated = includesAny(text, CYBER_TERMS);
  const outOfScope = includesAny(text, OUT_OF_SCOPE_TERMS);
  const mixedLearning = includesAny(text, MIXED_LEARNING_TERMS);
  const contextualLearningGuidance = hasContextualLearningGuidanceIntent(text);

  if (includesAny(text, CASUAL_TERMS) && text.length <= 120 && !contextualLearningGuidance && !outOfScope) {
    return {
      type: CYBER_GUARD_SCOPE_TYPES.CASUAL_ALLOWED,
      allowed: true,
      reasonCode: 'brief_casual_chat',
    };
  }

  if (cyberRelated) {
    return {
      type: CYBER_GUARD_SCOPE_TYPES.IN_SCOPE,
      allowed: true,
      reasonCode: outOfScope || mixedLearning ? 'mixed_cyber_learning' : 'cyber_wellness_learning',
    };
  }

  if (outOfScope || text.includes('ignore previous instructions')) {
    return {
      type: CYBER_GUARD_SCOPE_TYPES.OUT_OF_SCOPE,
      allowed: false,
      reasonCode: outOfScope ? 'unrelated_academic_or_general_subject' : 'scope_bypass_attempt',
    };
  }

  if (contextualLearningGuidance) {
    return {
      type: CYBER_GUARD_SCOPE_TYPES.IN_SCOPE_LEARNING_GUIDANCE,
      allowed: true,
      reasonCode: 'contextual_learning_guidance',
    };
  }

  return {
    type: CYBER_GUARD_SCOPE_TYPES.OUT_OF_SCOPE,
    allowed: false,
    reasonCode: 'not_cyber_wellness_related',
  };
}

module.exports = {
  CYBER_GUARD_SCOPE_TYPES,
  classifyCyberGuardScope,
};

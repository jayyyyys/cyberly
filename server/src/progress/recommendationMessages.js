const { normalizeLocale } = require('../i18n/locale');

const SAFE_FALLBACK = 'Continue with the next recommended cyber wellness activity.';

const TOPIC_LABELS = {
  en: {
    phishing_and_scams: 'phishing and scams',
    password_and_account_security: 'password and account security',
    privacy_and_personal_information: 'privacy and personal information',
    misinformation_and_deepfakes: 'misinformation and deepfakes',
  },
  ms: {
    phishing_and_scams: 'pancingan data dan scam',
    password_and_account_security: 'keselamatan kata laluan dan akaun',
    privacy_and_personal_information: 'privasi dan maklumat peribadi',
    misinformation_and_deepfakes: 'maklumat palsu dan deepfake',
  },
  'zh-CN': {
    phishing_and_scams: '网络钓鱼和诈骗',
    password_and_account_security: '密码和账号安全',
    privacy_and_personal_information: '隐私和个人信息',
    misinformation_and_deepfakes: '错误信息和深度伪造',
  },
};

const LEVEL_LABELS = {
  en: {
    beginner: 'beginner',
    developing: 'developing',
    intermediate: 'intermediate',
    advanced: 'advanced',
  },
  ms: {
    beginner: 'pemula',
    developing: 'sedang berkembang',
    intermediate: 'pertengahan',
    advanced: 'lanjutan',
  },
  'zh-CN': {
    beginner: '初学',
    developing: '发展中',
    intermediate: '中级',
    advanced: '高级',
  },
};

const TEMPLATES = {
  en: {
    assessment_pending: () => 'Complete the initial cyber wellness assessment to unlock measured progress and recommendations.',
    lowest_topic_score: ({ topic, level }) => `Your ${topic} score was the lowest, so ${level}-level reading and practice is recommended next.`,
    weak_topic: ({ topic, level }) => `Your ${topic} score was the lowest, so ${level}-level reading and practice is recommended next.`,
    developing_topic: ({ topic, level }) => `Your ${topic} score was the lowest, so ${level}-level reading and practice is recommended next.`,
    continue_progress: ({ topic, level }) => `Keep building your ${topic} skills with ${level}-level reading and practice next.`,
    high_mastery_challenge: ({ topic, level }) => `You already show strong ${topic} knowledge, so an ${level}-level challenge is recommended next.`,
  },
  ms: {
    assessment_pending: () => 'Lengkapkan penilaian awal kesejahteraan siber untuk membuka kemajuan terukur dan cadangan.',
    lowest_topic_score: ({ topic, level }) => `Skor ${topic} anda paling rendah, jadi bacaan dan latihan tahap ${level} dicadangkan seterusnya.`,
    weak_topic: ({ topic, level }) => `Skor ${topic} anda paling rendah, jadi bacaan dan latihan tahap ${level} dicadangkan seterusnya.`,
    developing_topic: ({ topic, level }) => `Skor ${topic} anda paling rendah, jadi bacaan dan latihan tahap ${level} dicadangkan seterusnya.`,
    continue_progress: ({ topic, level }) => `Terus bina kemahiran ${topic} anda dengan bacaan dan latihan tahap ${level} seterusnya.`,
    high_mastery_challenge: ({ topic, level }) => `Anda sudah menunjukkan pengetahuan ${topic} yang kukuh, jadi cabaran tahap ${level} dicadangkan seterusnya.`,
  },
  'zh-CN': {
    assessment_pending: () => '完成初始网络健康评估，以解锁可衡量的进度和建议。',
    lowest_topic_score: ({ topic, level }) => `你的${topic}分数最低，建议接下来阅读并练习${level}等级内容。`,
    weak_topic: ({ topic, level }) => `你的${topic}分数最低，建议接下来阅读并练习${level}等级内容。`,
    developing_topic: ({ topic, level }) => `你的${topic}分数最低，建议接下来阅读并练习${level}等级内容。`,
    continue_progress: ({ topic, level }) => `继续通过${level}等级阅读和练习，提升你的${topic}能力。`,
    high_mastery_challenge: ({ topic, level }) => `你已经展现出扎实的${topic}知识，建议接下来挑战${level}等级内容。`,
  },
};

function labelFor(labels, locale, code) {
  return labels[locale]?.[code] || labels.en[code] || code || '';
}

function buildRecommendationReasonText(row, localeInput = 'en') {
  if (!row) return null;
  const locale = normalizeLocale(localeInput);
  const topic = labelFor(TOPIC_LABELS, locale, row.topic_code);
  const level = labelFor(LEVEL_LABELS, locale, row.recommended_level);
  const values = { topic, level };
  const template = TEMPLATES[locale]?.[row.reason_code] || TEMPLATES.en[row.reason_code];

  if (template) return template(values);
  return row.reason_text || SAFE_FALLBACK;
}

module.exports = {
  buildRecommendationReasonText,
  LEVEL_LABELS,
  SAFE_FALLBACK,
  TOPIC_LABELS,
};

const {
  CYBER_WELLNESS_CONFIDENCE,
  CYBER_WELLNESS_DOMAINS,
  CYBER_WELLNESS_GUIDANCE_TYPES,
} = require('./cyberWellness.constants');

const DOMAIN_RULES = [
  {
    domain: CYBER_WELLNESS_DOMAINS.DIGITAL_BALANCE,
    guidanceType: CYBER_WELLNESS_GUIDANCE_TYPES.BREAK_SUGGESTION,
    patterns: [
      /\bonline for hours\b/i,
      /\bscreen(?: |-)?time\b/i,
      /\btoo much (?:time )?online\b/i,
      /\bneed (?:a )?break\b/i,
      /\bcannot stop\b/i,
      /一直(?:上网|在线)/i,
      /上网.*很久/i,
      /terlalu lama.*(?:online|dalam talian)/i,
    ],
  },
  {
    domain: CYBER_WELLNESS_DOMAINS.FOCUS_AND_DISTRACTION,
    guidanceType: CYBER_WELLNESS_GUIDANCE_TYPES.FOCUS_RESET,
    patterns: [
      /\bnotification/i,
      /\bdistract/i,
      /\bcannot focus\b/i,
      /\bcan't focus\b/i,
      /\bclose unrelated tabs\b/i,
      /分心|通知.*干扰|无法专心/i,
      /terganggu|notifikasi|tidak dapat fokus/i,
    ],
  },
  {
    domain: CYBER_WELLNESS_DOMAINS.ONLINE_PRESSURE_AND_BOUNDARIES,
    guidanceType: CYBER_WELLNESS_GUIDANCE_TYPES.BOUNDARY_SUPPORT,
    patterns: [
      /\bpressur(?:e|ing|ed)\b/i,
      /\breply immediately\b/i,
      /\bshare (?:personal )?(?:information|info|photo|image|picture|photos|images)\b/i,
      /\buncomfortable online request\b/i,
      /\bsay no\b/i,
      /逼.*回复|立刻回复|被迫.*分享|不舒服.*请求|界限/i,
      /tertekan|paksa.*balas|kongsi.*(?:gambar|maklumat)|batas/i,
    ],
  },
  {
    domain: CYBER_WELLNESS_DOMAINS.HEALTHY_ONLINE_COMMUNICATION,
    guidanceType: CYBER_WELLNESS_GUIDANCE_TYPES.REPORTING_GUIDANCE,
    patterns: [
      /\bcyberbully/i,
      /\bbully(?:ing)?\b/i,
      /\bgroup chat\b/i,
      /\bembarrassing message\b/i,
      /\bharass/i,
      /\bshared .* about me\b/i,
      /网络霸凌|欺负|群聊.*尴尬|骚扰|恶意留言/i,
      /buli siber|membuli|sembang kumpulan|memalukan|ganggu/i,
    ],
  },
  {
    domain: CYBER_WELLNESS_DOMAINS.SAFE_HELP_SEEKING,
    guidanceType: CYBER_WELLNESS_GUIDANCE_TYPES.TRUSTED_ADULT_SUPPORT,
    patterns: [
      /\btrusted adult\b/i,
      /\bask for help\b/i,
      /\breport harmful content\b/i,
      /\bhow can i report\b/i,
      /\bneed support\b/i,
      /可信任.*(成人|大人)|寻求帮助|举报.*内容|需要支持/i,
      /orang dewasa.*dipercayai|minta bantuan|lapor.*kandungan|perlukan sokongan/i,
    ],
  },
  {
    domain: CYBER_WELLNESS_DOMAINS.DIGITAL_RESILIENCE,
    guidanceType: CYBER_WELLNESS_GUIDANCE_TYPES.RECOVERY_GUIDANCE,
    patterns: [
      /\bclicked (?:a )?(?:scam|phishing|suspicious) link\b/i,
      /\bfell for\b/i,
      /\bfeel stupid\b/i,
      /\bmade a mistake\b/i,
      /\brecover after\b/i,
      /点.*诈骗.*链接|被骗|觉得自己很笨|犯错/i,
      /klik.*pautan.*(?:scam|mencurigakan)|tertipu|rasa bodoh|buat silap/i,
    ],
  },
];

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function classifyCyberWellness(input = {}) {
  const text = normalizeText(input.message || input.content);
  if (!text) return null;

  const matches = DOMAIN_RULES
    .map(rule => ({
      domain: rule.domain,
      guidanceType: rule.guidanceType,
      matchedSignals: rule.patterns.filter(pattern => pattern.test(text)).map(pattern => pattern.source).slice(0, 3),
    }))
    .filter(result => result.matchedSignals.length > 0);

  if (!matches.length) return null;
  const selected = matches[0];
  const confidence = selected.matchedSignals.length >= 2 || /\b(help|how|what should|can you|please)\b/i.test(text)
    ? CYBER_WELLNESS_CONFIDENCE.HIGH
    : matches.length > 1
      ? CYBER_WELLNESS_CONFIDENCE.MEDIUM
      : CYBER_WELLNESS_CONFIDENCE.HIGH;

  return {
    domain: selected.domain,
    confidence,
    guidanceType: selected.guidanceType,
    matchedSignals: selected.matchedSignals,
  };
}

module.exports = {
  classifyCyberWellness,
};

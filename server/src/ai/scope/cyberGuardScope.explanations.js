const { normalizeLocale } = require('../../i18n/locale');
const { CYBER_GUARD_SCOPE_TYPES } = require('./cyberGuardScope.classifier');

const RESPONSES = {
  en: {
    casual:
      'Hi, I am CyberGuard. I can help with cybersecurity, online safety, cyber wellness, Cyberly learning resources, scenarios, progress, and study plans.',
    outOfScope:
      'CyberGuard is focused on cybersecurity and cyber wellness learning. I cannot help with that topic here, but I can help you with phishing, scams, passwords, privacy, online safety, misinformation, or your Cyberly learning next step.',
  },
  ms: {
    casual:
      'Hai, saya CyberGuard. Saya boleh membantu tentang keselamatan siber, keselamatan dalam talian, kesejahteraan digital, sumber Cyberly, senario, kemajuan dan pelan pembelajaran.',
    outOfScope:
      'CyberGuard tertumpu pada pembelajaran keselamatan siber dan kesejahteraan digital. Saya tidak boleh membantu topik itu di sini, tetapi saya boleh membantu tentang phishing, penipuan, kata laluan, privasi, keselamatan dalam talian, maklumat palsu atau langkah pembelajaran Cyberly anda.',
  },
  'zh-CN': {
    casual:
      '你好，我是 CyberGuard。我可以帮助你学习网络安全、网络健康、Cyberly 学习资源、情境练习、学习进度和学习计划。',
    outOfScope:
      'CyberGuard 专注于网络安全和网络健康学习。这个主题不在这里的范围内，但我可以帮助你了解网络钓鱼、诈骗、密码、隐私、网络安全、错误信息，或你的 Cyberly 下一步学习建议。',
  },
};

function buildScopeBoundaryReply(scope, localeInput) {
  const locale = normalizeLocale(localeInput);
  const messages = RESPONSES[locale] || RESPONSES.en;
  return scope?.type === CYBER_GUARD_SCOPE_TYPES.CASUAL_ALLOWED
    ? messages.casual
    : messages.outOfScope;
}

module.exports = {
  buildScopeBoundaryReply,
};

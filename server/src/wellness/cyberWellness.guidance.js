const {
  CYBER_WELLNESS_CONFIDENCE,
  CYBER_WELLNESS_DOMAINS,
  CYBER_WELLNESS_GUIDANCE_TYPES,
  DOMAIN_TOPIC_MAP,
  WELLNESS_SAFETY_BOUNDARY,
} = require('./cyberWellness.constants');

const GUIDANCE_TEMPLATES = Object.freeze({
  [CYBER_WELLNESS_DOMAINS.DIGITAL_BALANCE]: {
    learnerMessage: 'It sounds like the situation involves balancing online time with rest.',
    practicalSteps: [
      'Pause after a natural stopping point.',
      'Take a short screen break, stretch, drink water, or look away from the screen.',
      'Choose one clear next task before returning.',
    ],
    avoidActions: [
      'Do not force yourself to keep scrolling when you already need a pause.',
      'Do not treat a break as failure.',
    ],
    suggestedSupport: ['Ask a trusted adult to help you set a reasonable routine if this keeps happening.'],
  },
  [CYBER_WELLNESS_DOMAINS.FOCUS_AND_DISTRACTION]: {
    learnerMessage: 'It sounds like the situation involves digital distractions while trying to focus.',
    practicalSteps: [
      'Mute non-essential notifications for a short focus period.',
      'Close unrelated tabs or apps.',
      'Work on one small task before switching to something else.',
    ],
    avoidActions: [
      'Do not share private information just to stop interruptions.',
      'Do not expect one setting to solve every distraction.',
    ],
    suggestedSupport: ['Keep important or emergency contact channels available.'],
  },
  [CYBER_WELLNESS_DOMAINS.ONLINE_PRESSURE_AND_BOUNDARIES]: {
    learnerMessage: 'It sounds like the situation involves online pressure or personal boundaries.',
    practicalSteps: [
      'Pause before responding.',
      'Do not share information or images under pressure.',
      'You can say no, leave, block, or ask a trusted adult for help.',
    ],
    avoidActions: [
      'Do not send private details to make someone stop pressuring you.',
      'Do not stay in an interaction that feels unsafe.',
    ],
    suggestedSupport: ['Talk to a trusted adult, teacher, guardian, or platform support when needed.'],
  },
  [CYBER_WELLNESS_DOMAINS.HEALTHY_ONLINE_COMMUNICATION]: {
    learnerMessage: 'It sounds like the situation involves online communication or possible harmful sharing.',
    practicalSteps: [
      'Avoid escalating the conversation.',
      'Save evidence if it is safe to do so.',
      'Use block or report tools and ask a trusted adult for support.',
    ],
    avoidActions: [
      'Do not reply with insults or threats.',
      'Do not forward embarrassing or harmful messages.',
    ],
    suggestedSupport: ['Use official platform reporting and involve a trusted adult if the situation continues.'],
  },
  [CYBER_WELLNESS_DOMAINS.SAFE_HELP_SEEKING]: {
    learnerMessage: 'It sounds like you may be looking for safe help or reporting support.',
    practicalSteps: [
      'Choose a trusted adult, teacher, guardian, or appropriate support person.',
      'Explain what happened using only necessary details.',
      'Use official platform reporting features where appropriate.',
    ],
    avoidActions: [
      'Do not post private evidence publicly.',
      'Do not share passwords, OTPs, or exact address details.',
    ],
    suggestedSupport: ['For high-risk or emergency situations, use the existing safety pathway and appropriate real-world support.'],
  },
  [CYBER_WELLNESS_DOMAINS.DIGITAL_RESILIENCE]: {
    learnerMessage: 'It sounds like the situation involves recovering after an online mistake or suspicious interaction.',
    practicalSteps: [
      'Avoid blaming yourself.',
      'Secure affected accounts and stop interacting with suspicious messages.',
      'Review what happened and take one practical recovery step.',
    ],
    avoidActions: [
      'Do not keep clicking links to check if they are safe.',
      'Do not share more personal information with the suspicious sender.',
    ],
    suggestedSupport: ['Ask a trusted adult or official support channel for help if money, accounts, or private information may be affected.'],
  },
});

function buildCyberWellnessGuidance({ classification, locale = 'en', suggestions = {} } = {}) {
  const safeClassification = classification && Object.values(CYBER_WELLNESS_DOMAINS).includes(classification.domain)
    ? classification
    : {
        domain: CYBER_WELLNESS_DOMAINS.SAFE_HELP_SEEKING,
        confidence: CYBER_WELLNESS_CONFIDENCE.LOW,
        guidanceType: CYBER_WELLNESS_GUIDANCE_TYPES.INSUFFICIENT_CONTEXT,
        matchedSignals: [],
      };
  const template = GUIDANCE_TEMPLATES[safeClassification.domain] || GUIDANCE_TEMPLATES[CYBER_WELLNESS_DOMAINS.SAFE_HELP_SEEKING];
  const lowConfidence = safeClassification.confidence === CYBER_WELLNESS_CONFIDENCE.LOW ||
    safeClassification.guidanceType === CYBER_WELLNESS_GUIDANCE_TYPES.INSUFFICIENT_CONTEXT;

  return {
    domain: safeClassification.domain,
    confidence: safeClassification.confidence || CYBER_WELLNESS_CONFIDENCE.LOW,
    matchedSignals: Array.isArray(safeClassification.matchedSignals) ? safeClassification.matchedSignals.slice(0, 3) : [],
    guidanceType: safeClassification.guidanceType || CYBER_WELLNESS_GUIDANCE_TYPES.QUICK_TIP,
    learnerMessage: lowConfidence
      ? 'With limited context, a safe first step is to clarify whether the main issue is distraction, pressure from another person, or needing a break.'
      : template.learnerMessage,
    practicalSteps: (lowConfidence
      ? ['Pause before acting.', 'Avoid sharing private information.', 'Choose one safe next step or ask a trusted adult.']
      : template.practicalSteps
    ).slice(0, 3),
    avoidActions: template.avoidActions.slice(0, 3),
    suggestedSupport: template.suggestedSupport.slice(0, 2),
    relatedLearningTopics: (DOMAIN_TOPIC_MAP[safeClassification.domain] || []).slice(0, 3),
    suggestedResourceIds: Array.isArray(suggestions.resourceIds) ? suggestions.resourceIds.slice(0, 2) : [],
    suggestedScenarioIds: Array.isArray(suggestions.scenarioIds) ? suggestions.scenarioIds.slice(0, 2) : [],
    safetyBoundary: { ...WELLNESS_SAFETY_BOUNDARY },
  };
}

module.exports = {
  buildCyberWellnessGuidance,
};

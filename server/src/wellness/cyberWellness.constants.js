const CYBER_WELLNESS_DOMAINS = Object.freeze({
  DIGITAL_BALANCE: 'digital_balance',
  FOCUS_AND_DISTRACTION: 'focus_and_distraction',
  ONLINE_PRESSURE_AND_BOUNDARIES: 'online_pressure_and_boundaries',
  HEALTHY_ONLINE_COMMUNICATION: 'healthy_online_communication',
  SAFE_HELP_SEEKING: 'safe_help_seeking',
  DIGITAL_RESILIENCE: 'digital_resilience',
});

const CYBER_WELLNESS_CONFIDENCE = Object.freeze({
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
});

const CYBER_WELLNESS_GUIDANCE_TYPES = Object.freeze({
  QUICK_TIP: 'quick_tip',
  STEP_BY_STEP: 'step_by_step',
  BOUNDARY_SUPPORT: 'boundary_support',
  FOCUS_RESET: 'focus_reset',
  BREAK_SUGGESTION: 'break_suggestion',
  REPORTING_GUIDANCE: 'reporting_guidance',
  TRUSTED_ADULT_SUPPORT: 'trusted_adult_support',
  RECOVERY_GUIDANCE: 'recovery_guidance',
  INSUFFICIENT_CONTEXT: 'insufficient_context',
});

const DOMAIN_TOPIC_MAP = Object.freeze({
  [CYBER_WELLNESS_DOMAINS.DIGITAL_BALANCE]: [],
  [CYBER_WELLNESS_DOMAINS.FOCUS_AND_DISTRACTION]: [],
  [CYBER_WELLNESS_DOMAINS.ONLINE_PRESSURE_AND_BOUNDARIES]: [
    'privacy_and_personal_information',
    'phishing_and_scams',
  ],
  [CYBER_WELLNESS_DOMAINS.HEALTHY_ONLINE_COMMUNICATION]: [
    'privacy_and_personal_information',
    'misinformation_and_deepfakes',
  ],
  [CYBER_WELLNESS_DOMAINS.SAFE_HELP_SEEKING]: [
    'phishing_and_scams',
    'privacy_and_personal_information',
  ],
  [CYBER_WELLNESS_DOMAINS.DIGITAL_RESILIENCE]: [
    'phishing_and_scams',
    'password_and_account_security',
  ],
});

const DOMAIN_CATEGORY_MAP = Object.freeze({
  [CYBER_WELLNESS_DOMAINS.DIGITAL_BALANCE]: ['Safety', 'Beginner'],
  [CYBER_WELLNESS_DOMAINS.FOCUS_AND_DISTRACTION]: ['Safety', 'Beginner'],
  [CYBER_WELLNESS_DOMAINS.ONLINE_PRESSURE_AND_BOUNDARIES]: ['Privacy', 'Scams'],
  [CYBER_WELLNESS_DOMAINS.HEALTHY_ONLINE_COMMUNICATION]: ['Safety', 'Privacy', 'Misinformation'],
  [CYBER_WELLNESS_DOMAINS.SAFE_HELP_SEEKING]: ['Safety', 'Scams', 'Privacy'],
  [CYBER_WELLNESS_DOMAINS.DIGITAL_RESILIENCE]: ['Scams', 'Passwords'],
});

const WELLNESS_SAFETY_BOUNDARY = Object.freeze({
  nonDiagnostic: true,
  noRiskScore: true,
  noAutomaticAction: true,
  learnerChoiceRequired: true,
});

module.exports = {
  CYBER_WELLNESS_CONFIDENCE,
  CYBER_WELLNESS_DOMAINS,
  CYBER_WELLNESS_GUIDANCE_TYPES,
  DOMAIN_CATEGORY_MAP,
  DOMAIN_TOPIC_MAP,
  WELLNESS_SAFETY_BOUNDARY,
};

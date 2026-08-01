const EDUCATION_LEVELS = new Set([
  'form_1',
  'form_2',
  'form_3',
  'form_4',
  'form_5',
  'other',
  'prefer_not_to_say',
]);

const PREFERRED_LANGUAGES = new Set([
  'english',
  'bahasa_melayu',
  'chinese',
  'mixed',
]);

const FAMILIARITY_LEVELS = new Set([
  'beginner',
  'intermediate',
  'advanced',
]);

const LEARNING_STYLES = new Set([
  'step_by_step',
  'short_explanations',
  'quizzes_and_challenges',
]);

const HELP_TOPICS = new Set([
  'staying_safe_online',
  'learning_cybersecurity',
  'avoiding_scams',
  'protecting_privacy',
  'understanding_cyber_threats',
  'cybersecurity_careers',
]);

function cleanOptionalString(value) {
  if (value === undefined || value === null) return null;
  return String(value).trim();
}

function validateEnum(value, allowed, field, errors) {
  if (value === undefined || value === null || value === '') return null;
  const normalized = String(value);
  if (!allowed.has(normalized)) {
    errors[field] = `${field} is invalid.`;
    return null;
  }
  return normalized;
}

function validateHelpTopics(value, isCompleting, errors) {
  if (value === undefined || value === null) {
    if (isCompleting) errors.helpTopics = 'Choose at least one help topic.';
    return [];
  }

  if (!Array.isArray(value)) {
    errors.helpTopics = 'Help topics must be an array.';
    return [];
  }

  const topics = value.map((topic) => String(topic));
  const uniqueTopics = new Set(topics);

  if (topics.length !== uniqueTopics.size) {
    errors.helpTopics = 'Choose each help topic only once.';
  }

  if (topics.length > 3) {
    errors.helpTopics = 'Choose no more than three help topics.';
  }

  if (isCompleting && topics.length < 1) {
    errors.helpTopics = 'Choose at least one help topic.';
  }

  if (topics.some((topic) => !HELP_TOPICS.has(topic))) {
    errors.helpTopics = 'One or more help topics are invalid.';
  }

  return Array.from(uniqueTopics);
}

function validateProfileInput(input = {}) {
  const errors = {};
  const onboardingCompleted = input.onboardingCompleted === true;
  const aiNickname = cleanOptionalString(input.aiNickname);

  if (aiNickname !== null && (aiNickname.length < 1 || aiNickname.length > 50)) {
    errors.aiNickname = 'AI nickname must be 1 to 50 characters.';
  }

  const educationLevel = validateEnum(input.educationLevel, EDUCATION_LEVELS, 'educationLevel', errors);
  const preferredLanguage = validateEnum(input.preferredLanguage, PREFERRED_LANGUAGES, 'preferredLanguage', errors);
  const familiarityLevel = validateEnum(input.familiarityLevel, FAMILIARITY_LEVELS, 'familiarityLevel', errors);
  const learningStyle = validateEnum(input.learningStyle, LEARNING_STYLES, 'learningStyle', errors);
  const helpTopics = validateHelpTopics(input.helpTopics, onboardingCompleted, errors);

  if (onboardingCompleted) {
    if (!aiNickname) errors.aiNickname = 'AI nickname is required to complete onboarding.';
    if (!educationLevel) errors.educationLevel = 'Education level is required to complete onboarding.';
    if (!preferredLanguage) errors.preferredLanguage = 'Preferred language is required to complete onboarding.';
    if (!familiarityLevel) errors.familiarityLevel = 'Familiarity level is required to complete onboarding.';
    if (!learningStyle) errors.learningStyle = 'Learning style is required to complete onboarding.';
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    value: {
      aiNickname,
      educationLevel,
      preferredLanguage,
      familiarityLevel,
      helpTopics,
      learningStyle,
      onboardingCompleted,
    },
  };
}

module.exports = {
  EDUCATION_LEVELS,
  PREFERRED_LANGUAGES,
  FAMILIARITY_LEVELS,
  LEARNING_STYLES,
  HELP_TOPICS,
  validateProfileInput,
};

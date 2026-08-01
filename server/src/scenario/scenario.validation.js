const TOPICS = new Set([
  'phishing_and_scams',
  'password_and_account_security',
  'privacy_and_personal_information',
  'misinformation_and_deepfakes',
]);

const DIFFICULTIES = new Set(['beginner', 'developing', 'intermediate', 'advanced']);

function isValidTopicCode(value) {
  return TOPICS.has(value);
}

function isValidDifficulty(value) {
  return DIFFICULTIES.has(value);
}

function normalizeSlug(value) {
  return String(value || '').trim().toLowerCase();
}

function validateDecisionInput(body) {
  const stepId = Number(body?.stepId);
  const selectedOptionKey = String(body?.selectedOptionKey || '').trim();
  const errors = {};

  if (!Number.isInteger(stepId) || stepId < 1) {
    errors.stepId = 'A valid stepId is required.';
  }
  if (!selectedOptionKey || selectedOptionKey.length > 10) {
    errors.selectedOptionKey = 'A valid selectedOptionKey is required.';
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    value: { stepId, selectedOptionKey },
  };
}

module.exports = {
  isValidDifficulty,
  isValidTopicCode,
  normalizeSlug,
  validateDecisionInput,
};

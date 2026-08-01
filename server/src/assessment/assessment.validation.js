const OPTION_KEYS = new Set(['A', 'B', 'C', 'D']);

function validateAnswerInput(input = {}) {
  const errors = {};
  const questionId = Number(input.questionId);
  const selectedOptionKey = String(input.selectedOptionKey || '').trim().toUpperCase();

  if (!Number.isInteger(questionId) || questionId < 1) {
    errors.questionId = 'Question is invalid.';
  }

  if (!OPTION_KEYS.has(selectedOptionKey)) {
    errors.selectedOptionKey = 'Selected option is invalid.';
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    value: { questionId, selectedOptionKey },
  };
}

module.exports = {
  OPTION_KEYS,
  validateAnswerInput,
};

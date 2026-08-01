const { mapProfileRow } = require('./profile.mapper');
const { validateProfileInput } = require('./profile.validation');
const { ERROR_CODES } = require('../errors/errorCodes');

function createProfileService(repository) {
  async function getProfileForUser(userId) {
    const row = await repository.findByUserId(userId);
    return mapProfileRow(row);
  }

  async function saveProfileForUser(userId, input) {
    const validation = validateProfileInput(input);
    if (!validation.ok) {
      const error = new Error('Learner profile details are invalid.');
      error.status = 400;
      error.code = ERROR_CODES.PROFILE_INVALID;
      error.errors = validation.errors;
      throw error;
    }

    const row = await repository.upsertForUser(userId, validation.value);
    return mapProfileRow(row);
  }

  return {
    getProfileForUser,
    saveProfileForUser,
  };
}

module.exports = {
  createProfileService,
};

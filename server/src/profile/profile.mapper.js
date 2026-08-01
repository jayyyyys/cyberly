function parseJsonArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function toIso(value) {
  if (!value) return null;
  return new Date(value).toISOString();
}

function emptyProfile() {
  return {
    exists: false,
    aiNickname: '',
    educationLevel: null,
    preferredLanguage: null,
    familiarityLevel: null,
    helpTopics: [],
    learningStyle: null,
    onboardingCompleted: false,
    onboardingCompletedAt: null,
    profileLastConfirmedAt: null,
  };
}

function mapProfileRow(row) {
  if (!row) return emptyProfile();

  return {
    exists: true,
    aiNickname: row.ai_nickname || '',
    educationLevel: row.education_level || null,
    preferredLanguage: row.preferred_language || null,
    familiarityLevel: row.familiarity_level || null,
    helpTopics: parseJsonArray(row.help_topics),
    learningStyle: row.learning_style || null,
    onboardingCompleted: Boolean(row.onboarding_completed),
    onboardingCompletedAt: toIso(row.onboarding_completed_at),
    profileLastConfirmedAt: toIso(row.profile_last_confirmed_at),
  };
}

module.exports = {
  emptyProfile,
  mapProfileRow,
};

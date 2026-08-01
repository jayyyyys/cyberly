const { mapProfileRow } = require('./profile.mapper');

const PROFILE_COLUMNS = `
  id,
  user_id,
  ai_nickname,
  education_level,
  preferred_language,
  familiarity_level,
  help_topics,
  learning_style,
  onboarding_completed,
  onboarding_completed_at,
  profile_last_confirmed_at,
  created_at,
  updated_at
`;

function createProfileRepository(pool) {
  async function findByUserId(userId) {
    const [rows] = await pool.query(
      `SELECT ${PROFILE_COLUMNS}
       FROM learner_profiles
       WHERE user_id = ?
       LIMIT 1`,
      [userId]
    );
    return rows[0] || null;
  }

  async function upsertForUser(userId, profile) {
    await pool.query(
      `INSERT INTO learner_profiles (
          user_id,
          ai_nickname,
          education_level,
          preferred_language,
          familiarity_level,
          help_topics,
          learning_style,
          onboarding_completed,
          onboarding_completed_at,
          profile_last_confirmed_at
       )
       VALUES (?, ?, ?, ?, ?, CAST(? AS JSON), ?, ?, IF(? = TRUE, CURRENT_TIMESTAMP, NULL), CURRENT_TIMESTAMP)
       ON DUPLICATE KEY UPDATE
          ai_nickname = VALUES(ai_nickname),
          education_level = VALUES(education_level),
          preferred_language = VALUES(preferred_language),
          familiarity_level = VALUES(familiarity_level),
          help_topics = VALUES(help_topics),
          learning_style = VALUES(learning_style),
          onboarding_completed = VALUES(onboarding_completed),
          onboarding_completed_at = CASE
            WHEN learner_profiles.onboarding_completed_at IS NULL AND VALUES(onboarding_completed) = TRUE
              THEN CURRENT_TIMESTAMP
            ELSE learner_profiles.onboarding_completed_at
          END,
          profile_last_confirmed_at = CURRENT_TIMESTAMP`,
      [
        userId,
        profile.aiNickname || null,
        profile.educationLevel || null,
        profile.preferredLanguage || null,
        profile.familiarityLevel || null,
        JSON.stringify(profile.helpTopics || []),
        profile.learningStyle || null,
        profile.onboardingCompleted,
        profile.onboardingCompleted,
      ]
    );

    return findByUserId(userId);
  }

  async function deleteByUserId(userId) {
    await pool.query('DELETE FROM learner_profiles WHERE user_id = ?', [userId]);
  }

  return {
    findByUserId,
    upsertForUser,
    deleteByUserId,
    mapProfileRow,
  };
}

module.exports = {
  createProfileRepository,
};

function createProgressRepository(pool) {
  function db(connection) {
    return connection || pool;
  }

  async function listTopicScoresForAttempt(attemptId, connection) {
    const [rows] = await db(connection).query(
      `SELECT topic_code, correct_count, total_count, percentage
       FROM assessment_topic_scores
       WHERE attempt_id = ?
       ORDER BY topic_code`,
      [attemptId]
    );
    return rows;
  }

  async function findAttemptForUser(userId, attemptId, connection) {
    const [rows] = await db(connection).query(
      `SELECT *
       FROM assessment_attempts
       WHERE id = ? AND user_id = ? AND status = 'completed'
       LIMIT 1`,
      [attemptId, userId]
    );
    return rows[0] || null;
  }

  async function findLatestCompletedInitialAttempt(userId, connection) {
    const [rows] = await db(connection).query(
      `SELECT aa.*
       FROM assessment_attempts aa
       JOIN assessment_definitions ad ON ad.id = aa.assessment_id
       WHERE aa.user_id = ?
         AND aa.status = 'completed'
         AND ad.slug = 'initial-cyber-wellness-v1'
         AND ad.version = 1
       ORDER BY aa.completed_at ASC, aa.id ASC
       LIMIT 1`,
      [userId]
    );
    return rows[0] || null;
  }

  async function findLearningPathAssessmentAttempt(userId, connection) {
    return findLatestCompletedInitialAttempt(userId, connection);
  }

  async function upsertTopicProgress(userId, topic, connection) {
    await db(connection).query(
      `INSERT INTO learner_topic_progress (
          user_id,
          topic_code,
          current_level,
          mastery_percentage,
          source_type,
          source_reference_id,
          activity_count,
          last_activity_at
       )
       VALUES (?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)
       ON DUPLICATE KEY UPDATE
          current_level = VALUES(current_level),
          mastery_percentage = VALUES(mastery_percentage),
          source_type = VALUES(source_type),
          source_reference_id = VALUES(source_reference_id),
          last_activity_at = VALUES(last_activity_at)`,
      [
        userId,
        topic.topicCode,
        topic.currentLevel,
        topic.masteryPercentage,
        topic.sourceType,
        topic.sourceReferenceId,
      ]
    );
  }

  async function applyScenarioTopicProgress(userId, topic, connection) {
    await db(connection).query(
      `INSERT INTO learner_topic_progress (
          user_id,
          topic_code,
          current_level,
          mastery_percentage,
          source_type,
          source_reference_id,
          activity_count,
          last_activity_at
       )
       VALUES (?, ?, ?, ?, 'scenario', ?, 1, CURRENT_TIMESTAMP)
       ON DUPLICATE KEY UPDATE
          mastery_percentage = LEAST(100, mastery_percentage + ?),
          current_level = CASE
            WHEN LEAST(100, mastery_percentage + ?) >= 85 THEN 'advanced'
            WHEN LEAST(100, mastery_percentage + ?) >= 70 THEN 'intermediate'
            WHEN LEAST(100, mastery_percentage + ?) >= 40 THEN 'developing'
            ELSE 'beginner'
          END,
          source_type = 'scenario',
          source_reference_id = VALUES(source_reference_id),
          activity_count = activity_count + 1,
          last_activity_at = CURRENT_TIMESTAMP`,
      [
        userId,
        topic.topicCode,
        topic.currentLevel,
        topic.masteryPercentage,
        topic.sourceReferenceId,
        topic.masteryDelta,
        topic.masteryDelta,
        topic.masteryDelta,
        topic.masteryDelta,
      ]
    );
  }

  async function createScenarioProgressEvent(userId, event, connection) {
    const [result] = await db(connection).query(
      `INSERT IGNORE INTO scenario_progress_events (
          user_id,
          scenario_attempt_id,
          topic_code,
          mastery_delta
       )
       VALUES (?, ?, ?, ?)`,
      [userId, event.scenarioAttemptId, event.topicCode, event.masteryDelta]
    );
    return result.affectedRows === 1;
  }

  async function getScenarioProgressEvent(scenarioAttemptId, connection) {
    const [rows] = await db(connection).query(
      'SELECT * FROM scenario_progress_events WHERE scenario_attempt_id = ? LIMIT 1',
      [scenarioAttemptId]
    );
    return rows[0] || null;
  }

  async function listTopicProgress(userId, connection) {
    const [rows] = await db(connection).query(
      `SELECT *
       FROM learner_topic_progress
       WHERE user_id = ?
       ORDER BY FIELD(topic_code,
         'phishing_and_scams',
         'password_and_account_security',
         'privacy_and_personal_information',
         'misinformation_and_deepfakes'
       )`,
      [userId]
    );
    return rows;
  }

  async function countUniqueCompletedScenarios(userId, connection) {
    const [rows] = await db(connection).query(
      `SELECT COUNT(DISTINCT scenario_id) AS count
       FROM scenario_attempts
       WHERE user_id = ? AND status = 'completed'`,
      [userId]
    );
    return Number(rows[0]?.count || 0);
  }

  async function countEligiblePublishedScenarios(connection) {
    const [rows] = await db(connection).query(
      `SELECT COUNT(*) AS count
       FROM scenario_definitions
       WHERE status = 'published'`
    );
    return Number(rows[0]?.count || 0);
  }

  async function countUniqueCompletedEligibleScenarios(userId, connection) {
    const [rows] = await db(connection).query(
      `SELECT COUNT(DISTINCT sa.scenario_id) AS count
       FROM scenario_attempts sa
       JOIN scenario_definitions sd ON sd.id = sa.scenario_id
       WHERE sa.user_id = ?
         AND sa.status = 'completed'
         AND sd.status = 'published'`,
      [userId]
    );
    return Number(rows[0]?.count || 0);
  }

  async function countCompletedRecommendations(userId, connection) {
    const [rows] = await db(connection).query(
      `SELECT COUNT(*) AS count
       FROM learner_recommendations
       WHERE user_id = ? AND status = 'completed'`,
      [userId]
    );
    return Number(rows[0]?.count || 0);
  }

  async function listRecentCompletedScenarioActivities(userId, limit = 5, connection) {
    const [rows] = await db(connection).query(
      `SELECT
          MAX(sa.id) AS attempt_id,
          sa.scenario_id,
          MAX(sa.completed_at) AS completed_at,
          sd.slug,
          sd.title,
          sd.topic_code
       FROM scenario_attempts sa
       JOIN scenario_definitions sd ON sd.id = sa.scenario_id
       WHERE sa.user_id = ?
         AND sa.status = 'completed'
         AND sa.completed_at IS NOT NULL
       GROUP BY sa.scenario_id, sd.slug, sd.title, sd.topic_code
       ORDER BY MAX(sa.completed_at) DESC, MAX(sa.id) DESC
       LIMIT ?`,
      [userId, Number(limit) || 5]
    );
    return rows;
  }

  async function listRecentCompletedRecommendationActivities(userId, limit = 5, connection) {
    const [rows] = await db(connection).query(
      `SELECT id, topic_code, completed_at
       FROM learner_recommendations
       WHERE user_id = ?
         AND status = 'completed'
         AND completed_at IS NOT NULL
       ORDER BY completed_at DESC, id DESC
       LIMIT ?`,
      [userId, Number(limit) || 5]
    );
    return rows;
  }

  async function upsertSummary(userId, summary, connection) {
    await db(connection).query(
      `INSERT INTO learner_progress_summary (
          user_id,
          overall_mastery_percentage,
          measured_level,
          completed_topic_count,
          total_activity_count,
          last_progress_at
       )
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON DUPLICATE KEY UPDATE
          overall_mastery_percentage = VALUES(overall_mastery_percentage),
          measured_level = VALUES(measured_level),
          completed_topic_count = VALUES(completed_topic_count),
          total_activity_count = VALUES(total_activity_count),
          last_progress_at = VALUES(last_progress_at)`,
      [
        userId,
        summary.overallMasteryPercentage,
        summary.measuredLevel,
        summary.completedTopicCount,
        summary.totalActivityCount,
      ]
    );
  }

  async function getSummary(userId, connection) {
    const [rows] = await db(connection).query(
      'SELECT * FROM learner_progress_summary WHERE user_id = ? LIMIT 1',
      [userId]
    );
    return rows[0] || null;
  }

  async function supersedeActiveRecommendations(userId, connection) {
    await db(connection).query(
      `UPDATE learner_recommendations
       SET status = 'superseded'
       WHERE user_id = ? AND status IN ('active', 'viewed')`,
      [userId]
    );
  }

  async function createRecommendation(userId, recommendation, connection) {
    const [result] = await db(connection).query(
      `INSERT INTO learner_recommendations (
          user_id,
          recommendation_type,
          topic_code,
          recommended_level,
          reason_code,
          reason_text,
          source_type,
          source_reference_id,
          status
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [
        userId,
        recommendation.recommendationType,
        recommendation.topicCode,
        recommendation.recommendedLevel,
        recommendation.reasonCode,
        recommendation.reasonText,
        recommendation.sourceType,
        recommendation.sourceReferenceId,
      ]
    );
    return findRecommendationById(result.insertId, connection);
  }

  async function getCurrentRecommendation(userId, connection) {
    const [rows] = await db(connection).query(
      `SELECT *
       FROM learner_recommendations
       WHERE user_id = ? AND status IN ('active', 'viewed')
       ORDER BY generated_at DESC, id DESC
       LIMIT 1`,
      [userId]
    );
    return rows[0] || null;
  }

  async function listScenarioRecommendationCandidates(userId, locale = 'en', connection) {
    const [rows] = await db(connection).query(
      `SELECT sd.id,
              sd.slug,
              sd.topic_code,
              sd.difficulty,
              sd.estimated_minutes,
              COALESCE(requested.title, english.title, sd.title) AS title,
              COALESCE(requested.summary, english.summary, sd.summary) AS summary,
              latest.id AS latest_attempt_id,
              latest.status AS latest_attempt_status,
              latest.result_level AS latest_result_level,
              latest.percentage AS latest_percentage
       FROM scenario_definitions sd
       LEFT JOIN scenario_definition_translations requested
         ON requested.scenario_id = sd.id AND requested.locale = ?
       LEFT JOIN scenario_definition_translations english
         ON english.scenario_id = sd.id AND english.locale = 'en'
       LEFT JOIN (
         SELECT sa.*
         FROM scenario_attempts sa
         JOIN (
           SELECT scenario_id, MAX(id) AS id
           FROM scenario_attempts
           WHERE user_id = ?
           GROUP BY scenario_id
         ) pick ON pick.id = sa.id
       ) latest ON latest.scenario_id = sd.id
       WHERE sd.status = 'published'
       ORDER BY FIELD(sd.topic_code,
          'phishing_and_scams',
          'password_and_account_security',
          'privacy_and_personal_information',
          'misinformation_and_deepfakes'
       ), FIELD(sd.difficulty, 'beginner', 'developing', 'intermediate', 'advanced'), sd.id`,
      [locale, userId]
    );
    return rows;
  }

  async function findRecommendationById(id, connection) {
    const [rows] = await db(connection).query(
      'SELECT * FROM learner_recommendations WHERE id = ? LIMIT 1',
      [id]
    );
    return rows[0] || null;
  }

  async function markRecommendationViewed(userId, id, connection) {
    await db(connection).query(
      `UPDATE learner_recommendations
       SET status = CASE WHEN status = 'active' THEN 'viewed' ELSE status END,
           viewed_at = COALESCE(viewed_at, CURRENT_TIMESTAMP)
       WHERE id = ? AND user_id = ? AND status IN ('active', 'viewed')`,
      [id, userId]
    );
    return findRecommendationById(id, connection);
  }

  async function markRecommendationCompleted(userId, id, connection) {
    await db(connection).query(
      `UPDATE learner_recommendations
       SET status = 'completed',
           completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP),
           viewed_at = COALESCE(viewed_at, CURRENT_TIMESTAMP)
       WHERE id = ? AND user_id = ? AND status IN ('active', 'viewed')`,
      [id, userId]
    );
    return findRecommendationById(id, connection);
  }

  async function withTransaction(callback) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  return {
    createRecommendation,
    applyScenarioTopicProgress,
    countCompletedRecommendations,
    countEligiblePublishedScenarios,
    countUniqueCompletedEligibleScenarios,
    countUniqueCompletedScenarios,
    createScenarioProgressEvent,
    findAttemptForUser,
    findLatestCompletedInitialAttempt,
    findLearningPathAssessmentAttempt,
    findRecommendationById,
    getCurrentRecommendation,
    getSummary,
    getScenarioProgressEvent,
    listTopicProgress,
    listScenarioRecommendationCandidates,
    listRecentCompletedRecommendationActivities,
    listRecentCompletedScenarioActivities,
    listTopicScoresForAttempt,
    markRecommendationCompleted,
    markRecommendationViewed,
    supersedeActiveRecommendations,
    upsertSummary,
    upsertTopicProgress,
    withTransaction,
  };
}

module.exports = {
  createProgressRepository,
};

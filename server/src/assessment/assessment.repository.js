const INITIAL_SLUG = 'initial-cyber-wellness-v1';

function parseOptions(value) {
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

function createAssessmentRepository(pool) {
  function db(connection) {
    return connection || pool;
  }

  async function getPublishedInitialAssessment(locale = 'en', connection) {
    const [rows] = await db(connection).query(
      `SELECT ad.id,
              ad.slug,
              COALESCE(requested.title, english.title, ad.title) AS title,
              COALESCE(requested.description, english.description, ad.description) AS description,
              ad.assessment_type,
              ad.version,
              ad.status,
              ad.question_count,
              ad.created_at,
              ad.updated_at
       FROM assessment_definitions ad
       LEFT JOIN assessment_definition_translations requested
         ON requested.assessment_id = ad.id AND requested.locale = ?
       LEFT JOIN assessment_definition_translations english
         ON english.assessment_id = ad.id AND english.locale = 'en'
       WHERE ad.slug = ? AND ad.assessment_type = 'initial' AND ad.version = 1 AND ad.status = 'published'
       LIMIT 1`,
      [locale, INITIAL_SLUG]
    );
    return rows[0] || null;
  }

  async function withLocalizedOptions(rows, locale, connection) {
    if (!rows.length) return rows;

    const questionIds = rows.map(row => row.id);
    const [translations] = await db(connection).query(
      `SELECT question_id, option_key, locale, text
       FROM assessment_option_translations
       WHERE question_id IN (?) AND locale IN (?, 'en')`,
      [questionIds, locale]
    );

    const textByQuestionOption = new Map();
    for (const translation of translations) {
      const key = `${translation.question_id}:${translation.option_key}`;
      const existing = textByQuestionOption.get(key) || {};
      existing[translation.locale] = translation.text;
      textByQuestionOption.set(key, existing);
    }

    return rows.map(row => {
      const localizedOptions = parseOptions(row.options_json).map(option => {
        const translationsForOption = textByQuestionOption.get(`${row.id}:${option.key}`) || {};
        return {
          ...option,
          text: translationsForOption[locale] || translationsForOption.en || option.text,
        };
      });

      return {
        ...row,
        localized_options_json: localizedOptions,
      };
    });
  }

  async function listPublishedQuestions(assessmentId, locale = 'en', connection) {
    const [rows] = await db(connection).query(
      `SELECT aq.id,
              aq.assessment_id,
              aq.topic_code,
              COALESCE(requested.prompt, english.prompt, aq.prompt) AS prompt,
              aq.options_json,
              aq.correct_option_key,
              COALESCE(requested.explanation, english.explanation, aq.explanation) AS explanation,
              aq.difficulty,
              aq.display_order,
              aq.status,
              aq.created_at,
              aq.updated_at
       FROM assessment_questions aq
       LEFT JOIN assessment_question_translations requested
         ON requested.question_id = aq.id AND requested.locale = ?
       LEFT JOIN assessment_question_translations english
         ON english.question_id = aq.id AND english.locale = 'en'
       WHERE aq.assessment_id = ? AND aq.status = 'published'
       ORDER BY aq.display_order`,
      [locale, assessmentId]
    );
    return withLocalizedOptions(rows, locale, connection);
  }

  async function listTopics(assessmentId, connection) {
    const [rows] = await db(connection).query(
      `SELECT topic_code, COUNT(*) AS question_count
       FROM assessment_questions
       WHERE assessment_id = ? AND status = 'published'
       GROUP BY topic_code
       ORDER BY MIN(display_order)`,
      [assessmentId]
    );
    return rows;
  }

  async function findLatestCompletedAttempt(userId, assessmentId, connection) {
    const [rows] = await db(connection).query(
      `SELECT *
       FROM assessment_attempts
       WHERE user_id = ? AND assessment_id = ? AND status = 'completed'
       ORDER BY completed_at ASC, id ASC
       LIMIT 1`,
      [userId, assessmentId]
    );
    return rows[0] || null;
  }

  async function findInProgressAttempt(userId, assessmentId, connection) {
    const [rows] = await db(connection).query(
      `SELECT *
       FROM assessment_attempts
       WHERE user_id = ? AND assessment_id = ? AND status = 'in_progress'
       ORDER BY started_at DESC, id DESC
       LIMIT 1`,
      [userId, assessmentId]
    );
    return rows[0] || null;
  }

  async function createAttempt(userId, assessmentId, connection) {
    const [result] = await db(connection).query(
      `INSERT INTO assessment_attempts (user_id, assessment_id, status, maximum_score)
       VALUES (?, ?, 'in_progress', NULL)`,
      [userId, assessmentId]
    );
    return findAttemptById(result.insertId, connection);
  }

  async function findAttemptById(attemptId, connection) {
    const [rows] = await db(connection).query(
      'SELECT * FROM assessment_attempts WHERE id = ? LIMIT 1',
      [attemptId]
    );
    return rows[0] || null;
  }

  async function listAnswers(attemptId, connection) {
    const [rows] = await db(connection).query(
      `SELECT *
       FROM assessment_answers
       WHERE attempt_id = ?
       ORDER BY question_id`,
      [attemptId]
    );
    return rows;
  }

  async function findQuestionForAssessment(questionId, assessmentId, connection) {
    const [rows] = await db(connection).query(
      `SELECT *
       FROM assessment_questions
       WHERE id = ? AND assessment_id = ? AND status = 'published'
       LIMIT 1`,
      [questionId, assessmentId]
    );
    return rows[0] || null;
  }

  async function upsertAnswer(attemptId, questionId, selectedOptionKey, connection) {
    await db(connection).query(
      `INSERT INTO assessment_answers (attempt_id, question_id, selected_option_key, is_correct, awarded_score)
       VALUES (?, ?, ?, NULL, NULL)
       ON DUPLICATE KEY UPDATE
          selected_option_key = VALUES(selected_option_key),
          is_correct = NULL,
          awarded_score = NULL,
          answered_at = CURRENT_TIMESTAMP`,
      [attemptId, questionId, selectedOptionKey]
    );
  }

  async function updateAnswerScores(attemptId, scoredAnswers, connection) {
    for (const answer of scoredAnswers) {
      await db(connection).query(
        `UPDATE assessment_answers
         SET is_correct = ?, awarded_score = ?
         WHERE attempt_id = ? AND question_id = ?`,
        [answer.isCorrect, answer.awardedScore, attemptId, answer.questionId]
      );
    }
  }

  async function replaceTopicScores(attemptId, topicScores, connection) {
    await db(connection).query('DELETE FROM assessment_topic_scores WHERE attempt_id = ?', [attemptId]);
    for (const topic of topicScores) {
      await db(connection).query(
        `INSERT INTO assessment_topic_scores (attempt_id, topic_code, correct_count, total_count, percentage)
         VALUES (?, ?, ?, ?, ?)`,
        [attemptId, topic.topicCode, topic.correctCount, topic.totalCount, topic.percentage]
      );
    }
  }

  async function completeAttempt(attemptId, score, connection) {
    await db(connection).query(
      `UPDATE assessment_attempts
       SET status = 'completed',
           completed_at = CURRENT_TIMESTAMP,
           total_score = ?,
           maximum_score = ?,
           percentage = ?,
           measured_level = ?
       WHERE id = ? AND status = 'in_progress'`,
      [score.totalScore, score.maximumScore, score.percentage, score.measuredLevel, attemptId]
    );
    return findAttemptById(attemptId, connection);
  }

  async function listTopicScores(attemptId, connection) {
    const [rows] = await db(connection).query(
      `SELECT *
       FROM assessment_topic_scores
       WHERE attempt_id = ?
       ORDER BY topic_code`,
      [attemptId]
    );
    return rows;
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
    createAttempt,
    completeAttempt,
    findAttemptById,
    findInProgressAttempt,
    findLatestCompletedAttempt,
    findQuestionForAssessment,
    getPublishedInitialAssessment,
    listAnswers,
    listPublishedQuestions,
    listTopicScores,
    listTopics,
    replaceTopicScores,
    updateAnswerScores,
    upsertAnswer,
    withTransaction,
  };
}

module.exports = {
  INITIAL_SLUG,
  createAssessmentRepository,
};

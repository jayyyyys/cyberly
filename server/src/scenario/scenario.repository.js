function createScenarioRepository(pool) {
  function db(connection) {
    return connection || pool;
  }

  function localizeOptions(optionsValue, translations, locale) {
    const options = Array.isArray(optionsValue) ? optionsValue : JSON.parse(optionsValue || '[]');
    return options.map(option => {
      const translated = translations.get(option.key) || {};
      return {
        ...option,
        text: translated[locale]?.text || translated.en?.text || option.text,
        feedback: translated[locale]?.feedback || translated.en?.feedback || option.feedback,
        safetyExplanation: translated[locale]?.safety_explanation || translated.en?.safety_explanation || option.safetyExplanation,
      };
    });
  }

  async function localizeSteps(rows, locale, connection) {
    if (!rows.length) return rows;
    const stepIds = rows.map(row => row.id);
    const [optionTranslations] = await db(connection).query(
      `SELECT step_id, option_key, locale, text, feedback, safety_explanation
       FROM scenario_option_translations
       WHERE step_id IN (?) AND locale IN (?, 'en')`,
      [stepIds, locale]
    );
    const optionsByStep = new Map();
    for (const translation of optionTranslations) {
      const stepMap = optionsByStep.get(Number(translation.step_id)) || new Map();
      const optionTranslationsByLocale = stepMap.get(translation.option_key) || {};
      optionTranslationsByLocale[translation.locale] = translation;
      stepMap.set(translation.option_key, optionTranslationsByLocale);
      optionsByStep.set(Number(translation.step_id), stepMap);
    }

    return rows.map(row => ({
      ...row,
      situation_text: row.requested_situation_text || row.english_situation_text || row.situation_text,
      prompt_text: row.requested_prompt_text || row.english_prompt_text || row.prompt_text,
      options_json: localizeOptions(row.options_json, optionsByStep.get(Number(row.id)) || new Map(), locale),
    }));
  }

  async function listPublishedScenarios(filters = {}, userId, locale = 'en', connection) {
    const conditions = ["sd.status = 'published'"];
    const params = [];
    if (filters.topicCode) {
      conditions.push('sd.topic_code = ?');
      params.push(filters.topicCode);
    }
    if (filters.difficulty) {
      conditions.push('sd.difficulty = ?');
      params.push(filters.difficulty);
    }

    const [rows] = await db(connection).query(
      `SELECT sd.*,
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
       WHERE ${conditions.join(' AND ')}
       ORDER BY FIELD(sd.topic_code,
          'phishing_and_scams',
          'password_and_account_security',
          'privacy_and_personal_information',
          'misinformation_and_deepfakes'
       ), FIELD(sd.difficulty, 'beginner', 'developing', 'intermediate', 'advanced'), sd.id`,
      [locale, userId, ...params]
    );
    return rows;
  }

  async function findPublishedBySlug(slug, locale = 'en', connection) {
    const [rows] = await db(connection).query(
      `SELECT sd.*,
              COALESCE(requested.title, english.title, sd.title) AS title,
              COALESCE(requested.summary, english.summary, sd.summary) AS summary
       FROM scenario_definitions sd
       LEFT JOIN scenario_definition_translations requested
         ON requested.scenario_id = sd.id AND requested.locale = ?
       LEFT JOIN scenario_definition_translations english
         ON english.scenario_id = sd.id AND english.locale = 'en'
       WHERE sd.slug = ? AND sd.status = 'published'
       ORDER BY sd.version DESC
       LIMIT 1`,
      [locale, slug]
    );
    return rows[0] || null;
  }

  async function getLocaleResolution(scenarioId, requestedLocale = 'en', connection) {
    const [rows] = await db(connection).query(
      `SELECT locale
       FROM scenario_definition_translations
       WHERE scenario_id = ? AND locale IN (?, 'en')
       ORDER BY FIELD(locale, ?, 'en')
       LIMIT 1`,
      [scenarioId, requestedLocale, requestedLocale]
    );
    const resolvedLocale = rows[0]?.locale || 'en';
    return {
      requestedLocale,
      resolvedLocale,
      fallbackUsed: resolvedLocale !== requestedLocale,
    };
  }

  async function findScenarioById(id, locale = 'en', connection) {
    const [rows] = await db(connection).query(
      `SELECT sd.*,
              COALESCE(requested.title, english.title, sd.title) AS title,
              COALESCE(requested.summary, english.summary, sd.summary) AS summary
       FROM scenario_definitions sd
       LEFT JOIN scenario_definition_translations requested
         ON requested.scenario_id = sd.id AND requested.locale = ?
       LEFT JOIN scenario_definition_translations english
         ON english.scenario_id = sd.id AND english.locale = 'en'
       WHERE sd.id = ?
       LIMIT 1`,
      [locale, id]
    );
    return rows[0] || null;
  }

  async function listSteps(scenarioId, locale = 'en', connection) {
    const [rows] = await db(connection).query(
      `SELECT ss.*,
              requested.situation_text AS requested_situation_text,
              requested.prompt_text AS requested_prompt_text,
              english.situation_text AS english_situation_text,
              english.prompt_text AS english_prompt_text
       FROM scenario_steps ss
       LEFT JOIN scenario_step_translations requested
         ON requested.step_id = ss.id AND requested.locale = ?
       LEFT JOIN scenario_step_translations english
         ON english.step_id = ss.id AND english.locale = 'en'
       WHERE ss.scenario_id = ?
       ORDER BY ss.step_order`,
      [locale, scenarioId]
    );
    return localizeSteps(rows, locale, connection);
  }

  async function findStep(stepId, locale = 'en', connection) {
    const [rows] = await db(connection).query(
      `SELECT ss.*,
              requested.situation_text AS requested_situation_text,
              requested.prompt_text AS requested_prompt_text,
              english.situation_text AS english_situation_text,
              english.prompt_text AS english_prompt_text
       FROM scenario_steps ss
       LEFT JOIN scenario_step_translations requested
         ON requested.step_id = ss.id AND requested.locale = ?
       LEFT JOIN scenario_step_translations english
         ON english.step_id = ss.id AND english.locale = 'en'
       WHERE ss.id = ?
       LIMIT 1`,
      [locale, stepId]
    );
    return (await localizeSteps(rows, locale, connection))[0] || null;
  }

  async function findStepByOrder(scenarioId, stepOrder, locale = 'en', connection) {
    const [rows] = await db(connection).query(
      `SELECT ss.*,
              requested.situation_text AS requested_situation_text,
              requested.prompt_text AS requested_prompt_text,
              english.situation_text AS english_situation_text,
              english.prompt_text AS english_prompt_text
       FROM scenario_steps ss
       LEFT JOIN scenario_step_translations requested
         ON requested.step_id = ss.id AND requested.locale = ?
       LEFT JOIN scenario_step_translations english
         ON english.step_id = ss.id AND english.locale = 'en'
       WHERE ss.scenario_id = ? AND ss.step_order = ?
       LIMIT 1`,
      [locale, scenarioId, stepOrder]
    );
    return (await localizeSteps(rows, locale, connection))[0] || null;
  }

  async function findInProgressAttempt(userId, scenarioId, connection) {
    const [rows] = await db(connection).query(
      `SELECT *
       FROM scenario_attempts
       WHERE user_id = ? AND scenario_id = ? AND status = 'in_progress'
       ORDER BY started_at DESC, id DESC
       LIMIT 1`,
      [userId, scenarioId]
    );
    return rows[0] || null;
  }

  async function createAttempt(userId, scenarioId, connection) {
    const [result] = await db(connection).query(
      `INSERT INTO scenario_attempts (user_id, scenario_id, status, current_step_order)
       VALUES (?, ?, 'in_progress', 1)`,
      [userId, scenarioId]
    );
    return findAttemptById(result.insertId, connection);
  }

  async function findAttemptById(attemptId, connection) {
    const [rows] = await db(connection).query(
      'SELECT * FROM scenario_attempts WHERE id = ? LIMIT 1',
      [attemptId]
    );
    return rows[0] || null;
  }

  async function listDecisions(attemptId, connection) {
    const [rows] = await db(connection).query(
      `SELECT *
       FROM scenario_decisions
       WHERE attempt_id = ?
       ORDER BY id`,
      [attemptId]
    );
    return rows;
  }

  async function findDecision(attemptId, stepId, connection) {
    const [rows] = await db(connection).query(
      `SELECT *
       FROM scenario_decisions
       WHERE attempt_id = ? AND step_id = ?
       LIMIT 1`,
      [attemptId, stepId]
    );
    return rows[0] || null;
  }

  async function createDecision(attemptId, decision, connection) {
    const [result] = await db(connection).query(
      `INSERT INTO scenario_decisions (attempt_id, step_id, selected_option_key, awarded_score, outcome_code)
       VALUES (?, ?, ?, ?, ?)`,
      [
        attemptId,
        decision.stepId,
        decision.selectedOptionKey,
        decision.awardedScore,
        decision.outcomeCode,
      ]
    );
    const [rows] = await db(connection).query(
      'SELECT * FROM scenario_decisions WHERE id = ? LIMIT 1',
      [result.insertId]
    );
    return rows[0];
  }

  async function updateCurrentStep(attemptId, currentStepOrder, connection) {
    await db(connection).query(
      `UPDATE scenario_attempts
       SET current_step_order = ?
       WHERE id = ? AND status = 'in_progress'`,
      [currentStepOrder, attemptId]
    );
    return findAttemptById(attemptId, connection);
  }

  async function completeAttempt(attemptId, score, connection) {
    await db(connection).query(
      `UPDATE scenario_attempts
       SET status = 'completed',
           current_step_order = current_step_order,
           total_score = ?,
           maximum_score = ?,
           percentage = ?,
           result_level = ?,
           completed_at = CURRENT_TIMESTAMP
       WHERE id = ? AND status = 'in_progress'`,
      [score.totalScore, score.maximumScore, score.percentage, score.resultLevel, attemptId]
    );
    return findAttemptById(attemptId, connection);
  }

  async function getProgressEventForAttempt(attemptId, connection) {
    const [rows] = await db(connection).query(
      'SELECT * FROM scenario_progress_events WHERE scenario_attempt_id = ? LIMIT 1',
      [attemptId]
    );
    return rows[0] || null;
  }

  async function listCompletedScenarioStats(userId, locale = 'en', connection) {
    const [rows] = await db(connection).query(
      `SELECT COUNT(*) AS completed_count
       FROM scenario_attempts
       WHERE user_id = ? AND status = 'completed'`,
      [userId]
    );
    const [latest] = await db(connection).query(
      `SELECT sa.*,
              COALESCE(requested.title, english.title, sd.title) AS title,
              sd.slug,
              sd.topic_code,
              sd.difficulty
       FROM scenario_attempts sa
       JOIN scenario_definitions sd ON sd.id = sa.scenario_id
       LEFT JOIN scenario_definition_translations requested
         ON requested.scenario_id = sd.id AND requested.locale = ?
       LEFT JOIN scenario_definition_translations english
         ON english.scenario_id = sd.id AND english.locale = 'en'
       WHERE sa.user_id = ? AND sa.status = 'completed'
       ORDER BY sa.completed_at DESC, sa.id DESC
       LIMIT 1`,
      [locale, userId]
    );
    const [inProgress] = await db(connection).query(
      `SELECT sa.*,
              COALESCE(requested.title, english.title, sd.title) AS title,
              sd.slug,
              sd.topic_code,
              sd.difficulty
       FROM scenario_attempts sa
       JOIN scenario_definitions sd ON sd.id = sa.scenario_id
       LEFT JOIN scenario_definition_translations requested
         ON requested.scenario_id = sd.id AND requested.locale = ?
       LEFT JOIN scenario_definition_translations english
         ON english.scenario_id = sd.id AND english.locale = 'en'
       WHERE sa.user_id = ? AND sa.status = 'in_progress'
       ORDER BY sa.started_at DESC, sa.id DESC
       LIMIT 1`,
      [locale, userId]
    );
    return {
      completedCount: rows[0].completed_count,
      latestCompleted: latest[0] || null,
      inProgress: inProgress[0] || null,
    };
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
    completeAttempt,
    createAttempt,
    createDecision,
    findAttemptById,
    findDecision,
    findInProgressAttempt,
    findPublishedBySlug,
    findScenarioById,
    findStep,
    findStepByOrder,
    getProgressEventForAttempt,
    getLocaleResolution,
    listCompletedScenarioStats,
    listDecisions,
    listPublishedScenarios,
    listSteps,
    updateCurrentStep,
    withTransaction,
  };
}

module.exports = {
  createScenarioRepository,
};

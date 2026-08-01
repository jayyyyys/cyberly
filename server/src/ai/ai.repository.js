const CONVERSATION_COLUMNS = `
  c.id,
  c.user_id,
  c.title,
  c.locale,
  c.last_message_at,
  c.created_at,
  c.updated_at,
  COUNT(m.id) AS message_count
`;

const ALLOWED_ACTION_TYPES = new Set(['resource', 'scenario', 'progress', 'assessment', 'resources', 'scenarios']);
const ALLOWED_TARGET_FIELDS = new Set(['page', 'resourceId', 'resourceSlug', 'scenarioId', 'scenarioSlug', 'sectionId']);
const ALLOWED_TARGET_PAGES = new Set(['resources', 'scenarios', 'progress', 'assessment']);
const ALLOWED_SOURCE_TARGET_PAGES = new Set(['resources']);

function sanitizeAction(action) {
  if (!action || !ALLOWED_ACTION_TYPES.has(action.type)) {
    throw new Error('Invalid chat action type.');
  }
  if (!action.target || !ALLOWED_TARGET_PAGES.has(action.target.page)) {
    throw new Error('Invalid chat action target.');
  }

  const target = {};
  for (const [key, value] of Object.entries(action.target)) {
    if (ALLOWED_TARGET_FIELDS.has(key)) target[key] = value;
  }
  if (!target.page) throw new Error('Invalid chat action target.');

  return {
    type: action.type,
    labelKey: String(action.labelKey || '').slice(0, 120),
    title: action.title ? String(action.title).slice(0, 255) : null,
    description: action.description ? String(action.description) : null,
    target,
    displayOrder: Number(action.displayOrder || 0),
  };
}

function sanitizeSource(source, index) {
  if (!source || !source.title || !source.snippet) {
    throw new Error('Invalid chat message source.');
  }
  const target = {};
  if (source.internalTarget && ALLOWED_SOURCE_TARGET_PAGES.has(source.internalTarget.page)) {
    target.page = source.internalTarget.page;
    if (source.internalTarget.resourceSlug) target.resourceSlug = String(source.internalTarget.resourceSlug);
    if (source.internalTarget.resourceId !== undefined && source.internalTarget.resourceId !== null) {
      const resourceId = Number(source.internalTarget.resourceId);
      if (Number.isInteger(resourceId) && resourceId > 0) target.resourceId = resourceId;
    }
  }

  return {
    documentId: Number.isInteger(Number(source.documentId)) ? Number(source.documentId) : null,
    chunkId: Number.isInteger(Number(source.chunkId)) ? Number(source.chunkId) : null,
    citationOrder: Number(source.citationOrder || index + 1),
    title: String(source.title).slice(0, 255),
    sourceLabel: source.sourceLabel ? String(source.sourceLabel).slice(0, 255) : null,
    sourceOrganisation: source.sourceOrganisation ? String(source.sourceOrganisation).slice(0, 255) : null,
    sourceUrl: source.sourceUrl ? String(source.sourceUrl) : null,
    locale: source.locale ? String(source.locale).slice(0, 10) : null,
    snippet: String(source.snippet).slice(0, 800),
    internalTarget: target.page ? target : null,
  };
}

function createAiRepository(pool) {
  function db(connection) {
    return connection || pool;
  }

  async function findConversationForUser(userId, conversationId, connection) {
    const [rows] = await db(connection).query(
      `SELECT ${CONVERSATION_COLUMNS}
       FROM chat_conversations c
       LEFT JOIN chat_messages m ON m.conversation_id = c.id
       WHERE c.id = ? AND c.user_id = ?
       GROUP BY c.id
       LIMIT 1`,
      [conversationId, userId]
    );
    return rows[0] || null;
  }

  async function findMessage(conversationId, messageId, connection) {
    const [rows] = await db(connection).query(
      `SELECT id, conversation_id, role, content, locale, reply_to_message_id, created_at
       FROM chat_messages
       WHERE id = ? AND conversation_id = ?
       LIMIT 1`,
      [messageId, conversationId]
    );
    return rows[0] || null;
  }

  async function listLatestMessages(conversationId, limit, connection) {
    const [rows] = await db(connection).query(
      `SELECT id, conversation_id, role, content, locale, reply_to_message_id, created_at
       FROM chat_messages
       WHERE conversation_id = ?
         AND role IN ('user', 'assistant')
       ORDER BY id DESC
       LIMIT ?`,
      [conversationId, limit]
    );
    return rows.reverse();
  }

  async function loadLearnerContextData(userId, connection) {
    const [profiles] = await db(connection).query(
      `SELECT education_level
       FROM learner_profiles
       WHERE user_id = ?
       LIMIT 1`,
      [userId]
    );

    const [assessments] = await db(connection).query(
      `SELECT aa.id, aa.percentage, aa.measured_level, aa.completed_at
       FROM assessment_attempts aa
       JOIN assessment_definitions ad ON ad.id = aa.assessment_id
       WHERE aa.user_id = ?
         AND aa.status = 'completed'
         AND ad.slug = 'initial-cyber-wellness-v1'
       ORDER BY aa.completed_at DESC, aa.id DESC
       LIMIT 1`,
      [userId]
    );
    const assessment = assessments[0] || null;

    let assessmentTopicScores = [];
    if (assessment) {
      [assessmentTopicScores] = await db(connection).query(
        `SELECT topic_code, percentage
         FROM assessment_topic_scores
         WHERE attempt_id = ?
         ORDER BY topic_code`,
        [assessment.id]
      );
    }

    const [scenarios] = await db(connection).query(
      `SELECT sd.topic_code, sa.percentage, sa.result_level, sa.completed_at
       FROM scenario_attempts sa
       JOIN scenario_definitions sd ON sd.id = sa.scenario_id
       WHERE sa.user_id = ?
         AND sa.status = 'completed'
         AND sa.percentage IS NOT NULL
       ORDER BY sa.completed_at DESC, sa.id DESC
       LIMIT 12`,
      [userId]
    );

    const [topicProgress] = await db(connection).query(
      `SELECT topic_code, mastery_percentage, current_level, activity_count
       FROM learner_topic_progress
       WHERE user_id = ?
       ORDER BY topic_code`,
      [userId]
    );

    const [recommendations] = await db(connection).query(
      `SELECT topic_code, recommended_level, reason_code
       FROM learner_recommendations
       WHERE user_id = ?
         AND status IN ('active', 'viewed')
       ORDER BY generated_at DESC, id DESC
       LIMIT 1`,
      [userId]
    );

    return {
      profile: profiles[0] || null,
      assessment,
      assessmentTopicScores,
      scenarios,
      topicProgress,
      recommendation: recommendations[0] || null,
    };
  }

  async function loadLearningActionData(userId, locale, connection) {
    const [resources] = await db(connection).query(
      `SELECT ra.id,
              ra.slug,
              ra.category_code,
              ra.display_order,
              COALESCE(requested.title, english.title) AS title,
              COALESCE(requested.summary, english.summary) AS summary
       FROM resource_articles ra
       LEFT JOIN resource_article_translations requested
         ON requested.resource_id = ra.id AND requested.locale = ?
       JOIN resource_article_translations english
         ON english.resource_id = ra.id AND english.locale = 'en'
       WHERE ra.status = 'published'
       ORDER BY ra.display_order, ra.id`,
      [locale]
    );

    const [scenarios] = await db(connection).query(
      `SELECT sd.id,
              sd.slug,
              sd.topic_code,
              sd.difficulty,
              COALESCE(completed.completed_count, 0) AS completed_count,
              COALESCE(requested.title, english.title, sd.title) AS title,
              COALESCE(requested.summary, english.summary, sd.summary) AS summary
       FROM scenario_definitions sd
       LEFT JOIN scenario_definition_translations requested
         ON requested.scenario_id = sd.id AND requested.locale = ?
       LEFT JOIN scenario_definition_translations english
         ON english.scenario_id = sd.id AND english.locale = 'en'
       LEFT JOIN (
         SELECT scenario_id, COUNT(*) AS completed_count
         FROM scenario_attempts
         WHERE user_id = ?
           AND status = 'completed'
         GROUP BY scenario_id
       ) completed ON completed.scenario_id = sd.id
       WHERE sd.status = 'published'
       ORDER BY FIELD(sd.topic_code,
          'phishing_and_scams',
          'password_and_account_security',
          'privacy_and_personal_information',
          'misinformation_and_deepfakes'
       ), FIELD(sd.difficulty, 'beginner', 'developing', 'intermediate', 'advanced'), sd.id`,
      [locale, userId]
    );

    const [recommendations] = await db(connection).query(
      `SELECT id,
              topic_code,
              recommended_level,
              reason_code,
              status
       FROM learner_recommendations
       WHERE user_id = ?
         AND status IN ('active', 'viewed')
       ORDER BY generated_at DESC, id DESC
       LIMIT 1`,
      [userId]
    );

    return { resources, scenarios, recommendations };
  }

  async function findGenerationByUserMessage(userMessageId, connection) {
    const [rows] = await db(connection).query(
      `SELECT *
       FROM chat_message_generations
       WHERE user_message_id = ?
       LIMIT 1`,
      [userMessageId]
    );
    return rows[0] || null;
  }

  async function createGeneration(conversationId, userMessageId, provider, model, connection) {
    await db(connection).query(
      `INSERT IGNORE INTO chat_message_generations (
          conversation_id,
          user_message_id,
          status,
          provider,
          model
       )
       VALUES (?, ?, 'pending', ?, ?)`,
      [conversationId, userMessageId, provider, model]
    );
    return findGenerationByUserMessage(userMessageId, connection);
  }

  async function markGenerationInProgress(generationId, connection) {
    await db(connection).query(
      `UPDATE chat_message_generations
       SET status = 'in_progress',
           error_code = NULL,
           provider_request_id = NULL,
           input_tokens = NULL,
           output_tokens = NULL,
           estimated_cost_usd = NULL,
           duration_ms = NULL,
           completed_at = NULL
       WHERE id = ?`,
      [generationId]
    );
    const [rows] = await db(connection).query('SELECT * FROM chat_message_generations WHERE id = ? LIMIT 1', [generationId]);
    return rows[0] || null;
  }

  async function markGenerationFailed(generationId, errorCode, durationMs, connection) {
    await db(connection).query(
      `UPDATE chat_message_generations
       SET status = 'failed',
           error_code = ?,
           duration_ms = ?
       WHERE id = ?`,
      [errorCode, durationMs, generationId]
    );
    const [rows] = await db(connection).query('SELECT * FROM chat_message_generations WHERE id = ? LIMIT 1', [generationId]);
    return rows[0] || null;
  }

  async function findAssistantMessage(messageId, connection) {
    if (!messageId) return null;
    const [rows] = await db(connection).query(
      `SELECT id, conversation_id, role, content, locale, reply_to_message_id, created_at
       FROM chat_messages
       WHERE id = ?
       LIMIT 1`,
      [messageId]
    );
    return rows[0] || null;
  }

  async function insertMessageActions(conversationId, messageId, actions, connection) {
    if (!actions.length) return [];
    const safeActions = actions.map(sanitizeAction);
    await db(connection).query(
      `DELETE FROM chat_message_actions
       WHERE message_id = ?`,
      [messageId]
    );

    const values = safeActions.map(action => [
      conversationId,
      messageId,
      action.type,
      action.labelKey,
      action.title,
      action.description,
      JSON.stringify(action.target),
      action.displayOrder,
    ]);

    await db(connection).query(
      `INSERT INTO chat_message_actions (
          conversation_id,
          message_id,
          action_type,
          label_key,
          title,
          description,
          target_json,
          display_order
       )
       VALUES ?`,
      [values]
    );

    return listActionsForMessageIds([messageId], connection);
  }

  async function listActionsForMessageIds(messageIds, connection) {
    const ids = messageIds.map(Number).filter(Number.isInteger);
    if (!ids.length) return [];
    const [rows] = await db(connection).query(
      `SELECT id,
              conversation_id,
              message_id,
              action_type,
              label_key,
              title,
              description,
              target_json,
              display_order,
              created_at
       FROM chat_message_actions
       WHERE message_id IN (?)
       ORDER BY message_id, display_order, id`,
      [ids]
    );
    return rows;
  }

  async function insertMessageSources(conversationId, messageId, sources, connection) {
    await db(connection).query(
      `DELETE FROM chat_message_sources
       WHERE message_id = ?`,
      [messageId]
    );
    if (!sources.length) return [];

    const safeSources = sources.map(sanitizeSource);
    const values = safeSources.map(source => [
      conversationId,
      messageId,
      source.documentId,
      source.chunkId,
      source.citationOrder,
      source.title,
      source.sourceLabel,
      source.sourceOrganisation,
      source.sourceUrl,
      source.locale,
      source.snippet,
      source.internalTarget ? JSON.stringify(source.internalTarget) : null,
    ]);

    await db(connection).query(
      `INSERT INTO chat_message_sources (
          conversation_id,
          message_id,
          document_id,
          chunk_id,
          citation_order,
          source_title,
          source_label,
          source_organisation,
          source_url,
          source_locale,
          snippet,
          internal_target_json
       )
       VALUES ?`,
      [values]
    );

    return listSourcesForMessageIds([messageId], connection);
  }

  async function listSourcesForMessageIds(messageIds, connection) {
    const ids = messageIds.map(Number).filter(Number.isInteger);
    if (!ids.length) return [];
    const [rows] = await db(connection).query(
      `SELECT id,
              conversation_id,
              message_id,
              source_title,
              source_label,
              source_organisation,
              source_url,
              source_locale,
              snippet,
              internal_target_json,
              citation_order,
              created_at
       FROM chat_message_sources
       WHERE message_id IN (?)
       ORDER BY message_id, citation_order, id`,
      [ids]
    );
    return rows;
  }

  async function completeGeneration(userId, generation, assistant, usage, connection) {
    const [messageResult] = await db(connection).query(
      `INSERT INTO chat_messages (conversation_id, role, content, locale, reply_to_message_id)
       VALUES (?, 'assistant', ?, ?, ?)`,
      [generation.conversation_id, assistant.content, assistant.locale || null, generation.user_message_id]
    );

    await db(connection).query(
      `UPDATE chat_message_generations
       SET status = 'completed',
           assistant_message_id = ?,
           provider_request_id = ?,
           error_code = NULL,
           input_tokens = ?,
           output_tokens = ?,
           estimated_cost_usd = ?,
           duration_ms = ?,
           completed_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        messageResult.insertId,
        usage.providerRequestId,
        usage.inputTokens,
        usage.outputTokens,
        usage.estimatedCostUsd,
        usage.durationMs,
        generation.id,
      ]
    );

    await db(connection).query(
      `UPDATE chat_conversations
       SET last_message_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [generation.conversation_id, userId]
    );

    const [generationRows] = await db(connection).query('SELECT * FROM chat_message_generations WHERE id = ? LIMIT 1', [generation.id]);
    const [messageRows] = await db(connection).query(
      `SELECT id, conversation_id, role, content, locale, reply_to_message_id, created_at
       FROM chat_messages
       WHERE id = ?
       LIMIT 1`,
      [messageResult.insertId]
    );
    return {
      generation: generationRows[0] || null,
      assistantMessage: messageRows[0] || null,
      conversation: await findConversationForUser(userId, generation.conversation_id, connection),
    };
  }

  async function countInProgressForUser(userId, staleCutoff, connection) {
    const staleFilter = staleCutoff ? ' AND g.updated_at >= ?' : '';
    const params = staleCutoff ? [userId, staleCutoff] : [userId];
    const [rows] = await db(connection).query(
      `SELECT COUNT(*) AS count
       FROM chat_message_generations g
       JOIN chat_conversations c ON c.id = g.conversation_id
       WHERE c.user_id = ?
         AND g.status = 'in_progress'${staleFilter}`,
      params
    );
    return Number(rows[0]?.count || 0);
  }

  async function sumEstimatedCostToday(connection) {
    const [rows] = await db(connection).query(
      `SELECT COALESCE(SUM(estimated_cost_usd), 0) AS total
       FROM chat_message_generations
       WHERE completed_at >= CURRENT_DATE`
    );
    return Number(rows[0]?.total || 0);
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
    completeGeneration,
    countInProgressForUser,
    createGeneration,
    findAssistantMessage,
    findConversationForUser,
    findGenerationByUserMessage,
    findMessage,
    insertMessageActions,
    insertMessageSources,
    loadLearnerContextData,
    loadLearningActionData,
    listActionsForMessageIds,
    listLatestMessages,
    listSourcesForMessageIds,
    markGenerationFailed,
    markGenerationInProgress,
    sumEstimatedCostToday,
    withTransaction,
  };
}

module.exports = {
  createAiRepository,
};

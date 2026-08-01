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

function createChatRepository(pool) {
  function db(connection) {
    return connection || pool;
  }

  async function listConversations(userId, limit, connection) {
    const [rows] = await db(connection).query(
      `SELECT ${CONVERSATION_COLUMNS}
       FROM chat_conversations c
       LEFT JOIN chat_messages m ON m.conversation_id = c.id
       WHERE c.user_id = ?
       GROUP BY c.id
       ORDER BY c.last_message_at DESC, c.id DESC
       LIMIT ?`,
      [userId, limit]
    );
    return rows;
  }

  async function findConversation(userId, conversationId, connection) {
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

  async function createConversation(userId, conversation, connection) {
    const [result] = await db(connection).query(
      `INSERT INTO chat_conversations (user_id, title, locale)
       VALUES (?, ?, ?)`,
      [userId, conversation.title, conversation.locale]
    );
    return findConversation(userId, result.insertId, connection);
  }

  async function updateConversationTitle(userId, conversationId, title, connection) {
    const [result] = await db(connection).query(
      `UPDATE chat_conversations
       SET title = ?
       WHERE id = ? AND user_id = ?`,
      [title, conversationId, userId]
    );
    if (result.affectedRows === 0) return null;
    return findConversation(userId, conversationId, connection);
  }

  async function touchConversation(userId, conversationId, connection) {
    await db(connection).query(
      `UPDATE chat_conversations
       SET last_message_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [conversationId, userId]
    );
    return findConversation(userId, conversationId, connection);
  }

  async function deleteConversation(userId, conversationId, connection) {
    const [result] = await db(connection).query(
      `DELETE FROM chat_conversations
       WHERE id = ? AND user_id = ?`,
      [conversationId, userId]
    );
    return result.affectedRows > 0;
  }

  async function listMessages(conversationId, connection) {
    const [rows] = await db(connection).query(
      `SELECT id, conversation_id, role, content, locale, reply_to_message_id, created_at
       FROM chat_messages
       WHERE conversation_id = ?
       ORDER BY id`,
      [conversationId]
    );
    return rows;
  }

  async function listGenerationStates(conversationId, connection) {
    const [rows] = await db(connection).query(
      `SELECT
          g.user_message_id,
          g.assistant_message_id,
          g.status,
          g.error_code,
          g.created_at,
          g.updated_at,
          g.completed_at,
          CASE WHEN assistant.id IS NULL THEN 0 ELSE 1 END AS assistant_exists
       FROM chat_message_generations g
       LEFT JOIN chat_messages assistant
         ON assistant.id = g.assistant_message_id
        AND assistant.conversation_id = g.conversation_id
        AND assistant.role = 'assistant'
       WHERE g.conversation_id = ?
       ORDER BY g.created_at, g.user_message_id`,
      [conversationId]
    );
    return rows;
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

  async function insertMessage(conversationId, message, connection) {
    const [result] = await db(connection).query(
      `INSERT INTO chat_messages (conversation_id, role, content, locale)
       VALUES (?, ?, ?, ?)`,
      [conversationId, message.role, message.content, message.locale || null]
    );
    const [rows] = await db(connection).query(
      `SELECT id, conversation_id, role, content, locale, reply_to_message_id, created_at
       FROM chat_messages
       WHERE id = ?
       LIMIT 1`,
      [result.insertId]
    );
    return rows[0] || null;
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
    createConversation,
    deleteConversation,
    findConversation,
    insertMessage,
    listActionsForMessageIds,
    listConversations,
    listGenerationStates,
    listMessages,
    listSourcesForMessageIds,
    touchConversation,
    updateConversationTitle,
    withTransaction,
  };
}

module.exports = {
  createChatRepository,
};

const { ERROR_CODES } = require('../errors/errorCodes');
const { mapAction, mapConversation, mapGenerationState, mapMessage, mapSource } = require('./chat.mapper');
const {
  normalizeLimit,
  titleFromMessage,
  validateCreateConversation,
  validatePositiveId,
  validateTitleUpdate,
  validateUserMessage,
} = require('./chat.validation');

function httpError(status, code, message, errors) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  if (errors) error.errors = errors;
  return error;
}

function invalidIdError() {
  return httpError(400, ERROR_CODES.CHAT_INVALID_ID, 'A valid conversation id is required.');
}

function notFoundError() {
  return httpError(404, ERROR_CODES.CHAT_CONVERSATION_NOT_FOUND, 'Chat conversation was not found.');
}

function createChatService(repository, options = {}) {
  const generationStaleMs = Number(options.generationStaleMs || 60000);

  async function listConversations(userId, query = {}) {
    const limit = normalizeLimit(query.limit);
    const rows = await repository.listConversations(userId, limit);
    return {
      conversations: rows.map(mapConversation),
      limit,
    };
  }

  async function createConversation(userId, input = {}) {
    const validation = validateCreateConversation(input);
    if (!validation.ok) {
      const code = validation.value.messageErrorCode === 'role'
        ? ERROR_CODES.CHAT_MESSAGE_ROLE_INVALID
        : validation.errors.title
          ? ERROR_CODES.CHAT_INVALID_TITLE
          : ERROR_CODES.CHAT_INVALID_MESSAGE;
      throw httpError(400, code, 'Chat conversation details are invalid.', validation.errors);
    }

    return repository.withTransaction(async (connection) => {
      const message = validation.value.message || null;
      const title = validation.value.title || (message ? titleFromMessage(message.content) : 'New chat');
      let conversation = await repository.createConversation(userId, {
        title,
        locale: validation.value.locale,
      }, connection);
      let messages = [];

      if (message) {
        const createdMessage = await repository.insertMessage(conversation.id, message, connection);
        conversation = await repository.touchConversation(userId, conversation.id, connection);
        messages = [createdMessage];
      }

      return {
        conversation: mapConversation(conversation),
        messages: messages.map(mapMessage),
      };
    });
  }

  async function getConversation(userId, conversationIdInput) {
    const conversationId = validatePositiveId(conversationIdInput);
    if (!conversationId) throw invalidIdError();

    const conversation = await repository.findConversation(userId, conversationId);
    if (!conversation) throw notFoundError();
    const messages = await repository.listMessages(conversationId);
    const assistantMessageIds = messages
      .filter(message => message.role === 'assistant')
      .map(message => message.id);
    const actionRows = await repository.listActionsForMessageIds(assistantMessageIds);
    const sourceRows = await repository.listSourcesForMessageIds(assistantMessageIds);
    const generationRows = await repository.listGenerationStates(conversationId);
    const generations = generationRows.map((row) => {
      if (row.status === 'completed' && (!row.assistant_message_id || Number(row.assistant_exists || 0) !== 1)) {
        console.warn('Chat generation completed without assistant message:', {
          conversationId,
          userMessageId: row.user_message_id,
        });
      }
      return mapGenerationState(row, { staleMs: generationStaleMs });
    });

    return {
      conversation: mapConversation(conversation),
      messages: messages.map(mapMessage),
      generations,
      actions: assistantMessageIds.map((messageId) => ({
        messageId,
        actions: actionRows
          .filter(row => Number(row.message_id) === Number(messageId))
          .map(mapAction)
          .filter(Boolean),
      })).filter(group => group.actions.length),
      sources: assistantMessageIds.map((messageId) => ({
        messageId,
        sources: sourceRows
          .filter(row => Number(row.message_id) === Number(messageId))
          .map(mapSource)
          .filter(Boolean),
      })).filter(group => group.sources.length),
    };
  }

  async function renameConversation(userId, conversationIdInput, input = {}) {
    const conversationId = validatePositiveId(conversationIdInput);
    if (!conversationId) throw invalidIdError();

    const validation = validateTitleUpdate(input);
    if (!validation.ok) {
      throw httpError(400, ERROR_CODES.CHAT_INVALID_TITLE, 'Chat title is invalid.', validation.errors);
    }

    const conversation = await repository.updateConversationTitle(userId, conversationId, validation.value.title);
    if (!conversation) throw notFoundError();

    return {
      conversation: mapConversation(conversation),
    };
  }

  async function deleteConversation(userId, conversationIdInput) {
    const conversationId = validatePositiveId(conversationIdInput);
    if (!conversationId) throw invalidIdError();

    const deleted = await repository.deleteConversation(userId, conversationId);
    if (!deleted) throw notFoundError();

    return { ok: true };
  }

  async function createMessage(userId, conversationIdInput, input = {}) {
    const conversationId = validatePositiveId(conversationIdInput);
    if (!conversationId) throw invalidIdError();

    const validation = validateUserMessage(input);
    if (!validation.ok) {
      const code = validation.code === 'role'
        ? ERROR_CODES.CHAT_MESSAGE_ROLE_INVALID
        : ERROR_CODES.CHAT_INVALID_MESSAGE;
      throw httpError(400, code, 'Chat message is invalid.', validation.errors);
    }

    return repository.withTransaction(async (connection) => {
      const conversation = await repository.findConversation(userId, conversationId, connection);
      if (!conversation) throw notFoundError();
      const message = await repository.insertMessage(conversationId, validation.value, connection);
      const updatedConversation = await repository.touchConversation(userId, conversationId, connection);

      return {
        conversation: mapConversation(updatedConversation),
        message: mapMessage(message),
      };
    });
  }

  return {
    createConversation,
    createMessage,
    deleteConversation,
    getConversation,
    listConversations,
    renameConversation,
  };
}

module.exports = {
  createChatService,
};

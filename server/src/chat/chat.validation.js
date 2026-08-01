const { normalizeLocale } = require('../i18n/locale');

const MAX_TITLE_LENGTH = 80;
const MAX_MESSAGE_LENGTH = 4000;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function validatePositiveId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function normalizeLimit(value) {
  if (value === undefined || value === null || value === '') return DEFAULT_LIMIT;
  const limit = Number(value);
  if (!Number.isFinite(limit)) return DEFAULT_LIMIT;
  if (limit < 1) return 1;
  if (limit > MAX_LIMIT) return MAX_LIMIT;
  return Math.floor(limit);
}

function validateTitleValue(value) {
  if (typeof value !== 'string') return null;
  const title = value.trim();
  if (!title || title.length > MAX_TITLE_LENGTH) return null;
  return title;
}

function validateTitleUpdate(input = {}) {
  const title = validateTitleValue(input.title);
  if (!title) {
    return {
      ok: false,
      errors: { title: 'Title must be 1 to 80 characters.' },
      value: {},
    };
  }

  return {
    ok: true,
    errors: {},
    value: { title },
  };
}

function getMessageContent(input = {}) {
  if (Object.prototype.hasOwnProperty.call(input, 'content')) return input.content;
  if (isPlainObject(input.message) && Object.prototype.hasOwnProperty.call(input.message, 'content')) {
    return input.message.content;
  }
  return undefined;
}

function getMessageRole(input = {}) {
  if (Object.prototype.hasOwnProperty.call(input, 'role')) return input.role;
  if (isPlainObject(input.message) && Object.prototype.hasOwnProperty.call(input.message, 'role')) {
    return input.message.role;
  }
  return undefined;
}

function validateUserMessage(input = {}) {
  const role = getMessageRole(input);
  if (role !== undefined && role !== 'user') {
    return {
      ok: false,
      code: 'role',
      errors: { role: 'Only user messages can be created by clients.' },
      value: {},
    };
  }

  const contentValue = getMessageContent(input);
  if (typeof contentValue !== 'string') {
    return {
      ok: false,
      code: 'message',
      errors: { content: 'Message content is required.' },
      value: {},
    };
  }

  const content = contentValue.trim();
  if (!content || content.length > MAX_MESSAGE_LENGTH) {
    return {
      ok: false,
      code: 'message',
      errors: { content: 'Message content must be 1 to 4000 characters.' },
      value: {},
    };
  }

  return {
    ok: true,
    errors: {},
    value: { role: 'user', content, locale: normalizeLocale(input.locale) },
  };
}

function validateCreateConversation(input = {}) {
  const errors = {};
  const value = {
    locale: normalizeLocale(input.locale),
  };

  if (Object.prototype.hasOwnProperty.call(input, 'title')) {
    const title = validateTitleValue(input.title);
    if (!title) errors.title = 'Title must be 1 to 80 characters.';
    else value.title = title;
  }

  const hasMessage = Object.prototype.hasOwnProperty.call(input, 'message') ||
    Object.prototype.hasOwnProperty.call(input, 'content') ||
    Object.prototype.hasOwnProperty.call(input, 'role');

  if (hasMessage) {
    const message = validateUserMessage(input);
    if (!message.ok) {
      Object.assign(errors, message.errors);
      value.messageErrorCode = message.code;
    } else {
      value.message = {
        ...message.value,
        locale: value.locale,
      };
    }
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    value,
  };
}

function titleFromMessage(content) {
  const title = String(content || '').trim();
  return title ? title.slice(0, MAX_TITLE_LENGTH) : 'New chat';
}

module.exports = {
  MAX_MESSAGE_LENGTH,
  MAX_TITLE_LENGTH,
  normalizeLimit,
  titleFromMessage,
  validateCreateConversation,
  validatePositiveId,
  validateTitleUpdate,
  validateUserMessage,
};

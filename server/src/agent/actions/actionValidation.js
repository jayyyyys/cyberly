const crypto = require('node:crypto');
const { normalizeLocale } = require('../../i18n/locale');
const {
  isEnabledActionType,
  isProhibitedActionType,
} = require('./actionPolicy');
const { actionError } = require('./actionErrors');

const MAX_STRING_LENGTH = 160;

function normalizeActionType(value) {
  return String(value || '').trim().toLowerCase();
}

function assertPlainObject(value, code = 'ACTION_PROPOSAL_INVALID') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw actionError(400, code, 'Action proposal is invalid.');
  }
}

function readRawProposal(body = {}) {
  assertPlainObject(body);
  const raw = body.actionProposal || body.proposal || body;
  if (Array.isArray(raw)) {
    throw actionError(400, 'ACTION_PROPOSAL_INVALID', 'Only one action proposal is supported.');
  }
  assertPlainObject(raw);
  if (Array.isArray(raw.actionProposal) || Array.isArray(raw.actions) || Array.isArray(raw.proposals)) {
    throw actionError(400, 'ACTION_PROPOSAL_INVALID', 'Only one action proposal is supported.');
  }
  return raw;
}

function rejectIdentityFields(value) {
  const text = JSON.stringify(value || {});
  if (/"userId"|"user_id"|"role"|"ownerId"|"admin"/i.test(text)) {
    throw actionError(400, 'ACTION_VALIDATION_FAILED', 'Action proposal includes unsupported identity fields.');
  }
}

function normalizeString(value, field, { required = false, pattern = /^[a-z0-9][a-z0-9_-]{0,159}$/i } = {}) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    if (required) throw actionError(400, 'ACTION_VALIDATION_FAILED', `${field} is required.`);
    return '';
  }
  if (normalized.length > MAX_STRING_LENGTH || !pattern.test(normalized)) {
    throw actionError(400, 'ACTION_VALIDATION_FAILED', `${field} is invalid.`);
  }
  return normalized;
}

function normalizePositiveInt(value, field, { required = false } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) throw actionError(400, 'ACTION_VALIDATION_FAILED', `${field} is required.`);
    return null;
  }
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw actionError(400, 'ACTION_VALIDATION_FAILED', `${field} is invalid.`);
  }
  return normalized;
}

function normalizeParameters(actionType, input = {}) {
  assertPlainObject(input, 'ACTION_VALIDATION_FAILED');
  rejectIdentityFields(input);

  if (actionType === 'open_resource') {
    return {
      resourceId: normalizePositiveInt(input.resourceId, 'resourceId'),
      resourceSlug: normalizeString(input.resourceSlug, 'resourceSlug'),
    };
  }
  if (actionType === 'open_scenario') {
    return {
      scenarioId: normalizePositiveInt(input.scenarioId, 'scenarioId'),
      scenarioSlug: normalizeString(input.scenarioSlug, 'scenarioSlug'),
    };
  }
  if (actionType === 'open_recommendation' || actionType === 'mark_recommendation_viewed' || actionType === 'mark_recommendation_completed') {
    return {
      recommendationId: normalizePositiveInt(input.recommendationId || input.id, 'recommendationId', { required: true }),
    };
  }

  throw actionError(400, 'ACTION_NOT_SUPPORTED', 'Action is not supported.');
}

function normalizeProposalBody(body = {}, requestedLocale = 'en') {
  const raw = readRawProposal(body);
  const actionType = normalizeActionType(raw.actionType || raw.type);
  if (!actionType) throw actionError(400, 'ACTION_PROPOSAL_INVALID', 'Action type is required.');
  if (isProhibitedActionType(actionType)) {
    throw actionError(403, 'ACTION_NOT_SUPPORTED', 'Action is not supported.');
  }
  if (!isEnabledActionType(actionType)) {
    throw actionError(400, 'ACTION_NOT_SUPPORTED', 'Action is not supported.');
  }
  const args = raw.arguments || raw.parameters || raw.target || {};
  const parameters = normalizeParameters(actionType, args);
  if ((actionType === 'open_resource' && !parameters.resourceId && !parameters.resourceSlug)
    || (actionType === 'open_scenario' && !parameters.scenarioId && !parameters.scenarioSlug)) {
    throw actionError(400, 'ACTION_VALIDATION_FAILED', 'Action target is required.');
  }
  return {
    actionType,
    parameters,
    locale: normalizeLocale(raw.locale || requestedLocale),
  };
}

function createToken() {
  return crypto.randomBytes(24).toString('base64url');
}

function createProposalId() {
  return crypto.randomUUID();
}

module.exports = {
  createProposalId,
  createToken,
  normalizeProposalBody,
};

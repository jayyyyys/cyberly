const { normalizeLocale } = require('../i18n/locale');
const { ERROR_CODES } = require('../errors/errorCodes');
const { mapResource } = require('./resource.mapper');

function httpError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function normalizeSlug(value) {
  return String(value || '').trim().toLowerCase();
}

function createResourceService(repository) {
  async function listResources(localeInput) {
    const locale = normalizeLocale(localeInput);
    const rows = await repository.listPublishedResources(locale);
    return { resources: rows.map(mapResource) };
  }

  async function getResource(slug, localeInput) {
    const locale = normalizeLocale(localeInput);
    const resource = await repository.findPublishedBySlug(normalizeSlug(slug), locale);
    if (!resource) throw httpError(404, ERROR_CODES.RESOURCE_NOT_FOUND, 'Resource was not found.');
    return { resource: mapResource(resource) };
  }

  return {
    getResource,
    listResources,
  };
}

module.exports = {
  createResourceService,
};

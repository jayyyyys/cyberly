const express = require('express');
const { localeFromRequest } = require('../i18n/locale');

function createResourceRouter(resourceService) {
  const router = express.Router();

  router.get('/api/resources', async (req, res, next) => {
    try {
      res.json(await resourceService.listResources(localeFromRequest(req)));
    } catch (error) {
      next(error);
    }
  });

  router.get('/api/resources/:slug', async (req, res, next) => {
    try {
      res.json(await resourceService.getResource(req.params.slug, localeFromRequest(req)));
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = {
  createResourceRouter,
};

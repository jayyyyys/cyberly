const express = require('express');
const { requireAuth } = require('../auth/middleware');
const { localeFromRequest } = require('../i18n/locale');

function createProgressRouter(progressService) {
  const router = express.Router();

  router.get('/api/progress', requireAuth, async (req, res, next) => {
    try {
      res.json(await progressService.getProgress(req.session.userId));
    } catch (error) {
      next(error);
    }
  });

  router.post('/api/progress/sync-initial-assessment', requireAuth, async (req, res, next) => {
    try {
      res.json(await progressService.syncLatestInitialAssessment(req.session.userId, localeFromRequest(req)));
    } catch (error) {
      next(error);
    }
  });

  router.get('/api/recommendations/current', requireAuth, async (req, res, next) => {
    try {
      res.json(await progressService.getCurrentRecommendation(req.session.userId, localeFromRequest(req)));
    } catch (error) {
      next(error);
    }
  });

  router.post('/api/recommendations/:id/viewed', requireAuth, async (req, res, next) => {
    try {
      res.json(await progressService.markViewed(req.session.userId, req.params.id, localeFromRequest(req)));
    } catch (error) {
      next(error);
    }
  });

  router.post('/api/recommendations/:id/completed', requireAuth, async (req, res, next) => {
    try {
      res.json(await progressService.markCompleted(req.session.userId, req.params.id, localeFromRequest(req)));
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = {
  createProgressRouter,
};

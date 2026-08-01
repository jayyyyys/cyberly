const express = require('express');
const { requireAuth } = require('../auth/middleware');
const { localeFromRequest } = require('../i18n/locale');

function createAssessmentRouter(assessmentService) {
  const router = express.Router();

  router.get('/api/assessments/initial', requireAuth, async (req, res, next) => {
    try {
      res.json(await assessmentService.getInitialAssessment(localeFromRequest(req)));
    } catch (error) {
      next(error);
    }
  });

  router.post('/api/assessments/initial/attempts', requireAuth, async (req, res, next) => {
    try {
      res.status(201).json(await assessmentService.startOrResumeInitialAttempt(req.session.userId, localeFromRequest(req)));
    } catch (error) {
      next(error);
    }
  });

  router.get('/api/assessments/initial/result', requireAuth, async (req, res, next) => {
    try {
      res.json(await assessmentService.getLatestInitialResult(req.session.userId, localeFromRequest(req)));
    } catch (error) {
      next(error);
    }
  });

  router.get('/api/assessments/initial/status', requireAuth, async (req, res, next) => {
    try {
      res.json(await assessmentService.getInitialStatus(req.session.userId, localeFromRequest(req)));
    } catch (error) {
      next(error);
    }
  });

  router.get('/api/assessment-attempts/:attemptId', requireAuth, async (req, res, next) => {
    try {
      res.json(await assessmentService.getAttemptForUser(req.session.userId, req.params.attemptId, localeFromRequest(req)));
    } catch (error) {
      next(error);
    }
  });

  router.put('/api/assessment-attempts/:attemptId/answers', requireAuth, async (req, res, next) => {
    try {
      res.json(await assessmentService.saveAnswer(req.session.userId, req.params.attemptId, req.body));
    } catch (error) {
      next(error);
    }
  });

  router.post('/api/assessment-attempts/:attemptId/submit', requireAuth, async (req, res, next) => {
    try {
      res.json(await assessmentService.submitAttempt(req.session.userId, req.params.attemptId, localeFromRequest(req)));
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = {
  createAssessmentRouter,
};

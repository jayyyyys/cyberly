const express = require('express');
const { requireAuth } = require('../../auth/middleware');

function createActionProposalRouter(actionProposalService) {
  const router = express.Router();

  router.post('/api/agent/actions/proposals', requireAuth, async (req, res, next) => {
    try {
      res.status(201).json(await actionProposalService.createProposalFromRequest(req));
    } catch (error) {
      next(error);
    }
  });

  router.post('/api/agent/actions/proposals/:proposalId/confirm', requireAuth, async (req, res, next) => {
    try {
      res.json(await actionProposalService.confirmProposalFromRequest(req));
    } catch (error) {
      next(error);
    }
  });

  router.post('/api/agent/actions/proposals/:proposalId/cancel', requireAuth, async (req, res, next) => {
    try {
      res.json(await actionProposalService.cancelProposalFromRequest(req));
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = {
  createActionProposalRouter,
};

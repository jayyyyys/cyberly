const express = require('express');
const { requireAuth } = require('../auth/middleware');

function createAiRouter(aiService) {
  const router = express.Router();

  router.post('/conversations/:conversationId/messages/:messageId/generate', requireAuth, async (req, res, next) => {
    try {
      const result = await aiService.generateReply(
        req.session.userId,
        req.params.conversationId,
        req.params.messageId,
        {
          ...(req.body || {}),
          trustedActionContext: {
            sessionId: req.sessionID || req.session?.id || '',
            role: req.session.role,
          },
        }
      );
      res.status(result.statusCode).json(result.body);
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = {
  createAiRouter,
};

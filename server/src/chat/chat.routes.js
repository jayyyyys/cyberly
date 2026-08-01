const express = require('express');
const { requireAuth } = require('../auth/middleware');

function createChatRouter(chatService) {
  const router = express.Router();

  router.get('/conversations', requireAuth, async (req, res, next) => {
    try {
      res.json(await chatService.listConversations(req.session.userId, req.query));
    } catch (error) {
      next(error);
    }
  });

  router.post('/conversations', requireAuth, async (req, res, next) => {
    try {
      res.status(201).json(await chatService.createConversation(req.session.userId, req.body));
    } catch (error) {
      next(error);
    }
  });

  router.get('/conversations/:conversationId', requireAuth, async (req, res, next) => {
    try {
      res.json(await chatService.getConversation(req.session.userId, req.params.conversationId));
    } catch (error) {
      next(error);
    }
  });

  router.patch('/conversations/:conversationId', requireAuth, async (req, res, next) => {
    try {
      res.json(await chatService.renameConversation(req.session.userId, req.params.conversationId, req.body));
    } catch (error) {
      next(error);
    }
  });

  router.delete('/conversations/:conversationId', requireAuth, async (req, res, next) => {
    try {
      res.json(await chatService.deleteConversation(req.session.userId, req.params.conversationId));
    } catch (error) {
      next(error);
    }
  });

  router.post('/conversations/:conversationId/messages', requireAuth, async (req, res, next) => {
    try {
      res.status(201).json(await chatService.createMessage(req.session.userId, req.params.conversationId, req.body));
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = {
  createChatRouter,
};

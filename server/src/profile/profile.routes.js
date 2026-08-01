const express = require('express');
const { requireAuth } = require('../auth/middleware');

function createProfileRouter(profileService) {
  const router = express.Router();

  router.get('/', requireAuth, async (req, res, next) => {
    try {
      const profile = await profileService.getProfileForUser(req.session.userId);
      res.json({ profile });
    } catch (error) {
      next(error);
    }
  });

  router.put('/', requireAuth, async (req, res, next) => {
    try {
      const profile = await profileService.saveProfileForUser(req.session.userId, req.body);
      res.json({ profile });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = {
  createProfileRouter,
};

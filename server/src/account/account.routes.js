const express = require("express");
const {
  requireAuth,
} = require("../auth/middleware");

function createAccountRouter(accountService) {
  const router = express.Router();

  router.get("/", requireAuth, async (req, res, next) => {
    try {
      const account =
        await accountService.getAccountForUser(
          req.session.userId
        );

      res.json({ account });
    } catch (error) {
      next(error);
    }
  });

  router.put("/", requireAuth, async (req, res, next) => {
    try {
      const account =
        await accountService.updateAccountForUser(
          req.session.userId,
          req.body
        );

      res.json({ account });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = {
  createAccountRouter,
};
const { ERROR_CODES } = require('../errors/errorCodes');

function createRequireAdmin(pool) {
  return async function requireAdmin(req, res, next) {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({
          code: ERROR_CODES.AUTH_REQUIRED,
          message: 'Authentication required.',
        });
      }

      const [rows] = await pool.query(
        `SELECT id, role, account_status
         FROM users
         WHERE id = ?
         LIMIT 1`,
        [req.session.userId]
      );
      const user = rows[0];
      if (!user || user.account_status !== 'active') {
        return res.status(401).json({
          code: ERROR_CODES.AUTH_REQUIRED,
          message: 'Authentication required.',
        });
      }

      req.session.role = user.role;
      if (user.role !== 'admin') {
        return res.status(403).json({
          code: ERROR_CODES.AUTH_FORBIDDEN,
          message: 'Forbidden.',
        });
      }

      req.adminUser = { id: user.id, role: user.role };
      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  createRequireAdmin,
};

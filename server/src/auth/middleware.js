const { ERROR_CODES } = require('../errors/errorCodes');

function requireAuth(req, res, next) {
  if (!req.session?.userId) {
    return res.status(401).json({
      code: ERROR_CODES.AUTH_REQUIRED,
      message: 'Authentication required.',
    });
  }
  next();
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.session?.userId) {
      return res.status(401).json({
        code: ERROR_CODES.AUTH_REQUIRED,
        message: 'Authentication required.',
      });
    }
    if (req.session.role !== role) {
      return res.status(403).json({
        code: ERROR_CODES.AUTH_FORBIDDEN,
        message: 'Forbidden.',
      });
    }
    next();
  };
}

module.exports = {
  requireAuth,
  requireRole,
};

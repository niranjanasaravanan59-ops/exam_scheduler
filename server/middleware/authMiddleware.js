const jwt = require('jsonwebtoken');
const { User } = require('../modules/auth/authModel');
const logger = require('../config/logger');

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Access token required' },
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findByPk(decoded.id, {
      attributes: ['id', 'name', 'email', 'role', 'rollNo', 'department', 'isActive'],
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'User not found or deactivated' },
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: { code: 'TOKEN_EXPIRED', message: 'Access token expired' },
      });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: { code: 'INVALID_TOKEN', message: 'Invalid access token' },
      });
    }
    logger.error('Auth middleware error', { error: error.message });
    return res.status(500).json({
      error: { code: 'SERVER_ERROR', message: 'Authentication failed' },
    });
  }
};

// Role-based access control factory
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
  }
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: `Access restricted to: ${roles.join(', ')}`,
      },
    });
  }
  next();
};

module.exports = { verifyToken, requireRole };

const logger = require('../config/logger');

const errorMiddleware = (err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    user: req.user?.id,
  });

  // Sequelize validation errors
  if (err.name === 'SequelizeValidationError') {
    return res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: err.errors.map((e) => ({ field: e.path, message: e.message })),
      },
    });
  }

  // Sequelize unique constraint
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      error: {
        code: 'DUPLICATE_ENTRY',
        message: 'A record with this data already exists',
        fields: err.fields,
      },
    });
  }

  // Multer file size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: { code: 'FILE_TOO_LARGE', message: 'File exceeds maximum allowed size' },
    });
  }

  // Default
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: {
      code: err.code || 'SERVER_ERROR',
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    },
  });
};

const notFoundMiddleware = (req, res) => {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` },
  });
};

module.exports = { errorMiddleware, notFoundMiddleware };

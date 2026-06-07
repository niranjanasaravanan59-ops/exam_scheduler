require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { connectDB } = require('./config/db');
const logger = require('./config/logger');
const { setupAssociations } = require('./modules/associations');
const { timingMiddleware } = require('./middleware/timingMiddleware');
const { errorMiddleware, notFoundMiddleware } = require('./middleware/errorMiddleware');

const requiredEnv = [
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'CLIENT_URL',
];

const missingEnv = requiredEnv.filter((key) => !process.env[key] || process.env[key].trim() === '');
if (missingEnv.length > 0) {
  logger.error(`Missing required environment variables: ${missingEnv.join(', ')}`);
  process.exit(1);
}

// Route imports
const authRoutes = require('./modules/auth/authRoutes');
const examRoutes = require('./modules/exam/examRoutes');
const resultRoutes = require('./modules/result/resultRoutes');
const dashboardRoutes = require('./modules/dashboard/dashboardRoutes');
const importRoutes = require('./modules/bulkImport/importRoutes');
const metricsRoutes = require('./modules/metrics/metricsRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Security Middleware ───────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: process.env.CLIENT_URL || ['http://localhost:3000', 'http://localhost:5173'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMIT', message: 'Too many requests, please try again later' } },
});

// Stricter limit for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: { code: 'RATE_LIMIT', message: 'Too many authentication attempts' } },
});

app.use('/api/auth', authLimiter);
app.use('/api', limiter);

// ─── Body Parsing ──────────────────────────────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Logging ───────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(
    morgan('combined', {
      stream: { write: (message) => logger.info(message.trim()) },
    })
  );
}

// ─── Request Timing / Metrics ─────────────────────────────────────────────────
app.use(timingMiddleware);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Exam Scheduler API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/import', importRoutes);
app.use('/metrics', metricsRoutes);

// ─── Error Handling ───────────────────────────────────────────────────────────
app.use(notFoundMiddleware);
app.use(errorMiddleware);

// ─── Bootstrap ────────────────────────────────────────────────────────────────
const bootstrap = async () => {
  try {
    await connectDB();
    setupAssociations();

    if (process.env.NODE_ENV !== 'test') {
      app.listen(PORT, () => {
        logger.info(`🚀 Exam Scheduler API running on port ${PORT}`);
        logger.info(`   Environment: ${process.env.NODE_ENV || 'development'}`);
        logger.info(`   Health: http://localhost:${PORT}/health`);
        logger.info(`   Metrics: http://localhost:${PORT}/metrics`);
      });
    }
  } catch (err) {
    logger.error('Bootstrap failed', { error: err.message });
    process.exit(1);
  }
};

// Handle unhandled rejections
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Promise Rejection', { reason: String(reason) });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

bootstrap();

module.exports = app; // for testing

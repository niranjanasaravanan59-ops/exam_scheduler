const express = require('express');
const router = express.Router();
const { getMetrics } = require('./metricsController');
const { verifyToken, requireRole } = require('../../middleware/authMiddleware');

// /metrics endpoint — admin only
router.get('/', verifyToken, requireRole('admin'), getMetrics);

module.exports = router;

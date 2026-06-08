const express = require('express');
const router = express.Router();
const { getDashboard, getAdminPublicationOverview } = require('./dashboardController');
const { verifyToken, requireRole } = require('../../middleware/authMiddleware');

const preventDashboardCaching = (req, res, next) => {
  delete req.headers['if-none-match'];
  delete req.headers['if-modified-since'];
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
    'Surrogate-Control': 'no-store',
  });
  next();
};

router.get('/', preventDashboardCaching, verifyToken, getDashboard);
router.get(
  '/publication-overview',
  preventDashboardCaching,
  verifyToken,
  requireRole('admin'),
  getAdminPublicationOverview
);

module.exports = router;

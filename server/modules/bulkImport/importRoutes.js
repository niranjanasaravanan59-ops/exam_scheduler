const express = require('express');
const router = express.Router();
const { importResults, getImportTemplate } = require('./importController');
const { verifyToken, requireRole } = require('../../middleware/authMiddleware');
const { uploadCSVMiddleware } = require('../../middleware/uploadMiddleware');

router.get('/template', verifyToken, requireRole('faculty'), getImportTemplate);
router.post('/results', verifyToken, requireRole('faculty'), uploadCSVMiddleware, importResults);

module.exports = router;

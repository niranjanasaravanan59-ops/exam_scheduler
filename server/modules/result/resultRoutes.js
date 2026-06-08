const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const {
  createResult,
  getResults,
  getResultExamOverview,
  getResultExamDetail,
  updateResult,
  transitionResult,
  bulkPublishByExam,
} = require('./resultController');
const { verifyToken, requireRole } = require('../../middleware/authMiddleware');

const createValidation = [
  body('studentId').isUUID().withMessage('Valid student ID required'),
  body('examId').isUUID().withMessage('Valid exam ID required'),
  body('marks').isFloat({ min: 0, max: 100 }).withMessage('Marks must be 0-100'),
  body('remarks').optional().trim().isLength({ max: 500 }),
  // Reject grade from client — enforced in controller too
  body('grade').not().exists().withMessage('Grade must not be sent from client'),
];

const updateValidation = [
  body('marks').optional().isFloat({ min: 0, max: 100 }).withMessage('Marks must be 0-100'),
  body('version').isInt({ min: 1 }).withMessage('Version required for optimistic concurrency'),
  body('remarks').optional().trim().isLength({ max: 500 }),
  body('grade').not().exists().withMessage('Grade must not be sent from client'),
];

const transitionValidation = [
  body('action').isIn(['draft', 'ready', 'published']).withMessage('Invalid workflow action'),
];

router.get('/exams', verifyToken, requireRole('admin'), getResultExamOverview);
router.get('/exams/:examId', verifyToken, requireRole('admin'), getResultExamDetail);
router.get('/', verifyToken, getResults);
router.post('/', verifyToken, requireRole('admin', 'faculty'), createValidation, createResult);
router.put('/:id', verifyToken, requireRole('admin', 'faculty'), updateValidation, updateResult);
router.patch('/:id/transition', verifyToken, requireRole('admin', 'faculty'), transitionValidation, transitionResult);
router.post('/exam/:examId/publish', verifyToken, requireRole('admin'), bulkPublishByExam);

module.exports = router;

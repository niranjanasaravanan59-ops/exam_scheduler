const express = require('express');
const { body, query } = require('express-validator');
const router = express.Router();
const { createExam, getExams, getExamById, updateExam, deleteExam } = require('./examController');
const { verifyToken, requireRole } = require('../../middleware/authMiddleware');
const { isValidDateOnly } = require('../../utils/examTiming');

const examValidation = [
  body('subject').trim().isLength({ min: 2, max: 150 }).withMessage('Subject required (2-150 chars)'),
  body('department').trim().notEmpty().withMessage('Department required'),
  body('semester').isInt({ min: 1, max: 12 }).withMessage('Semester must be 1-12'),
  body('examDate').custom(isValidDateOnly).withMessage('Exam date must be YYYY-MM-DD'),
  body('startTime').matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('startTime must be HH:MM'),
  body('endTime').matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('endTime must be HH:MM'),
  body('hall').trim().notEmpty().withMessage('Hall required'),
  body('facultyId').optional({ values: 'falsy' }).isUUID().withMessage('Invalid faculty ID'),
];

const updateValidation = [
  ...examValidation.map((v) => v.optional()),
  body('version').isInt({ min: 1 }).withMessage('Version number required for updates'),
];

router.get('/', verifyToken, getExams);
router.get('/:id', verifyToken, getExamById);
router.post('/', verifyToken, requireRole('admin'), examValidation, createExam);
router.put('/:id', verifyToken, requireRole('admin'), updateValidation, updateExam);
router.delete('/:id', verifyToken, requireRole('admin'), deleteExam);

module.exports = router;

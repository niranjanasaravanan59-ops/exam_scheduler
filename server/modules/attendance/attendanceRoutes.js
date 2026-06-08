const express = require('express');
const { body, param } = require('express-validator');
const { verifyToken, requireRole } = require('../../middleware/authMiddleware');
const { getAttendanceExamDetail, markAttendance } = require('./attendanceController');

const router = express.Router();

router.get(
  '/exams/:examId',
  verifyToken,
  requireRole('admin', 'faculty'),
  param('examId').isUUID().withMessage('Valid exam ID required'),
  getAttendanceExamDetail
);

router.patch(
  '/exams/:examId/students/:studentId',
  verifyToken,
  requireRole('admin', 'faculty'),
  [
    param('examId').isUUID().withMessage('Valid exam ID required'),
    param('studentId').isUUID().withMessage('Valid student ID required'),
    body('status').isIn(['present', 'absent']).withMessage('Attendance status must be present or absent'),
  ],
  markAttendance
);

module.exports = router;

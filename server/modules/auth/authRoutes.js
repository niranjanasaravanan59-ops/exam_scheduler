const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { register, login, refreshToken, getMe, getUsers } = require('./authController');
const { verifyToken, requireRole } = require('../../middleware/authMiddleware');

const registerValidation = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 chars'),
  // Do NOT use normalizeEmail() — it mutates the email (strips dots, lowercases domain, etc.)
  // which causes a mismatch between what is stored and what the user types at login
  body('email').isEmail().withMessage('Valid email required'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must be 8+ chars with uppercase, lowercase, and number'),
  body('role').isIn(['admin', 'faculty', 'student']).withMessage('Invalid role'),
  body('department').optional().trim().isLength({ max: 100 }),
  body('rollNo').optional().trim().isLength({ max: 50 }),
];

const loginValidation = [
  // Do NOT use normalizeEmail() here either — must match exactly what was stored
  body('email').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
];

router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/refresh', refreshToken);
router.get('/me', verifyToken, getMe);
router.get('/users', verifyToken, requireRole('admin', 'faculty'), getUsers);

module.exports = router;

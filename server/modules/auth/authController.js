const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { User } = require('./authModel');
const logger = require('../../config/logger');

const generateTokens = (user) => {
  const payload = { id: user.id, role: user.role, email: user.email };

  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  });

  const refreshToken = jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

  return { accessToken, refreshToken };
};

const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: errors.array() },
      });
    }

    const { name, email, password, role, rollNo, department } = req.body;

    // Store email in lowercase to ensure consistent lookup
    const normalizedEmail = email.toLowerCase().trim();

    const existing = await User.findOne({ where: { email: normalizedEmail } });
    if (existing) {
      return res.status(409).json({
        error: { code: 'DUPLICATE_EMAIL', message: 'Email already registered' },
      });
    }

    // Only existing admins can create new admin accounts
    // Faculty and students can self-register freely
    const totalUsers = await User.count();
    if (totalUsers > 0 && role === 'admin') {
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
          error: { code: 'FORBIDDEN', message: 'Only admins can create admin accounts' },
        });
      }
    }

    const user = await User.create({
      name,
      email: normalizedEmail,
      password,
      role,
      rollNo,
      department,
    });

    logger.audit({
      actor_id: req.user?.id || 'SYSTEM',
      resource_id: user.id,
      action: 'USER_REGISTER',
      status: 'success',
    });

    const { accessToken, refreshToken } = generateTokens(user);

    res.status(201).json({
      message: 'Registration successful',
      user: user.toSafeObject(),
      accessToken,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  const start = Date.now();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: errors.array() },
      });
    }

    const { email, password } = req.body;

    // Normalize the same way as registration so lookup always matches
    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ where: { email: normalizedEmail } });
    if (!user || !user.isActive) {
      return res.status(401).json({
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      });
    }

    const isValid = await user.comparePassword(password);
    if (!isValid) {
      return res.status(401).json({
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      });
    }

    await user.update({ lastLoginAt: new Date() });

    const { accessToken, refreshToken } = generateTokens(user);

    logger.audit({
      actor_id: user.id,
      resource_id: user.id,
      action: 'USER_LOGIN',
      status: 'success',
      latency: Date.now() - start,
    });

    res.json({
      message: 'Login successful',
      user: user.toSafeObject(),
      accessToken,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
};

const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) {
      return res.status(400).json({
        error: { code: 'MISSING_TOKEN', message: 'Refresh token required' },
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findByPk(decoded.id, {
      attributes: ['id', 'name', 'email', 'role', 'isActive'],
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        error: { code: 'INVALID_TOKEN', message: 'User not found' },
      });
    }

    const tokens = generateTokens(user);
    res.json(tokens);
  } catch (error) {
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: { code: 'INVALID_TOKEN', message: 'Refresh token invalid or expired' },
      });
    }
    next(error);
  }
};

const getMe = async (req, res) => {
  res.json({ user: req.user.toSafeObject ? req.user.toSafeObject() : req.user });
};

const getUsers = async (req, res, next) => {
  try {
    const { role, department } = req.query;
    const where = {};

    if (req.user.role === 'faculty') {
      if (role && role !== 'student') {
        return res.status(403).json({
          error: { code: 'FORBIDDEN', message: 'Faculty can list students only' },
        });
      }
      where.role = 'student';
    }

    if (role) where.role = role;
    if (department) where.department = department;

    const users = await User.findAll({
      where,
      attributes: { exclude: ['password'] },
      order: [['name', 'ASC']],
    });

    res.json({ users, total: users.length });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, refreshToken, getMe, getUsers };

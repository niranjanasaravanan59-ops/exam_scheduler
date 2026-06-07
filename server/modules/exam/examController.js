const { Op } = require('sequelize');
const { validationResult } = require('express-validator');
const { Exam } = require('./examModel');
const { User } = require('../auth/authModel');
const { sequelize } = require('../../config/db');
const logger = require('../../config/logger');
const { isExamCompletedAt } = require('../../utils/examTiming');

// ─── Clash Detection ───────────────────────────────────────────────────────────
const detectClash = async (examDate, startTime, endTime, department, semester, excludeId = null) => {
  const where = {
    examDate,
    department,
    semester,
    isDeleted: false,
    // Overlapping time check: existing.start < new.end AND existing.end > new.start
    startTime: { [Op.lt]: endTime },
    endTime: { [Op.gt]: startTime },
  };

  if (excludeId) {
    where.id = { [Op.ne]: excludeId };
  }

  const clashes = await Exam.findAll({ where });
  return clashes;
};

const hasValidTimeRange = (startTime, endTime) => startTime < endTime;

// ─── Create Exam ───────────────────────────────────────────────────────────────
const createExam = async (req, res, next) => {
  const start = Date.now();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: errors.array() },
      });
    }

    const { subject, department, semester, examDate, startTime, endTime, hall, facultyId } = req.body;
    const normalizedFacultyId = facultyId || null;

    if (!hasValidTimeRange(startTime, endTime)) {
      return res.status(422).json({
        error: { code: 'VALIDATION_ERROR', message: 'End time must be after start time' },
      });
    }

    if (isExamCompletedAt(examDate, endTime)) {
      return res.status(422).json({
        error: { code: 'VALIDATION_ERROR', message: 'Exam end time must be in the future' },
      });
    }

    // Clash detection
    const clashes = await detectClash(examDate, startTime, endTime, department, semester);
    if (clashes.length > 0) {
      return res.status(409).json({
        error: {
          code: 'SCHEDULE_CONFLICT',
          message: 'Exam clash detected',
          conflicts: clashes.map((c) => ({
            id: c.id,
            subject: c.subject,
            examDate: c.examDate,
            startTime: c.startTime,
            endTime: c.endTime,
            hall: c.hall,
          })),
        },
      });
    }

    // Validate faculty if provided
    if (normalizedFacultyId) {
      const faculty = await User.findOne({ where: { id: normalizedFacultyId, role: 'faculty' } });
      if (!faculty) {
        return res.status(400).json({
          error: { code: 'INVALID_FACULTY', message: 'Faculty member not found' },
        });
      }
    }

    const exam = await Exam.create({
      subject, department, semester, examDate, startTime, endTime, hall,
      facultyId: normalizedFacultyId,
      createdBy: req.user.id,
    });

    logger.audit({
      actor_id: req.user.id,
      resource_id: exam.id,
      action: 'SCHEDULE_CREATE',
      status: 'success',
      latency: Date.now() - start,
      meta: { subject, examDate },
    });

    res.status(201).json({ message: 'Exam scheduled successfully', exam });
  } catch (error) {
    next(error);
  }
};

// ─── Get All Exams ─────────────────────────────────────────────────────────────
const getExams = async (req, res, next) => {
  try {
    const { department, semester, subject, examDate, page = 1, limit = 20 } = req.query;
    const where = { isDeleted: false };

    if (department) where.department = { [Op.like]: `%${department}%` };
    if (semester) where.semester = semester;
    if (subject) where.subject = { [Op.like]: `%${subject}%` };
    if (examDate) where.examDate = examDate;

    // Students only see their own department/semester
    if (req.user.role === 'student') {
      if (req.user.department) where.department = req.user.department;
    }

    if (req.user.role === 'faculty') {
      where.facultyId = req.user.id;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await Exam.findAndCountAll({
      where,
      include: [
        { model: User, as: 'faculty', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'creator', attributes: ['id', 'name'] },
      ],
      order: [['examDate', 'ASC'], ['startTime', 'ASC']],
      limit: parseInt(limit),
      offset,
    });

    res.json({
      exams: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Get Single Exam ───────────────────────────────────────────────────────────
const getExamById = async (req, res, next) => {
  try {
    const exam = await Exam.findOne({
      where: { id: req.params.id, isDeleted: false },
      include: [
        { model: User, as: 'faculty', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'creator', attributes: ['id', 'name'] },
      ],
    });

    if (!exam) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Exam not found' },
      });
    }

    res.json({ exam });
  } catch (error) {
    next(error);
  }
};

// ─── Update Exam ───────────────────────────────────────────────────────────────
const updateExam = async (req, res, next) => {
  const start = Date.now();
  const t = await sequelize.transaction();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await t.rollback();
      return res.status(422).json({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: errors.array() },
      });
    }

    const exam = await Exam.findOne({
      where: { id: req.params.id, isDeleted: false },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    if (!exam) {
      await t.rollback();
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Exam not found' },
      });
    }

    // Optimistic concurrency check
    const clientVersion = parseInt(req.body.version);
    if (clientVersion !== exam.version) {
      await t.rollback();
      return res.status(409).json({
        error: {
          code: 'CONCURRENCY_CONFLICT',
          message: 'Exam was modified by another user. Please reload.',
          currentVersion: exam.version,
          yourVersion: clientVersion,
          options: ['RELOAD_LATEST', 'RETRY_CHANGES', 'COMPARE_VERSIONS'],
          currentData: {
            subject: exam.subject,
            department: exam.department,
            semester: exam.semester,
            examDate: exam.examDate,
            startTime: exam.startTime,
            endTime: exam.endTime,
            hall: exam.hall,
            facultyId: exam.facultyId,
            version: exam.version,
          },
        },
      });
    }

    const { subject, department, semester, examDate, startTime, endTime, hall, facultyId } = req.body;
    const nextStartTime = startTime || exam.startTime;
    const nextEndTime = endTime || exam.endTime;
    const normalizedFacultyId = facultyId === '' ? null : facultyId;

    if (!hasValidTimeRange(nextStartTime, nextEndTime)) {
      await t.rollback();
      return res.status(422).json({
        error: { code: 'VALIDATION_ERROR', message: 'End time must be after start time' },
      });
    }

    if (isExamCompletedAt(examDate || exam.examDate, nextEndTime)) {
      await t.rollback();
      return res.status(422).json({
        error: { code: 'VALIDATION_ERROR', message: 'Exam end time must be in the future' },
      });
    }

    if (normalizedFacultyId) {
      const faculty = await User.findOne({
        where: { id: normalizedFacultyId, role: 'faculty' },
        transaction: t,
      });
      if (!faculty) {
        await t.rollback();
        return res.status(400).json({
          error: { code: 'INVALID_FACULTY', message: 'Faculty member not found' },
        });
      }
    }

    // Clash detection (excluding current exam)
    const clashes = await detectClash(
      examDate || exam.examDate,
      nextStartTime,
      nextEndTime,
      department || exam.department,
      semester || exam.semester,
      exam.id
    );

    if (clashes.length > 0) {
      await t.rollback();
      return res.status(409).json({
        error: {
          code: 'SCHEDULE_CONFLICT',
          message: 'Exam clash detected',
          conflicts: clashes.map((c) => ({
            id: c.id,
            subject: c.subject,
            examDate: c.examDate,
            startTime: c.startTime,
            endTime: c.endTime,
          })),
        },
      });
    }

    await exam.update(
      {
        subject: subject ?? exam.subject,
        department: department ?? exam.department,
        semester: semester ?? exam.semester,
        examDate: examDate ?? exam.examDate,
        startTime: startTime ?? exam.startTime,
        endTime: endTime ?? exam.endTime,
        hall: hall ?? exam.hall,
        facultyId: facultyId !== undefined ? normalizedFacultyId : exam.facultyId,
        version: exam.version + 1,
      },
      { transaction: t }
    );

    await t.commit();

    logger.audit({
      actor_id: req.user.id,
      resource_id: exam.id,
      action: 'SCHEDULE_UPDATE',
      status: 'success',
      latency: Date.now() - start,
    });

    res.json({ message: 'Exam updated successfully', exam });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

// ─── Delete Exam ───────────────────────────────────────────────────────────────
const deleteExam = async (req, res, next) => {
  const start = Date.now();
  try {
    const exam = await Exam.findOne({ where: { id: req.params.id, isDeleted: false } });
    if (!exam) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Exam not found' },
      });
    }

    // Soft delete
    await exam.update({ isDeleted: true, version: exam.version + 1 });

    logger.audit({
      actor_id: req.user.id,
      resource_id: exam.id,
      action: 'SCHEDULE_DELETE',
      status: 'success',
      latency: Date.now() - start,
    });

    res.json({ message: 'Exam deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = { createExam, getExams, getExamById, updateExam, deleteExam };

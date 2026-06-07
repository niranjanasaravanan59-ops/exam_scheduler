const { Op } = require('sequelize');
const { validationResult } = require('express-validator');
const { Result, WORKFLOW_STATES } = require('./resultModel');
const { Exam } = require('../exam/examModel');
const { User } = require('../auth/authModel');
const { sequelize } = require('../../config/db');
const logger = require('../../config/logger');
const { isExamCompletedAt } = require('../../utils/examTiming');

// ─── Create Result ─────────────────────────────────────────────────────────────
const createResult = async (req, res, next) => {
  const start = Date.now();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: errors.array() },
      });
    }

    const { studentId, examId, marks, remarks } = req.body;
    // NEVER accept grade from client

    const exam = await Exam.findOne({ where: { id: examId, isDeleted: false } });
    if (!exam) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Exam not found' } });
    }

    // TRIPWIRE: Faculty must not enter marks before the exam has ended
    const now = new Date();
    if (!isExamCompletedAt(exam.examDate, exam.endTime, now)) {
      logger.warn('TRIPWIRE: marks entry before exam completion', {
        actor_id: req.user.id, examId, examDate: exam.examDate,
      });
      return res.status(403).json({
        error: {
          code: 'EXAM_NOT_COMPLETED',
          message: `Marks cannot be entered before exam ends on ${exam.examDate} at ${exam.endTime}`,
          examDate: exam.examDate,
          examEndTime: exam.endTime,
        },
      });
    }

    // Faculty can only enter marks for assigned exams
    if (req.user.role === 'faculty' && exam.facultyId !== req.user.id) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'You can only enter marks for your assigned subjects' },
      });
    }

    // Verify student exists
    const student = await User.findOne({ where: { id: studentId, role: 'student' } });
    if (!student) {
      return res.status(400).json({ error: { code: 'INVALID_STUDENT', message: 'Student not found' } });
    }

    if (student.department && exam.department && student.department !== exam.department) {
      return res.status(400).json({
        error: { code: 'INVALID_STUDENT', message: 'Student does not belong to this exam department' },
      });
    }

    const [result, created] = await Result.findOrCreate({
      where: { studentId, examId },
      defaults: { marks, enteredBy: req.user.id, remarks },
    });

    if (!created) {
      return res.status(409).json({
        error: { code: 'RESULT_EXISTS', message: 'Result already exists. Use PUT to update.' },
      });
    }

    logger.audit({
      actor_id: req.user.id,
      resource_id: result.id,
      action: 'RESULT_CREATE',
      status: 'success',
      latency: Date.now() - start,
    });

    res.status(201).json({ message: 'Result created', result });
  } catch (error) {
    next(error);
  }
};

// ─── Get Results ───────────────────────────────────────────────────────────────
const getResults = async (req, res, next) => {
  try {
    const { examId, studentId, status, subject, department, semester, studentName, page = 1, limit = 20 } = req.query;
    const where = {};
    const examWhere = { isDeleted: false };
    const studentWhere = { role: 'student' };

    // Students only see published results for themselves
    if (req.user.role === 'student') {
      where.studentId = req.user.id;
      where.status = WORKFLOW_STATES.PUBLISHED;
    } else {
      if (studentId) where.studentId = studentId;
      if (status) where.status = status;
    }

    if (req.user.role === 'faculty') {
      examWhere.facultyId = req.user.id;
    }

    if (examId) where.examId = examId;
    if (department) examWhere.department = { [Op.like]: `%${department}%` };
    if (semester) examWhere.semester = semester;
    if (subject) examWhere.subject = { [Op.like]: `%${subject}%` };
    if (studentName) studentWhere.name = { [Op.like]: `%${studentName}%` };

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await Result.findAndCountAll({
      where,
      include: [
        {
          model: Exam,
          as: 'exam',
          where: examWhere,
          attributes: ['id', 'subject', 'department', 'semester', 'examDate'],
        },
        {
          model: User,
          as: 'student',
          where: studentWhere,
          attributes: ['id', 'name', 'email', 'rollNo'],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    res.json({
      results: rows,
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

// ─── Update Result (with optimistic concurrency) ───────────────────────────────
const updateResult = async (req, res, next) => {
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

    const result = await Result.findByPk(req.params.id, {
      lock: t.LOCK.UPDATE,
      transaction: t,
      include: [{ model: Exam, as: 'exam' }],
    });

    if (!result) {
      await t.rollback();
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Result not found' } });
    }

    // Marks are editable only before faculty marks the result as ready.
    if (result.status !== WORKFLOW_STATES.DRAFT) {
      await t.rollback();
      return res.status(403).json({
        error: {
          code: 'RESULT_LOCKED',
          message: 'Marks can be edited only while the result is in draft status',
          status: result.status,
        },
      });
    }

    // TRIPWIRE check
    const now = new Date();
    if (!isExamCompletedAt(result.exam.examDate, result.exam.endTime, now)) {
      await t.rollback();
      return res.status(403).json({
        error: {
          code: 'EXAM_NOT_COMPLETED',
          message: `Marks cannot be updated before exam ends`,
        },
      });
    }

    // Faculty only for assigned subject
    if (req.user.role === 'faculty' && result.exam.facultyId !== req.user.id) {
      await t.rollback();
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'You can only update marks for your assigned subjects' },
      });
    }

    // ── Optimistic Concurrency ──
    const clientVersion = parseInt(req.body.version);
    if (clientVersion !== result.version) {
      await t.rollback();
      return res.status(409).json({
        error: {
          code: 'CONCURRENCY_CONFLICT',
          message: 'Result was modified by another user. Please reload.',
          currentVersion: result.version,
          yourVersion: clientVersion,
          options: ['RELOAD_LATEST', 'RETRY_CHANGES', 'COMPARE_VERSIONS'],
          currentData: {
            marks: result.marks,
            grade: result.grade,
            version: result.version,
          },
        },
      });
    }

    const { marks, remarks } = req.body;

    await result.update(
      {
        marks: marks ?? result.marks,
        remarks: remarks ?? result.remarks,
        version: result.version + 1,
        // grade is auto-computed in beforeUpdate hook
      },
      { transaction: t }
    );

    await t.commit();

    logger.audit({
      actor_id: req.user.id,
      resource_id: result.id,
      action: 'RESULT_UPDATE',
      status: 'success',
      latency: Date.now() - start,
    });

    res.json({ message: 'Result updated', result });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

// ─── Publish Result Workflow ───────────────────────────────────────────────────
const transitionResult = async (req, res, next) => {
  const start = Date.now();
  try {
    const { action } = req.body; // 'ready' or 'publish'
    const { id } = req.params;

    const result = await Result.findByPk(id, {
      include: [{ model: Exam, as: 'exam' }],
    });

    if (!result) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Result not found' } });
    }

    if (req.user.role === 'faculty' && result.exam.facultyId !== req.user.id) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'You can only manage results for your assigned subjects' },
      });
    }

    const VALID_TRANSITIONS = {
      draft: ['ready'],
      ready: ['published', 'draft'],
      published: [],
    };

    if (!VALID_TRANSITIONS[result.status].includes(action)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_TRANSITION',
          message: `Cannot transition from '${result.status}' to '${action}'`,
          allowedTransitions: VALID_TRANSITIONS[result.status],
        },
      });
    }

    // Only admin can publish
    if (action === 'published' && req.user.role !== 'admin') {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Only admins can publish results' },
      });
    }

    // Faculty can submit marks for review, but cannot unlock ready results.
    if (action === 'draft' && req.user.role !== 'admin') {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Only admins can move ready results back to draft' },
      });
    }

    const updateData = { status: action, version: result.version + 1 };
    if (action === 'published') {
      updateData.publishedBy = req.user.id;
      updateData.publishedAt = new Date();
    }

    await result.update(updateData);

    logger.audit({
      actor_id: req.user.id,
      resource_id: result.id,
      action: action === 'published' ? 'RESULT_PUBLISH' : 'RESULT_STATUS_UPDATE',
      status: 'success',
      latency: Date.now() - start,
      meta: { workflow: `${result.status} → ${action}` },
    });

    res.json({ message: `Result transitioned to ${action}`, result });
  } catch (error) {
    next(error);
  }
};

// ─── Bulk Publish by Exam ──────────────────────────────────────────────────────
const bulkPublishByExam = async (req, res, next) => {
  const start = Date.now();
  const t = await sequelize.transaction();
  try {
    const { examId } = req.params;

    const exam = await Exam.findOne({ where: { id: examId, isDeleted: false } });
    if (!exam) {
      await t.rollback();
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Exam not found' } });
    }

    const [updated] = await Result.update(
      {
        status: 'published',
        publishedBy: req.user.id,
        publishedAt: new Date(),
        version: sequelize.literal('version + 1'),
      },
      {
        where: { examId, status: 'ready' },
        transaction: t,
      }
    );

    await t.commit();

    logger.audit({
      actor_id: req.user.id,
      resource_id: examId,
      action: 'RESULT_BULK_PUBLISH',
      status: 'success',
      latency: Date.now() - start,
      meta: { count: updated },
    });

    res.json({ message: `${updated} results published for exam`, examId, count: updated });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

module.exports = { createResult, getResults, updateResult, transitionResult, bulkPublishByExam };

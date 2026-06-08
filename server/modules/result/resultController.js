const { Op, fn, col } = require('sequelize');
const { validationResult } = require('express-validator');
const { Result, WORKFLOW_STATES } = require('./resultModel');
const { Exam } = require('../exam/examModel');
const { User } = require('../auth/authModel');
const { Attendance, ATTENDANCE_STATUSES } = require('../attendance/attendanceModel');
const { sequelize } = require('../../config/db');
const logger = require('../../config/logger');
const { isExamCompletedAt } = require('../../utils/examTiming');

const isStudentMarkedAbsent = async (studentId, examId, transaction = null) => {
  const attendance = await Attendance.findOne({
    where: { studentId, examId },
    attributes: ['status'],
    transaction,
  });

  return attendance?.status === ATTENDANCE_STATUSES.ABSENT;
};

const rejectAbsentStudentResult = (res) => res.status(403).json({
  error: {
    code: 'STUDENT_ABSENT',
    message: 'Result cannot be entered or published for a student marked absent',
  },
});

const getAttendedCount = (studentCount, absentCount = 0, resultCount = 0) => {
  const numericStudentCount = Number(studentCount || 0);
  const numericAbsentCount = Number(absentCount || 0);
  const numericResultCount = Number(resultCount || 0);
  const eligibleStudentCount = Math.max(0, numericStudentCount - numericAbsentCount);

  return Math.max(numericResultCount, eligibleStudentCount);
};

const extractSortNumber = (value) => {
  if (!value) return NaN;
  const trailing = String(value).match(/(\d+)\s*$/);
  if (trailing) return parseInt(trailing[1], 10);
  const first = String(value).match(/(\d+)/);
  return first ? parseInt(first[1], 10) : NaN;
};

const compareStudents = (left, right) => {
  const x = left.student || left;
  const y = right.student || right;

  if (x.rollNo && y.rollNo) {
    const xNumber = extractSortNumber(x.rollNo);
    const yNumber = extractSortNumber(y.rollNo);
    if (!Number.isNaN(xNumber) && !Number.isNaN(yNumber)) return xNumber - yNumber;
    return x.rollNo.localeCompare(y.rollNo, undefined, { numeric: true, sensitivity: 'base' });
  }

  const xNameNumber = extractSortNumber(x.name);
  const yNameNumber = extractSortNumber(y.name);
  if (!Number.isNaN(xNameNumber) && !Number.isNaN(yNameNumber)) return xNameNumber - yNameNumber;

  return (x.name || '').localeCompare(y.name || '', undefined, { sensitivity: 'base' });
};

const toExamResultSummary = (exam, studentCountsByDepartment = {}, absentCountsByExam = {}) => {
  const plain = exam.toJSON();
  const results = plain.results || [];
  const readyCount = results.filter((result) => result.status === WORKFLOW_STATES.READY).length;
  const publishedCount = results.filter((result) => result.status === WORKFLOW_STATES.PUBLISHED).length;
  const absentCount = Number(absentCountsByExam[plain.id] || 0);
  const attendedCount = getAttendedCount(
    studentCountsByDepartment[plain.department],
    absentCount,
    results.length
  );
  const notReadyCount = Math.max(0, attendedCount - readyCount - publishedCount);

  return {
    id: plain.id,
    subject: plain.subject,
    department: plain.department,
    semester: plain.semester,
    examDate: plain.examDate,
    startTime: plain.startTime,
    endTime: plain.endTime,
    hall: plain.hall,
    attendedCount,
    absentCount,
    notReadyCount,
    readyCount,
    publishedCount,
  };
};

const getResultExamSummary = (results, studentCount, absentCount = 0) => {
  const readyCount = results.filter((result) => result.status === WORKFLOW_STATES.READY).length;
  const publishedCount = results.filter((result) => result.status === WORKFLOW_STATES.PUBLISHED).length;
  const attendedCount = getAttendedCount(studentCount, absentCount, results.length);
  const notReadyCount = Math.max(0, attendedCount - readyCount - publishedCount);

  return {
    attendedCount,
    absentCount,
    notReadyCount,
    readyCount,
    publishedCount,
  };
};

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

    if (await isStudentMarkedAbsent(studentId, examId)) {
      return rejectAbsentStudentResult(res);
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

const getResultExamOverview = async (req, res, next) => {
  try {
    const { department } = req.query;
    const examWhere = { isDeleted: false };

    if (department) examWhere.department = department;

    const [departmentRows, studentCountRows, absentCountRows, exams] = await Promise.all([
      Exam.findAll({
        where: { isDeleted: false },
        attributes: ['department'],
        group: ['department'],
        order: [['department', 'ASC']],
        raw: true,
      }),
      User.findAll({
        where: { role: 'student', isActive: true },
        attributes: ['department', [fn('COUNT', col('id')), 'count']],
        group: ['department'],
        raw: true,
      }),
      Attendance.findAll({
        where: { status: ATTENDANCE_STATUSES.ABSENT },
        attributes: ['examId', [fn('COUNT', col('id')), 'count']],
        group: ['examId'],
        raw: true,
      }),
      Exam.findAll({
        where: examWhere,
        attributes: ['id', 'subject', 'department', 'semester', 'examDate', 'startTime', 'endTime', 'hall'],
        include: [
          {
            model: Result,
            as: 'results',
            attributes: ['id', 'status'],
            required: false,
          },
        ],
        order: [['department', 'ASC'], ['examDate', 'DESC'], ['startTime', 'ASC']],
      }),
    ]);

    const studentCountsByDepartment = studentCountRows.reduce((acc, row) => {
      acc[row.department] = parseInt(row.count, 10);
      return acc;
    }, {});

    const absentCountsByExam = absentCountRows.reduce((acc, row) => {
      acc[row.examId] = parseInt(row.count, 10);
      return acc;
    }, {});

    res.json({
      departments: departmentRows.map((row) => row.department).filter(Boolean),
      exams: exams.map((exam) => toExamResultSummary(exam, studentCountsByDepartment, absentCountsByExam)),
    });
  } catch (error) {
    next(error);
  }
};

const getResultExamDetail = async (req, res, next) => {
  try {
    const { examId } = req.params;
    const { status, studentName } = req.query;

    const exam = await Exam.findOne({
      where: { id: examId, isDeleted: false },
      attributes: ['id', 'subject', 'department', 'semester', 'examDate', 'startTime', 'endTime', 'hall'],
    });

    if (!exam) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Exam not found' } });
    }

    const studentWhere = { role: 'student' };

    if (exam.department) studentWhere.department = exam.department;
    studentWhere.isActive = true;
    if (studentName) studentWhere.name = { [Op.like]: `%${studentName}%` };

    const [allStudents, students, allResults] = await Promise.all([
      User.findAll({
        where: {
          role: 'student',
          isActive: true,
          ...(exam.department ? { department: exam.department } : {}),
        },
        attributes: ['id'],
        raw: true,
      }),
      User.findAll({
        where: studentWhere,
        attributes: ['id', 'name', 'email', 'rollNo'],
        order: [['rollNo', 'ASC'], ['name', 'ASC']],
      }),
      Result.findAll({
        where: { examId },
        attributes: ['id', 'studentId', 'examId', 'marks', 'grade', 'status', 'version', 'remarks'],
        raw: true,
      }),
    ]);

    const allStudentIds = allStudents.map((student) => student.id);
    const attendanceRows = allStudentIds.length
      ? await Attendance.findAll({
        where: { examId, studentId: { [Op.in]: allStudentIds } },
        attributes: ['studentId', 'status', 'markedAt'],
        raw: true,
      })
      : [];

    const attendanceByStudentId = attendanceRows.reduce((acc, row) => {
      acc[row.studentId] = row;
      return acc;
    }, {});

    const resultsByStudentId = allResults.reduce((acc, result) => {
      acc[result.studentId] = result;
      return acc;
    }, {});

    const absentCount = attendanceRows.filter((row) => row.status === ATTENDANCE_STATUSES.ABSENT).length;
    const results = students
      .map((student) => {
        const plainStudent = student.toJSON();
        const result = resultsByStudentId[plainStudent.id];
        const attendance = attendanceByStudentId[plainStudent.id];
        const attendanceStatus = attendance?.status || 'unmarked';
        const isAbsent = attendanceStatus === ATTENDANCE_STATUSES.ABSENT;

        return {
          id: result?.id || `pending-${plainStudent.id}`,
          studentId: plainStudent.id,
          examId,
          marks: isAbsent ? null : result?.marks ?? null,
          grade: isAbsent ? null : result?.grade ?? null,
          status: isAbsent ? 'blocked' : result?.status || 'not_entered',
          resultStatus: result?.status || null,
          attendanceStatus,
          attendanceMarkedAt: attendance?.markedAt || null,
          version: result?.version ?? null,
          remarks: result?.remarks ?? null,
          student: plainStudent,
          hasResult: Boolean(result),
        };
      })
      .filter((row) => {
        if (!status) return true;
        if (status === 'blocked') return row.status === 'blocked';
        if (status === WORKFLOW_STATES.DRAFT) {
          return row.status === WORKFLOW_STATES.DRAFT || row.status === 'not_entered';
        }
        return row.status === status;
      })
      .sort(compareStudents);

    res.json({
      exam: {
        ...exam.toJSON(),
        ...getResultExamSummary(allResults, allStudents.length, absentCount),
      },
      results,
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

    if (await isStudentMarkedAbsent(result.studentId, result.examId, t)) {
      await t.rollback();
      return rejectAbsentStudentResult(res);
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

    if (['ready', 'published'].includes(action) && await isStudentMarkedAbsent(result.studentId, result.examId)) {
      return rejectAbsentStudentResult(res);
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

    const absentRows = await Attendance.findAll({
      where: { examId, status: ATTENDANCE_STATUSES.ABSENT },
      attributes: ['studentId'],
      transaction: t,
      raw: true,
    });
    const absentStudentIds = absentRows.map((row) => row.studentId);
    const publishWhere = { examId, status: 'ready' };
    if (absentStudentIds.length) {
      publishWhere.studentId = { [Op.notIn]: absentStudentIds };
    }

    const [updated] = await Result.update(
      {
        status: 'published',
        publishedBy: req.user.id,
        publishedAt: new Date(),
        version: sequelize.literal('version + 1'),
      },
      {
        where: publishWhere,
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

    res.json({
      message: `${updated} results published for exam`,
      examId,
      count: updated,
      skippedAbsent: absentStudentIds.length,
    });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

module.exports = {
  createResult,
  getResults,
  getResultExamOverview,
  getResultExamDetail,
  updateResult,
  transitionResult,
  bulkPublishByExam,
};

const { Op, fn, col } = require('sequelize');
const { validationResult } = require('express-validator');
const { Attendance, ATTENDANCE_STATUSES } = require('./attendanceModel');
const { Exam } = require('../exam/examModel');
const { Result, WORKFLOW_STATES } = require('../result/resultModel');
const { User } = require('../auth/authModel');
const { sequelize } = require('../../config/db');
const { isExamCompletedAt } = require('../../utils/examTiming');

const round2 = (value) => parseFloat(Number(value || 0).toFixed(2));

const getExamForUser = async (examId, user) => {
  const exam = await Exam.findOne({
    where: { id: examId, isDeleted: false },
    attributes: ['id', 'subject', 'department', 'semester', 'examDate', 'startTime', 'endTime', 'hall', 'facultyId'],
  });

  if (!exam) return { errorStatus: 404, error: { code: 'NOT_FOUND', message: 'Exam not found' } };
  if (user.role === 'faculty' && exam.facultyId !== user.id) {
    return { errorStatus: 403, error: { code: 'FORBIDDEN', message: 'You can manage attendance only for assigned exams' } };
  }

  return { exam };
};

const getAttendanceExamDetail = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: errors.array() },
      });
    }

    const access = await getExamForUser(req.params.examId, req.user);
    if (access.error) return res.status(access.errorStatus).json({ error: access.error });

    const exam = access.exam;
    const students = await User.findAll({
      where: {
        role: 'student',
        isActive: true,
        ...(exam.department ? { department: exam.department } : {}),
      },
      attributes: ['id', 'name', 'email', 'rollNo', 'department'],
      order: [['rollNo', 'ASC'], ['name', 'ASC']],
    });

    const studentIds = students.map((student) => student.id);
    const [attendanceRows, results, avgRow] = await Promise.all([
      Attendance.findAll({
        where: { examId: exam.id, studentId: { [Op.in]: studentIds } },
        attributes: ['id', 'studentId', 'status', 'markedAt'],
        raw: true,
      }),
      Result.findAll({
        where: { examId: exam.id, studentId: { [Op.in]: studentIds } },
        attributes: ['id', 'studentId', 'marks', 'grade', 'status', 'version'],
        raw: true,
      }),
      Result.findOne({
        where: { examId: exam.id, studentId: { [Op.in]: studentIds } },
        attributes: [[fn('AVG', col('marks')), 'averageMarks']],
        raw: true,
      }),
    ]);

    const attendanceByStudent = attendanceRows.reduce((acc, row) => {
      acc[row.studentId] = row;
      return acc;
    }, {});
    const resultsByStudent = results.reduce((acc, result) => {
      acc[result.studentId] = result;
      return acc;
    }, {});

    const presentCount = attendanceRows.filter((row) => row.status === ATTENDANCE_STATUSES.PRESENT).length;
    const absentCount = attendanceRows.filter((row) => row.status === ATTENDANCE_STATUSES.ABSENT).length;

    res.json({
      exam: {
        ...exam.toJSON(),
        completed: isExamCompletedAt(exam.examDate, exam.endTime),
      },
      summary: {
        totalStudents: students.length,
        presentCount,
        absentCount,
        unmarkedCount: Math.max(0, students.length - presentCount - absentCount),
        resultCount: results.length,
        averageMarks: round2(avgRow?.averageMarks),
      },
      students: students.map((student) => {
        const plain = student.toJSON();
        const attendance = attendanceByStudent[plain.id];
        return {
          ...plain,
          attendanceStatus: attendance?.status || 'unmarked',
          attendanceMarkedAt: attendance?.markedAt || null,
          result: resultsByStudent[plain.id] || null,
        };
      }),
    });
  } catch (error) {
    next(error);
  }
};

const markAttendance = async (req, res, next) => {
  let transaction;
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: errors.array() },
      });
    }

    const access = await getExamForUser(req.params.examId, req.user);
    if (access.error) return res.status(access.errorStatus).json({ error: access.error });

    const exam = access.exam;
    if (!isExamCompletedAt(exam.examDate, exam.endTime)) {
      return res.status(403).json({
        error: { code: 'EXAM_NOT_COMPLETED', message: 'Attendance can be marked only after the exam is completed' },
      });
    }

    const student = await User.findOne({
      where: {
        id: req.params.studentId,
        role: 'student',
        isActive: true,
        ...(exam.department ? { department: exam.department } : {}),
      },
      attributes: ['id', 'name', 'rollNo', 'department'],
    });

    if (!student) {
      return res.status(404).json({
        error: { code: 'INVALID_STUDENT', message: 'Student not found for this exam department' },
      });
    }

    transaction = await sequelize.transaction();
    const existingResult = await Result.findOne({
      where: { examId: exam.id, studentId: student.id },
      attributes: ['id', 'status'],
      lock: transaction.LOCK.UPDATE,
      transaction,
    });

    if (req.body.status === ATTENDANCE_STATUSES.ABSENT && existingResult?.status === WORKFLOW_STATES.PUBLISHED) {
      await transaction.rollback();
      transaction = null;
      return res.status(409).json({
        error: {
          code: 'RESULT_ALREADY_PUBLISHED',
          message: 'Published results cannot be marked absent',
        },
      });
    }

    let clearedResult = false;
    if (req.body.status === ATTENDANCE_STATUSES.ABSENT && existingResult) {
      await existingResult.destroy({ transaction });
      clearedResult = true;
    }

    const [attendance, created] = await Attendance.findOrCreate({
      where: { examId: exam.id, studentId: student.id },
      defaults: {
        status: req.body.status,
        markedBy: req.user.id,
        markedAt: new Date(),
      },
      transaction,
    });

    if (!created) {
      await attendance.update({
        status: req.body.status,
        markedBy: req.user.id,
        markedAt: new Date(),
      }, {
        transaction,
      });
    }

    await transaction.commit();
    transaction = null;

    res.json({
      message: 'Attendance updated',
      attendance,
      clearedResult,
    });
  } catch (error) {
    if (transaction) await transaction.rollback();
    next(error);
  }
};

module.exports = { getAttendanceExamDetail, markAttendance };

const { Op, fn, col } = require('sequelize');
const { Exam } = require('../exam/examModel');
const { Result } = require('../result/resultModel');
const { User } = require('../auth/authModel');
const { Attendance, ATTENDANCE_STATUSES } = require('../attendance/attendanceModel');
const { buildCompletedExamWhere, buildNotCompletedExamWhere } = require('../../utils/examTiming');

const round2 = (value) => parseFloat(Number(value || 0).toFixed(2));

const getAttendedCount = (studentCount, absentCount = 0, resultCount = 0) => {
  const eligibleStudentCount = Math.max(0, Number(studentCount || 0) - Number(absentCount || 0));
  return Math.max(Number(resultCount || 0), eligibleStudentCount);
};

// ─── Admin Dashboard ───────────────────────────────────────────────────────────
const getAdminDashboard = async (req, res, next) => {
  try {
    const now = new Date();

    const [
      upcomingExams,
      examsCompleted,
      resultsPendingPublication,
      finishedPublications,
      passedResults,
      totalStudents,
      totalFaculty,
      totalExams,
    ] = await Promise.all([
      Exam.count({ where: buildNotCompletedExamWhere(Op, {}, now) }),
      Exam.count({ where: buildCompletedExamWhere(Op, {}, now) }),
      Result.count({ where: { status: { [Op.in]: ['draft', 'ready'] } } }),
      Result.count({ where: { status: 'published' } }),
      Result.count({ where: { status: 'published', grade: { [Op.notIn]: ['F'] } } }),
      User.count({ where: { role: 'student', isActive: true } }),
      User.count({ where: { role: 'faculty', isActive: true } }),
      Exam.count({ where: { isDeleted: false } }),
    ]);

    const overallPassPercentage =
      finishedPublications > 0 ? parseFloat(((passedResults / finishedPublications) * 100).toFixed(2)) : 0;

    const exams = await Exam.findAll({
      where: { isDeleted: false },
      order: [['examDate', 'ASC'], ['startTime', 'ASC']],
      attributes: ['id', 'subject', 'department', 'semester', 'examDate', 'startTime', 'endTime', 'hall'],
    });

    res.json({
      dashboard: {
        type: 'admin',
        kpis: {
          upcomingExams,
          examsCompleted,
          resultsPendingPublication,
          finishedPublications,
          overallPassPercentage,
          totalExams,
          totalStudents,
          totalFaculty,
        },
        exams,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getAdminPublicationOverview = async (req, res, next) => {
  try {
    const completedExams = await Exam.findAll({
      where: buildCompletedExamWhere(Op, {}, new Date()),
      attributes: ['id', 'subject', 'department', 'semester', 'examDate', 'startTime', 'endTime', 'hall'],
      include: [
        {
          model: Result,
          as: 'results',
          attributes: ['id', 'marks', 'grade', 'status'],
          required: false,
        },
      ],
      order: [['subject', 'ASC'], ['examDate', 'DESC'], ['startTime', 'ASC']],
    });

    const completedExamIds = completedExams.map((exam) => exam.id);
    const [studentCountRows, absentCountRows] = await Promise.all([
      User.findAll({
        where: { role: 'student', isActive: true },
        attributes: ['department', [fn('COUNT', col('id')), 'count']],
        group: ['department'],
        raw: true,
      }),
      completedExamIds.length
        ? Attendance.findAll({
          where: {
            examId: { [Op.in]: completedExamIds },
            status: ATTENDANCE_STATUSES.ABSENT,
          },
          attributes: ['examId', [fn('COUNT', col('id')), 'count']],
          group: ['examId'],
          raw: true,
        })
        : [],
    ]);

    const studentCountsByDepartment = studentCountRows.reduce((acc, row) => {
      acc[row.department] = parseInt(row.count, 10);
      return acc;
    }, {});

    const absentCountsByExam = absentCountRows.reduce((acc, row) => {
      acc[row.examId] = parseInt(row.count, 10);
      return acc;
    }, {});

    const exams = completedExams.map((exam) => {
      const plain = exam.toJSON();
      const results = plain.results || [];
      const absentCount = Number(absentCountsByExam[plain.id] || 0);
      const evaluatedCount = results.length;
      const totalStudents = getAttendedCount(
        studentCountsByDepartment[plain.department],
        absentCount,
        evaluatedCount
      );
      const draftCount = results.filter((result) => result.status === 'draft').length;
      const readyCount = results.filter((result) => result.status === 'ready').length;
      const publishedCount = results.filter((result) => result.status === 'published').length;
      const notReadyCount = Math.max(0, totalStudents - readyCount - publishedCount);
      const failCount = results.filter((result) => result.grade === 'F').length;
      const passCount = results.filter((result) => result.grade && result.grade !== 'F').length;
      const totalMarks = results.reduce((sum, result) => sum + Number(result.marks || 0), 0);

      return {
        id: plain.id,
        subject: plain.subject,
        department: plain.department,
        semester: plain.semester,
        examDate: plain.examDate,
        startTime: plain.startTime,
        endTime: plain.endTime,
        hall: plain.hall,
        totalStudents,
        absentCount,
        evaluatedCount,
        draftCount,
        notReadyCount,
        readyCount,
        publishedCount,
        passCount,
        failCount,
        totalMarks,
        passRate: evaluatedCount > 0 ? round2((passCount / evaluatedCount) * 100) : 0,
        averageMarks: evaluatedCount > 0 ? round2(totalMarks / evaluatedCount) : 0,
      };
    });

    const subjects = exams.reduce((acc, exam) => {
      if (!acc[exam.subject]) {
        acc[exam.subject] = {
          subject: exam.subject,
          completedExams: 0,
          totalStudents: 0,
          absentCount: 0,
          evaluatedCount: 0,
          draftCount: 0,
          notReadyCount: 0,
          readyCount: 0,
          publishedCount: 0,
          passCount: 0,
          failCount: 0,
          totalMarks: 0,
          exams: [],
        };
      }

      acc[exam.subject].completedExams += 1;
      acc[exam.subject].totalStudents += exam.totalStudents;
      acc[exam.subject].absentCount += exam.absentCount;
      acc[exam.subject].evaluatedCount += exam.evaluatedCount;
      acc[exam.subject].draftCount += exam.draftCount;
      acc[exam.subject].notReadyCount += exam.notReadyCount;
      acc[exam.subject].readyCount += exam.readyCount;
      acc[exam.subject].publishedCount += exam.publishedCount;
      acc[exam.subject].passCount += exam.passCount;
      acc[exam.subject].failCount += exam.failCount;
      acc[exam.subject].totalMarks += exam.totalMarks;
      acc[exam.subject].exams.push(exam);

      return acc;
    }, {});

    const groupedSubjects = Object.values(subjects).map((subject) => ({
      ...subject,
      averageMarks: subject.evaluatedCount > 0
        ? round2(subject.totalMarks / subject.evaluatedCount)
        : 0,
      passRate: subject.evaluatedCount > 0
        ? round2((subject.passCount / subject.evaluatedCount) * 100)
        : 0,
      totalMarks: undefined,
    }));

    const summary = exams.reduce((acc, exam) => {
      acc.totalStudents += exam.totalStudents;
      acc.absentCount += exam.absentCount;
      acc.evaluatedCount += exam.evaluatedCount;
      acc.draftCount += exam.draftCount;
      acc.notReadyCount += exam.notReadyCount;
      acc.readyCount += exam.readyCount;
      acc.publishedCount += exam.publishedCount;
      acc.passCount += exam.passCount;
      acc.failCount += exam.failCount;
      acc.totalMarks += exam.totalMarks;
      return acc;
    }, {
      completedExams: exams.length,
      totalStudents: 0,
      absentCount: 0,
      evaluatedCount: 0,
      draftCount: 0,
      notReadyCount: 0,
      readyCount: 0,
      publishedCount: 0,
      passCount: 0,
      failCount: 0,
      totalMarks: 0,
    });

    const summaryPayload = {
      ...summary,
      averageMarks: summary.evaluatedCount > 0
        ? round2(summary.totalMarks / summary.evaluatedCount)
        : 0,
      passRate: summary.evaluatedCount > 0
        ? round2((summary.passCount / summary.evaluatedCount) * 100)
        : 0,
      totalMarks: undefined,
    };

    res.json({
      overview: {
        summary: summaryPayload,
        subjects: groupedSubjects,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Faculty Dashboard ─────────────────────────────────────────────────────────
const getFacultyDashboard = async (req, res, next) => {
  try {
    const now = new Date();

    // Exams assigned to this faculty that have passed their scheduled end time
    const assignedCompletedExams = await Exam.findAll({
      where: buildCompletedExamWhere(Op, { facultyId: req.user.id }, now),
      attributes: ['id'],
    });
    const completedExamIds = assignedCompletedExams.map((e) => e.id);

    // Pending evaluation: completed exams with no/incomplete results entry
    const resultsEntered = await Result.count({
      where: { examId: { [Op.in]: completedExamIds } },
    });

    const pendingEvaluation = Math.max(0, completedExamIds.length - resultsEntered);

    // Average marks for faculty's subjects
    const avgResult = await Result.findOne({
      where: { examId: { [Op.in]: completedExamIds } },
      attributes: [[fn('AVG', col('marks')), 'avgMarks']],
      raw: true,
    });

    const upcomingAssigned = await Exam.count({
      where: buildNotCompletedExamWhere(Op, { facultyId: req.user.id }, now),
    });

    res.json({
      dashboard: {
        type: 'faculty',
        kpis: {
          subjectsPendingEvaluation: pendingEvaluation,
          averageMarks: avgResult?.avgMarks
            ? parseFloat(parseFloat(avgResult.avgMarks).toFixed(2))
            : 0,
          upcomingAssignedExams: upcomingAssigned,
          totalCompletedExams: completedExamIds.length,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Student Dashboard ─────────────────────────────────────────────────────────
const getStudentDashboard = async (req, res, next) => {
  try {
    const now = new Date();
    const studentId = req.user.id;

    const [upcomingExams, publishedResults] = await Promise.all([
      Exam.count({
        where: buildNotCompletedExamWhere(Op, {
          department: req.user.department || { [Op.ne]: null },
        }, now),
      }),
      Result.count({ where: { studentId, status: 'published' } }),
    ]);

    // Student's performance summary
    const results = await Result.findAll({
      where: { studentId, status: 'published' },
      attributes: ['marks', 'grade'],
      raw: true,
    });

    const totalMarks = results.reduce((sum, r) => sum + parseFloat(r.marks), 0);
    const avgMarks = results.length > 0 ? parseFloat((totalMarks / results.length).toFixed(2)) : 0;
    const passed = results.filter((r) => r.grade !== 'F').length;
    const passPercentage = results.length > 0
      ? parseFloat(((passed / results.length) * 100).toFixed(2))
      : 0;

    const gradeDistribution = results.reduce((acc, r) => {
      acc[r.grade] = (acc[r.grade] || 0) + 1;
      return acc;
    }, {});

    res.json({
      dashboard: {
        type: 'student',
        kpis: {
          upcomingExams,
          publishedResults,
          averageMarks: avgMarks,
          passPercentage,
          gradeDistribution,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Router ────────────────────────────────────────────────────────────────────
const getDashboard = (req, res, next) => {
  const { role } = req.user;
  if (role === 'admin') return getAdminDashboard(req, res, next);
  if (role === 'faculty') return getFacultyDashboard(req, res, next);
  if (role === 'student') return getStudentDashboard(req, res, next);
  res.status(400).json({ error: { code: 'INVALID_ROLE', message: 'Unknown role' } });
};

module.exports = { getDashboard, getAdminPublicationOverview };

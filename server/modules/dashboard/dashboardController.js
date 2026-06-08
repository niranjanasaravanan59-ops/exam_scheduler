const { Op, fn, col } = require('sequelize');
const { Exam } = require('../exam/examModel');
const { Result } = require('../result/resultModel');
const { User } = require('../auth/authModel');
const { buildCompletedExamWhere, buildNotCompletedExamWhere } = require('../../utils/examTiming');

const round2 = (value) => parseFloat(Number(value || 0).toFixed(2));

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
    ] = await Promise.all([
      Exam.count({ where: buildNotCompletedExamWhere(Op, {}, now) }),
      Exam.count({ where: buildCompletedExamWhere(Op, {}, now) }),
      Result.count({ where: { status: { [Op.in]: ['draft', 'ready'] } } }),
      Result.count({ where: { status: 'published' } }),
      Result.count({ where: { status: 'published', grade: { [Op.notIn]: ['F'] } } }),
      User.count({ where: { role: 'student', isActive: true } }),
      User.count({ where: { role: 'faculty', isActive: true } }),
    ]);

    const overallPassPercentage =
      finishedPublications > 0 ? parseFloat(((passedResults / finishedPublications) * 100).toFixed(2)) : 0;

    const gradeRows = await Result.findAll({
      where: { status: 'published' },
      attributes: ['grade', [fn('COUNT', col('grade')), 'count']],
      group: ['grade'],
      raw: true,
    });
    const gradeDistribution = gradeRows.reduce((acc, row) => {
      acc[row.grade] = parseInt(row.count, 10);
      return acc;
    }, {});

    // Recent activity
    const recentExams = await Exam.findAll({
      where: { isDeleted: false },
      order: [['createdAt', 'DESC']],
      limit: 5,
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
          totalStudents,
          totalFaculty,
          gradeDistribution,
        },
        recentExams,
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

    const exams = completedExams.map((exam) => {
      const plain = exam.toJSON();
      const results = plain.results || [];
      const totalStudents = results.length;
      const draftCount = results.filter((result) => result.status === 'draft').length;
      const readyCount = results.filter((result) => result.status === 'ready').length;
      const publishedCount = results.filter((result) => result.status === 'published').length;
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
        draftCount,
        readyCount,
        publishedCount,
        passCount,
        failCount,
        passRate: totalStudents > 0 ? round2((passCount / totalStudents) * 100) : 0,
        averageMarks: totalStudents > 0 ? round2(totalMarks / totalStudents) : 0,
      };
    });

    const subjects = exams.reduce((acc, exam) => {
      if (!acc[exam.subject]) {
        acc[exam.subject] = {
          subject: exam.subject,
          completedExams: 0,
          totalStudents: 0,
          draftCount: 0,
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
      acc[exam.subject].draftCount += exam.draftCount;
      acc[exam.subject].readyCount += exam.readyCount;
      acc[exam.subject].publishedCount += exam.publishedCount;
      acc[exam.subject].passCount += exam.passCount;
      acc[exam.subject].failCount += exam.failCount;
      acc[exam.subject].totalMarks += exam.averageMarks * exam.totalStudents;
      acc[exam.subject].exams.push(exam);

      return acc;
    }, {});

    const groupedSubjects = Object.values(subjects).map((subject) => ({
      ...subject,
      averageMarks: subject.totalStudents > 0
        ? round2(subject.totalMarks / subject.totalStudents)
        : 0,
      passRate: subject.totalStudents > 0
        ? round2((subject.passCount / subject.totalStudents) * 100)
        : 0,
      totalMarks: undefined,
    }));

    const summary = exams.reduce((acc, exam) => {
      acc.totalStudents += exam.totalStudents;
      acc.draftCount += exam.draftCount;
      acc.readyCount += exam.readyCount;
      acc.publishedCount += exam.publishedCount;
      acc.passCount += exam.passCount;
      acc.failCount += exam.failCount;
      acc.totalMarks += exam.averageMarks * exam.totalStudents;
      return acc;
    }, {
      completedExams: exams.length,
      totalStudents: 0,
      draftCount: 0,
      readyCount: 0,
      publishedCount: 0,
      passCount: 0,
      failCount: 0,
      totalMarks: 0,
    });

    const summaryPayload = {
      ...summary,
      averageMarks: summary.totalStudents > 0
        ? round2(summary.totalMarks / summary.totalStudents)
        : 0,
      passRate: summary.totalStudents > 0
        ? round2((summary.passCount / summary.totalStudents) * 100)
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

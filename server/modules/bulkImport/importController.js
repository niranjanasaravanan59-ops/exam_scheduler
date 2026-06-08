const fs = require('fs');
const csv = require('csv-parser');
const { v4: uuidv4 } = require('uuid');
const { Result, computeGrade } = require('../result/resultModel');
const { Exam } = require('../exam/examModel');
const { User } = require('../auth/authModel');
const { Attendance, ATTENDANCE_STATUSES } = require('../attendance/attendanceModel');
const { sequelize } = require('../../config/db');
const logger = require('../../config/logger');
const { isExamCompletedAt } = require('../../utils/examTiming');

const importResults = async (req, res, next) => {
  const start = Date.now();
  const filePath = req.file.path;
  const batchId = uuidv4();

  try {
    const rows = await parseCSV(filePath);

    if (rows.length < 1) {
      return res.status(400).json({
        error: { code: 'EMPTY_FILE', message: 'CSV file has no data rows' },
      });
    }

    const report = {
      batchId,
      total: rows.length,
      imported: 0,
      skipped: 0,
      errors: [],
    };

    // Process in batches of 50 for efficiency
    const BATCH_SIZE = 50;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      await processBatch(batch, batchId, req.user.id, report, i);
    }

    logger.audit({
      actor_id: req.user.id,
      resource_id: batchId,
      action: 'BULK_IMPORT',
      status: 'success',
      latency: Date.now() - start,
      meta: {
        total: report.total,
        imported: report.imported,
        skipped: report.skipped,
      },
    });

    res.json({
      message: 'Import completed',
      report,
    });
  } catch (error) {
    next(error);
  } finally {
    // Cleanup uploaded file
    fs.unlink(filePath, () => {});
  }
};

const processBatch = async (rows, batchId, actorId, report, offset) => {
  const t = await sequelize.transaction();
  try {
    for (let idx = 0; idx < rows.length; idx++) {
      const row = rows[idx];
      const rowNum = offset + idx + 2; // +2 for header + 0-index

      // Validate required fields
      const validation = validateRow(row, rowNum);
      if (validation.error) {
        report.errors.push(validation);
        continue;
      }

      const { exam_id, roll_no, marks } = row;
      const marksNum = parseFloat(marks);

      // Validate exam exists
      const exam = await Exam.findOne({
        where: { id: exam_id, isDeleted: false },
        transaction: t,
      });
      if (!exam) {
        report.errors.push({ row: rowNum, field: 'exam_id', message: `Exam ${exam_id} not found` });
        continue;
      }

      if (exam.facultyId !== actorId) {
        report.errors.push({
          row: rowNum,
          field: 'exam_id',
          message: `Exam ${exam_id} is not assigned to this faculty account`,
        });
        continue;
      }

      // TRIPWIRE: Check exam has ended
      const now = new Date();
      if (!isExamCompletedAt(exam.examDate, exam.endTime, now)) {
        report.errors.push({
          row: rowNum,
          field: 'exam_id',
          message: `Exam ${exam_id} has not been completed yet`,
        });
        continue;
      }

      // Validate student exists
      const student = await User.findOne({
        where: { rollNo: roll_no, role: 'student' },
        transaction: t,
      });
      if (!student) {
        report.errors.push({ row: rowNum, field: 'roll_no', message: `Student with roll no ${roll_no} not found` });
        continue;
      }

      if (student.department && exam.department && student.department !== exam.department) {
        report.errors.push({
          row: rowNum,
          field: 'roll_no',
          message: `Student ${roll_no} is not in ${exam.department}`,
        });
        continue;
      }

      const attendance = await Attendance.findOne({
        where: { examId: exam_id, studentId: student.id },
        attributes: ['status'],
        transaction: t,
      });
      if (attendance?.status === ATTENDANCE_STATUSES.ABSENT) {
        report.errors.push({
          row: rowNum,
          field: 'roll_no',
          message: `Student ${roll_no} is marked absent for this exam`,
        });
        continue;
      }

      // IDEMPOTENCY: Check for existing record — upsert
      const [result, created] = await Result.findOrCreate({
        where: { studentId: student.id, examId: exam_id },
        defaults: {
          marks: marksNum,
          grade: computeGrade(marksNum),
          enteredBy: actorId,
          importBatch: batchId,
          status: 'draft',
        },
        transaction: t,
      });

      if (!created) {
        // Idempotency: same file uploaded twice — skip if already in a batch
        // Only update if this is a fresh update (not re-import of same batch)
        if (result.importBatch !== batchId) {
          report.skipped++;
        } else {
          report.skipped++;
        }
      } else {
        report.imported++;
      }
    }
    await t.commit();
  } catch (error) {
    await t.rollback();
    throw error;
  }
};

const validateRow = (row, rowNum) => {
  if (!row.exam_id) return { row: rowNum, field: 'exam_id', message: 'exam_id is required' };
  if (!row.roll_no) return { row: rowNum, field: 'roll_no', message: 'roll_no is required' };
  if (!row.marks && row.marks !== '0') return { row: rowNum, field: 'marks', message: 'marks is required' };

  const marks = parseFloat(row.marks);
  if (isNaN(marks) || marks < 0 || marks > 100) {
    return { row: rowNum, field: 'marks', message: 'marks must be between 0 and 100' };
  }
  return { error: false };
};

const parseCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(filePath)
      .pipe(csv({
        mapHeaders: ({ header }) => header.trim().toLowerCase().replace(/\s+/g, '_'),
      }))
      .on('data', (row) => {
        // Trim all values
        const clean = {};
        Object.keys(row).forEach((k) => { clean[k] = typeof row[k] === 'string' ? row[k].trim() : row[k]; });
        rows.push(clean);
      })
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
};

const getImportTemplate = (req, res) => {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="results_import_template.csv"');
  res.send('exam_id,roll_no,marks\n11111111-1111-4111-8111-111111111111,CSE2026001,85\n11111111-1111-4111-8111-111111111111,CSE2026002,72');
};

module.exports = { importResults, getImportTemplate };

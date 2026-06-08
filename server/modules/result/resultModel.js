const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');

const WORKFLOW_STATES = {
  DRAFT: 'draft',
  READY: 'ready',
  PUBLISHED: 'published',
};

// Server-side grade computation — NEVER accept from client
const computeGrade = (marks) => {
  if (marks >= 90) return 'O';
  if (marks >= 75) return 'A+';
  if (marks >= 60) return 'A';
  if (marks >= 50) return 'B';
  if (marks >= 40) return 'C';
  return 'F';
};

const Result = sequelize.define(
  'Result',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    studentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    examId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'exams', key: 'id' },
    },
    marks: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      validate: { min: 0, max: 100 },
    },
    // Grade is ALWAYS server-computed
    grade: {
      type: DataTypes.ENUM('O', 'A+', 'A', 'B', 'C', 'F'),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('draft', 'ready', 'published'),
      defaultValue: 'draft',
      allowNull: false,
    },
    enteredBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    publishedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
    },
    publishedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    importBatch: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'CSV import batch ID for idempotency',
    },
    version: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      allowNull: false,
    },
    remarks: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
  },
  {
    tableName: 'results',
    indexes: [
      { unique: true, fields: ['studentId', 'examId'] },
      { fields: ['examId'] },
      { fields: ['status'] },
      { fields: ['importBatch'] },
    ],
    hooks: {
      beforeValidate: (result) => {
        const marks = parseFloat(result.marks);
        if (Number.isFinite(marks) && (result.isNewRecord || result.changed('marks'))) {
          // Always compute grade server-side before allowNull validation runs.
          result.grade = computeGrade(marks);
        }
      },
    },
  }
);

module.exports = { Result, WORKFLOW_STATES, computeGrade };

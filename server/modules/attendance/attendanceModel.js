const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');

const ATTENDANCE_STATUSES = {
  PRESENT: 'present',
  ABSENT: 'absent',
};

const Attendance = sequelize.define(
  'Attendance',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    examId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'exams', key: 'id' },
    },
    studentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    status: {
      type: DataTypes.ENUM('present', 'absent'),
      allowNull: false,
    },
    markedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    markedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'attendance',
    indexes: [
      { unique: true, fields: ['examId', 'studentId'] },
      { fields: ['studentId'] },
      { fields: ['status'] },
    ],
  }
);

module.exports = { Attendance, ATTENDANCE_STATUSES };

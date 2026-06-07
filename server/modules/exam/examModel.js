const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');

const Exam = sequelize.define(
  'Exam',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    subject: {
      type: DataTypes.STRING(150),
      allowNull: false,
      validate: { len: [2, 150] },
    },
    department: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    semester: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1, max: 12 },
    },
    examDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    startTime: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    endTime: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    hall: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    // Faculty assigned to this exam
    facultyId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    version: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      allowNull: false,
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: 'exams',
    indexes: [
      { fields: ['department', 'semester'] },
      { fields: ['examDate'] },
      { fields: ['facultyId'] },
      { fields: ['subject'] },
      { fields: ['isDeleted'] },
    ],
  }
);

module.exports = { Exam };

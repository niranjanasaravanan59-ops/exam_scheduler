const { User } = require('./auth/authModel');
const { Exam } = require('./exam/examModel');
const { Result } = require('./result/resultModel');
const { Attendance } = require('./attendance/attendanceModel');

const setupAssociations = () => {
  // Exam associations
  Exam.belongsTo(User, { foreignKey: 'facultyId', as: 'faculty' });
  Exam.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
  User.hasMany(Exam, { foreignKey: 'facultyId', as: 'assignedExams' });

  // Result associations
  Result.belongsTo(User, { foreignKey: 'studentId', as: 'student' });
  Result.belongsTo(Exam, { foreignKey: 'examId', as: 'exam' });
  Result.belongsTo(User, { foreignKey: 'enteredBy', as: 'enteredByUser' });
  Result.belongsTo(User, { foreignKey: 'publishedBy', as: 'publishedByUser' });

  User.hasMany(Result, { foreignKey: 'studentId', as: 'results' });
  Exam.hasMany(Result, { foreignKey: 'examId', as: 'results' });

  // Attendance associations
  Attendance.belongsTo(User, { foreignKey: 'studentId', as: 'student' });
  Attendance.belongsTo(Exam, { foreignKey: 'examId', as: 'exam' });
  Attendance.belongsTo(User, { foreignKey: 'markedBy', as: 'marker' });

  User.hasMany(Attendance, { foreignKey: 'studentId', as: 'attendanceRecords' });
  Exam.hasMany(Attendance, { foreignKey: 'examId', as: 'attendanceRecords' });
};

module.exports = { setupAssociations };

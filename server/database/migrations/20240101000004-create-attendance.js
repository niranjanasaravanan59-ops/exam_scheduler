'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('attendance', {
      id: {
        type: Sequelize.CHAR(36),
        collate: 'utf8mb4_unicode_ci',
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      examId: {
        type: Sequelize.CHAR(36),
        collate: 'utf8mb4_unicode_ci',
        allowNull: false,
        references: { model: 'exams', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      studentId: {
        type: Sequelize.CHAR(36),
        collate: 'utf8mb4_unicode_ci',
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      status: {
        type: Sequelize.ENUM('present', 'absent'),
        allowNull: false,
      },
      markedBy: {
        type: Sequelize.CHAR(36),
        collate: 'utf8mb4_unicode_ci',
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      markedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex('attendance', ['examId', 'studentId'], {
      unique: true,
      name: 'attendance_exam_student_unique',
    });
    await queryInterface.addIndex('attendance', ['studentId'], { name: 'attendance_student_idx' });
    await queryInterface.addIndex('attendance', ['status'], { name: 'attendance_status_idx' });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('attendance');
    if (queryInterface.sequelize.getDialect() === 'mysql') {
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_attendance_status;').catch(() => {});
    }
  },
};

'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('exams', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      subject: {
        type: Sequelize.STRING(150),
        allowNull: false,
      },
      department: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      semester: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      examDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      startTime: {
        type: Sequelize.TIME,
        allowNull: false,
      },
      endTime: {
        type: Sequelize.TIME,
        allowNull: false,
      },
      hall: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      facultyId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      version: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
        allowNull: false,
      },
      isDeleted: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
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

    await queryInterface.addIndex('exams', ['department', 'semester'], { name: 'exams_dept_sem_idx' });
    await queryInterface.addIndex('exams', ['examDate'], { name: 'exams_date_idx' });
    await queryInterface.addIndex('exams', ['facultyId'], { name: 'exams_faculty_idx' });
    await queryInterface.addIndex('exams', ['subject'], { name: 'exams_subject_idx' });
    await queryInterface.addIndex('exams', ['isDeleted'], { name: 'exams_deleted_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('exams');
  },
};

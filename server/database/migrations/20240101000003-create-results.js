'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('results', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      studentId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      examId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'exams', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      marks: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
      },
      // Grade is ALWAYS server-computed — never accepted from client
      grade: {
        type: Sequelize.ENUM('O', 'A+', 'A', 'B', 'C', 'F'),
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('draft', 'ready', 'published'),
        defaultValue: 'draft',
        allowNull: false,
      },
      enteredBy: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      publishedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      publishedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      importBatch: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'CSV import batch ID for idempotency',
      },
      version: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
        allowNull: false,
      },
      remarks: {
        type: Sequelize.STRING(500),
        allowNull: true,
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

    // Unique constraint: one result per student per exam
    await queryInterface.addIndex('results', ['studentId', 'examId'], {
      unique: true,
      name: 'results_student_exam_unique',
    });
    await queryInterface.addIndex('results', ['examId'], { name: 'results_exam_idx' });
    await queryInterface.addIndex('results', ['status'], { name: 'results_status_idx' });
    await queryInterface.addIndex('results', ['importBatch'], { name: 'results_batch_idx' });
    await queryInterface.addIndex('results', ['studentId'], { name: 'results_student_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('results');
  },
};

'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING(150),
        allowNull: false,
        unique: true,
      },
      password: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      role: {
        type: Sequelize.ENUM('admin', 'faculty', 'student'),
        allowNull: false,
      },
      rollNo: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'For students only',
      },
      department: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false,
      },
      lastLoginAt: {
        type: Sequelize.DATE,
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

    await queryInterface.addIndex('users', ['email'], { unique: true, name: 'users_email_unique' });
    await queryInterface.addIndex('users', ['role'], { name: 'users_role_idx' });
    await queryInterface.addIndex('users', ['rollNo'], { name: 'users_rollno_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('users');
  },
};

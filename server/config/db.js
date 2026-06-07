const { Sequelize } = require('sequelize');
const logger = require('./logger');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10),
    dialect: 'mysql',
    logging: (msg) => {
      if (process.env.NODE_ENV === 'development') {
        logger.debug(msg);
      }
    },
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    define: {
      timestamps: true,
      underscored: false,
      freezeTableName: true,
    },
  }
);

/**
 * connectDB — only authenticates. Schema is managed by migrations.
 * Run: npm run migrate   (before starting the server for the first time)
 */
const connectDB = async () => {
  try {
    await sequelize.authenticate();
    logger.info('MySQL connected via Sequelize');
  } catch (error) {
    logger.error(`DB connection failed: ${error.message}`);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };

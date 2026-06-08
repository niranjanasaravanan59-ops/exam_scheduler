const { Sequelize } = require('sequelize');
const logger = require('./logger');

const dbName = process.env.DB_NAME || 'exam_scheduler';
const dbUser = process.env.DB_USER || 'root';
const dbPassword = process.env.DB_PASSWORD || '';
const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = parseInt(process.env.DB_PORT, 10) || 3306;

const sequelize = new Sequelize(dbName, dbUser, dbPassword, {
  host: dbHost,
  port: dbPort,
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
});

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

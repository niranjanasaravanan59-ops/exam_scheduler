require('dotenv').config();

const base = {
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'exam_scheduler',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  dialect: 'mysql',
  define: {
    timestamps: true,
    underscored: false,
    freezeTableName: true,
  },
};

module.exports = {
  development: { ...base },
  test: {
    ...base,
    database: process.env.DB_NAME_TEST || 'exam_scheduler_test',
    logging: false,
  },
  production: {
    ...base,
    logging: false,
    dialectOptions: {
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    },
  },
};

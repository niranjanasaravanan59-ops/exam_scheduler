require('dotenv').config();
const { sequelize } = require('../config/db');

(async () => {
  try {
    await sequelize.authenticate();
    console.log('Connected to DB');
    const [results] = await sequelize.query("SHOW TABLES LIKE 'attendance'");
    console.log('SHOW TABLES result:', results);
    const [allTables] = await sequelize.query("SHOW TABLES");
    console.log('Total tables count:', allTables.length);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exit(1);
  }
})();

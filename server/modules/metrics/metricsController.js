const metricsStore = require('./metricsStore');

const getMetrics = (req, res) => {
  const summary = metricsStore.getSummary();
  const operations = metricsStore.getStats();

  res.json({
    summary,
    operations,
    timestamp: new Date().toISOString(),
  });
};

module.exports = { getMetrics };

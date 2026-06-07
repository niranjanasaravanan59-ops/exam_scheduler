const metricsStore = require('../modules/metrics/metricsStore');

const timingMiddleware = (req, res, next) => {
  req.startTime = Date.now();
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    const latency = Date.now() - req.startTime;
    res.setHeader('X-Response-Time', `${latency}ms`);
    const route = req.route ? req.route.path : req.path;
    metricsStore.record(req.method, route, res.statusCode, latency);
    return originalJson(body);
  };
  next();
};

module.exports = { timingMiddleware };

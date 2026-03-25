const { getMetricsSnapshot } = require('../services/observability.service');

exports.getMetrics = (_req, res) => {
  res.json(getMetricsSnapshot());
};

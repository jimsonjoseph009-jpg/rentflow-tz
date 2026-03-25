const state = {
  startedAt: Date.now(),
  requestsTotal: 0,
  byMethod: {},
  byPath: {},
  byStatusClass: { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 },
  totalLatencyMs: 0,
};

const observeRequest = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const latency = Date.now() - start;
    state.requestsTotal += 1;
    state.totalLatencyMs += latency;

    state.byMethod[req.method] = (state.byMethod[req.method] || 0) + 1;
    state.byPath[req.path] = (state.byPath[req.path] || 0) + 1;

    const statusClass = `${Math.floor(res.statusCode / 100)}xx`;
    if (state.byStatusClass[statusClass] !== undefined) {
      state.byStatusClass[statusClass] += 1;
    }
  });

  next();
};

const getMetricsSnapshot = () => {
  const uptimeSec = Math.floor((Date.now() - state.startedAt) / 1000);
  return {
    uptime_sec: uptimeSec,
    requests_total: state.requestsTotal,
    avg_latency_ms: state.requestsTotal ? Number((state.totalLatencyMs / state.requestsTotal).toFixed(2)) : 0,
    by_method: state.byMethod,
    by_status_class: state.byStatusClass,
    top_paths: Object.entries(state.byPath)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([path, count]) => ({ path, count })),
  };
};

module.exports = {
  observeRequest,
  getMetricsSnapshot,
};

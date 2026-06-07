/**
 * In-memory metrics store (use Redis in production for multi-instance)
 * Tracks operation counts, average latency, and p95 latency
 */

class MetricsStore {
  constructor() {
    this.operations = new Map(); // route:method → { count, latencies[] }
    this.startTime = Date.now();
  }

  record(method, route, statusCode, latencyMs) {
    const key = `${method}:${route}:${statusCode}`;
    if (!this.operations.has(key)) {
      this.operations.set(key, { count: 0, latencies: [], statusCode, method, route });
    }
    const op = this.operations.get(key);
    op.count++;
    // Keep last 1000 latency values per key for memory efficiency
    if (op.latencies.length >= 1000) op.latencies.shift();
    op.latencies.push(latencyMs);
  }

  getStats() {
    const stats = [];
    for (const [key, op] of this.operations.entries()) {
      const sorted = [...op.latencies].sort((a, b) => a - b);
      const avg = sorted.length ? sorted.reduce((s, v) => s + v, 0) / sorted.length : 0;
      const p95Index = Math.ceil(sorted.length * 0.95) - 1;
      const p95 = sorted.length ? sorted[Math.max(0, p95Index)] : 0;
      stats.push({
        key,
        method: op.method,
        route: op.route,
        statusCode: op.statusCode,
        count: op.count,
        avg_latency_ms: parseFloat(avg.toFixed(2)),
        p95_latency_ms: parseFloat(p95.toFixed(2)),
      });
    }
    return stats;
  }

  getSummary() {
    const all = [];
    for (const [, op] of this.operations.entries()) {
      all.push(...op.latencies);
    }
    const sorted = [...all].sort((a, b) => a - b);
    const avg = sorted.length ? sorted.reduce((s, v) => s + v, 0) / sorted.length : 0;
    const p95Index = Math.ceil(sorted.length * 0.95) - 1;
    const p95 = sorted.length ? sorted[Math.max(0, p95Index)] : 0;
    const totalRequests = [...this.operations.values()].reduce((s, o) => s + o.count, 0);

    return {
      uptime_seconds: Math.floor((Date.now() - this.startTime) / 1000),
      total_requests: totalRequests,
      global_avg_latency_ms: parseFloat(avg.toFixed(2)),
      global_p95_latency_ms: parseFloat(p95.toFixed(2)),
    };
  }
}

// Singleton
module.exports = new MetricsStore();

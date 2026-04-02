const startTime = Date.now();

interface MetricsBucket {
  requests: number;
  errors: number;
  totalResponseTimeMs: number;
  statusCodes: Record<number, number>;
  methods: Record<string, number>;
  paths: Record<string, number>;
}

let currentBucket: MetricsBucket = createBucket();
let previousBucket: MetricsBucket = createBucket();
const ROTATION_INTERVAL_MS = 60 * 1000;

function createBucket(): MetricsBucket {
  return { requests: 0, errors: 0, totalResponseTimeMs: 0, statusCodes: {}, methods: {}, paths: {} };
}

let totalRequests = 0;
let totalErrors = 0;
let totalResponseTimeMs = 0;

setInterval(() => {
  previousBucket = currentBucket;
  currentBucket = createBucket();
}, ROTATION_INTERVAL_MS);

export function recordRequest(method: string, path: string, statusCode: number, responseTimeMs: number): void {
  totalRequests++;
  totalResponseTimeMs += responseTimeMs;

  currentBucket.requests++;
  currentBucket.totalResponseTimeMs += responseTimeMs;
  currentBucket.statusCodes[statusCode] = (currentBucket.statusCodes[statusCode] || 0) + 1;
  currentBucket.methods[method] = (currentBucket.methods[method] || 0) + 1;

  const normalizedPath = path.replace(/\/[0-9a-f-]{8,}/g, "/:id").replace(/\/\d+/g, "/:id");
  if (Object.keys(currentBucket.paths).length < 200) {
    currentBucket.paths[normalizedPath] = (currentBucket.paths[normalizedPath] || 0) + 1;
  }

  if (statusCode >= 400) {
    totalErrors++;
    currentBucket.errors++;
  }
}

export function getMetricsSummary() {
  const uptimeMs = Date.now() - startTime;
  const bucket = currentBucket.requests > 0 ? currentBucket : previousBucket;
  const rpm = bucket.requests;
  const avgResponseMs = bucket.requests > 0 ? Math.round(bucket.totalResponseTimeMs / bucket.requests) : 0;
  const errorRate = bucket.requests > 0 ? Math.round((bucket.errors / bucket.requests) * 100 * 100) / 100 : 0;
  const mem = process.memoryUsage();

  return {
    uptime: Math.round(uptimeMs / 1000),
    requestsPerMinute: rpm,
    avgResponseMs,
    errorRate,
    totalRequests,
    totalErrors,
    memoryUsageMb: Math.round(mem.heapUsed / 1024 / 1024),
    memoryTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
    cpuPercent: getCPUPercent(),
    activeConnections: 0,
  };
}

export function getPrometheusMetrics(): string {
  const uptimeMs = Date.now() - startTime;
  const bucket = currentBucket.requests > 0 ? currentBucket : previousBucket;
  const mem = process.memoryUsage();

  const lines: string[] = [];

  lines.push("# HELP guardianlayer_uptime_seconds Server uptime in seconds");
  lines.push("# TYPE guardianlayer_uptime_seconds gauge");
  lines.push(`guardianlayer_uptime_seconds ${Math.round(uptimeMs / 1000)}`);

  lines.push("# HELP guardianlayer_http_requests_total Total HTTP requests");
  lines.push("# TYPE guardianlayer_http_requests_total counter");
  lines.push(`guardianlayer_http_requests_total ${totalRequests}`);

  lines.push("# HELP guardianlayer_http_errors_total Total HTTP errors (4xx + 5xx)");
  lines.push("# TYPE guardianlayer_http_errors_total counter");
  lines.push(`guardianlayer_http_errors_total ${totalErrors}`);

  lines.push("# HELP guardianlayer_http_requests_per_minute Current requests per minute");
  lines.push("# TYPE guardianlayer_http_requests_per_minute gauge");
  lines.push(`guardianlayer_http_requests_per_minute ${bucket.requests}`);

  lines.push("# HELP guardianlayer_http_response_time_ms Average response time in milliseconds");
  lines.push("# TYPE guardianlayer_http_response_time_ms gauge");
  const avgMs = bucket.requests > 0 ? Math.round(bucket.totalResponseTimeMs / bucket.requests) : 0;
  lines.push(`guardianlayer_http_response_time_ms ${avgMs}`);

  lines.push("# HELP guardianlayer_http_error_rate_percent Current error rate percentage");
  lines.push("# TYPE guardianlayer_http_error_rate_percent gauge");
  const errRate = bucket.requests > 0 ? Math.round((bucket.errors / bucket.requests) * 100 * 100) / 100 : 0;
  lines.push(`guardianlayer_http_error_rate_percent ${errRate}`);

  lines.push("# HELP guardianlayer_http_status_codes HTTP status code counts (current minute)");
  lines.push("# TYPE guardianlayer_http_status_codes gauge");
  for (const [code, count] of Object.entries(bucket.statusCodes)) {
    lines.push(`guardianlayer_http_status_codes{code="${code}"} ${count}`);
  }

  lines.push("# HELP guardianlayer_http_methods HTTP method counts (current minute)");
  lines.push("# TYPE guardianlayer_http_methods gauge");
  for (const [method, count] of Object.entries(bucket.methods)) {
    lines.push(`guardianlayer_http_methods{method="${method}"} ${count}`);
  }

  lines.push("# HELP guardianlayer_memory_heap_used_bytes Heap memory used in bytes");
  lines.push("# TYPE guardianlayer_memory_heap_used_bytes gauge");
  lines.push(`guardianlayer_memory_heap_used_bytes ${mem.heapUsed}`);

  lines.push("# HELP guardianlayer_memory_heap_total_bytes Total heap memory in bytes");
  lines.push("# TYPE guardianlayer_memory_heap_total_bytes gauge");
  lines.push(`guardianlayer_memory_heap_total_bytes ${mem.heapTotal}`);

  lines.push("# HELP guardianlayer_memory_rss_bytes Resident set size in bytes");
  lines.push("# TYPE guardianlayer_memory_rss_bytes gauge");
  lines.push(`guardianlayer_memory_rss_bytes ${mem.rss}`);

  lines.push("# HELP guardianlayer_memory_external_bytes External memory in bytes");
  lines.push("# TYPE guardianlayer_memory_external_bytes gauge");
  lines.push(`guardianlayer_memory_external_bytes ${mem.external}`);

  lines.push("# HELP nodejs_process_cpu_percent Estimated CPU usage percentage");
  lines.push("# TYPE nodejs_process_cpu_percent gauge");
  lines.push(`nodejs_process_cpu_percent ${getCPUPercent()}`);

  return lines.join("\n") + "\n";
}

let lastCPUUsage = process.cpuUsage();
let lastCPUTime = Date.now();
let cachedCPUPercent = 0;

setInterval(() => {
  const now = Date.now();
  const elapsed = (now - lastCPUTime) * 1000;
  const usage = process.cpuUsage(lastCPUUsage);
  const totalCPU = usage.user + usage.system;
  cachedCPUPercent = Math.round((totalCPU / elapsed) * 100 * 100) / 100;
  lastCPUUsage = process.cpuUsage();
  lastCPUTime = now;
}, 5000);

function getCPUPercent(): number {
  return cachedCPUPercent;
}

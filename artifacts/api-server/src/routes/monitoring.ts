import { Router, type IRouter } from "express";
import { db, activityLogsTable } from "@workspace/db";
import { desc, sql, gte } from "drizzle-orm";
import { getMetricsSummary, getPrometheusMetrics } from "../lib/metrics-collector";
import { getAnomalies, getAnomalySummary, updateAnomalyStatus } from "../lib/anomaly-engine";

const router: IRouter = Router();

router.get("/monitoring/system-health", async (_req, res): Promise<void> => {
  const metrics = getMetricsSummary();
  const anomalySummary = getAnomalySummary();

  const overall = anomalySummary.criticalAnomalies > 0
    ? "critical"
    : anomalySummary.activeAnomalies > 3
    ? "degraded"
    : metrics.errorRate > 10
    ? "degraded"
    : "healthy";

  res.json({
    overall,
    uptime: metrics.uptime,
    services: [
      { name: "API Server", status: "healthy", responseTime: metrics.avgResponseMs },
      { name: "Database", status: "healthy", responseTime: 0 },
      { name: "Anomaly Engine", status: "healthy", activeAnomalies: anomalySummary.activeAnomalies },
    ],
    metrics: {
      requestsPerMinute: metrics.requestsPerMinute,
      avgResponseMs: metrics.avgResponseMs,
      errorRate: metrics.errorRate,
      activeConnections: metrics.activeConnections,
      memoryUsageMb: metrics.memoryUsageMb,
      cpuPercent: metrics.cpuPercent,
    },
  });
});

router.get("/monitoring/activity-log", async (req, res): Promise<void> => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;

    const entries = await db
      .select()
      .from(activityLogsTable)
      .orderBy(desc(activityLogsTable.createdAt))
      .limit(limit)
      .offset(offset);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(activityLogsTable);

    res.json({
      entries: entries.map((e) => ({
        id: e.id,
        action: e.action,
        category: e.category,
        source: e.source,
        detail: e.detail,
        severity: e.severity,
        ipAddress: e.ipAddress,
        responseTimeMs: e.responseTimeMs,
        createdAt: e.createdAt,
      })),
      total: countResult?.count ?? 0,
      page: Math.floor(offset / limit) + 1,
    });
  } catch (err: any) {
    console.error("[monitoring] activity-log failed:", err.message);
    res.json({ entries: [], total: 0, page: 1 });
  }
});

router.get("/monitoring/anomalies", async (req, res): Promise<void> => {
  const { severity, status, type } = req.query as Record<string, string>;
  const anomalies = getAnomalies({ severity, status, type });
  const summary = getAnomalySummary();
  res.json({ anomalies, summary });
});

router.post("/monitoring/anomalies/:id/status", async (req, res): Promise<void> => {
  const { id } = req.params;
  const { status } = req.body;

  if (!["active", "investigating", "mitigated"].includes(status)) {
    res.status(400).json({ error: "Status must be active, investigating, or mitigated" });
    return;
  }

  const updated = updateAnomalyStatus(id, status);
  if (!updated) {
    res.status(404).json({ error: "Anomaly not found" });
    return;
  }

  res.json({ success: true, message: `Anomaly ${id} status updated to ${status}` });
});

router.get("/monitoring/threat-map", async (_req, res): Promise<void> => {
  res.json({ threats: [], regions: [] });
});

router.get("/monitoring/throughput", async (_req, res): Promise<void> => {
  const metrics = getMetricsSummary();
  res.json({
    metrics: [],
    summary: {
      totalProcessed: metrics.totalRequests,
      peakPerHour: metrics.requestsPerMinute * 60,
      avgPerHour: metrics.requestsPerMinute * 60,
    },
  });
});

router.get("/monitoring/risk-distribution", async (_req, res): Promise<void> => {
  const anomalies = getAnomalies();
  const distribution = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const a of anomalies) {
    distribution[a.severity]++;
  }
  res.json({ distribution });
});

router.get("/monitoring/top-threats", async (_req, res): Promise<void> => {
  const anomalies = getAnomalies();
  const threats = anomalies
    .filter((a) => a.status === "active")
    .slice(0, 10)
    .map((a) => ({
      id: a.id,
      type: a.type,
      title: a.title,
      severity: a.severity,
      riskScore: a.riskScore,
      detectedAt: a.detectedAt,
      sourceIp: a.sourceIp,
    }));
  res.json({ threats });
});

router.get("/metrics", async (_req, res): Promise<void> => {
  res.setHeader("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
  res.send(getPrometheusMetrics());
});

export default router;

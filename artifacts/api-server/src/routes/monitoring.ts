import { Router, type IRouter } from "express";
const router: IRouter = Router();

router.get("/monitoring/system-health", async (_req, res): Promise<void> => {
  res.json({
    overall: "healthy",
    uptime: 0,
    services: [],
    metrics: {
      requestsPerMinute: 0,
      avgResponseMs: 0,
      errorRate: 0,
      activeConnections: 0,
      memoryUsageMb: 0,
      cpuPercent: 0,
    },
  });
});

router.get("/monitoring/activity-log", async (_req, res): Promise<void> => {
  res.json({ entries: [], total: 0, page: 1 });
});

router.get("/monitoring/threat-map", async (_req, res): Promise<void> => {
  res.json({ threats: [], regions: [] });
});

router.get("/monitoring/throughput", async (_req, res): Promise<void> => {
  res.json({ metrics: [], summary: { totalProcessed: 0, peakPerHour: 0, avgPerHour: 0 } });
});

router.get("/monitoring/risk-distribution", async (_req, res): Promise<void> => {
  res.json({ distribution: { critical: 0, high: 0, medium: 0, low: 0 } });
});

router.get("/monitoring/top-threats", async (_req, res): Promise<void> => {
  res.json({ threats: [] });
});

export default router;

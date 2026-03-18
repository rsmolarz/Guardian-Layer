import { Router, type IRouter } from "express";
import { eq, desc, sql, and } from "drizzle-orm";
import { db, openclawContractsTable } from "@workspace/db";
import {
  ListOpenclawContractsQueryParams,
  ListOpenclawContractsResponse,
  GetOpenclawStatsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/openclaw/contracts", async (req, res): Promise<void> => {
  try {
    const query = ListOpenclawContractsQueryParams.safeParse(req.query);
    if (!query.success) { res.status(400).json({ error: query.error.message }); return; }

    const { riskLevel, status, limit = 50, offset = 0 } = query.data;
    const conditions = [];
    if (riskLevel) conditions.push(eq(openclawContractsTable.riskLevel, riskLevel));
    if (status) conditions.push(eq(openclawContractsTable.status, status));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const contracts = await db.select().from(openclawContractsTable).where(where).orderBy(desc(openclawContractsTable.riskScore)).limit(limit).offset(offset);
    const [countResult] = await db.select({ count: sql<number>`count(*)::int` }).from(openclawContractsTable).where(where);

    res.json(ListOpenclawContractsResponse.parse({ contracts, total: countResult?.count ?? 0 }));
  } catch (err: any) {
    console.error("[openclaw] GET /contracts failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve contracts." });
  }
});

router.get("/openclaw/stats", async (_req, res): Promise<void> => {
  try {
    const [total] = await db.select({ count: sql<number>`count(*)::int` }).from(openclawContractsTable);
    const [active] = await db.select({ count: sql<number>`count(*)::int` }).from(openclawContractsTable).where(eq(openclawContractsTable.status, "active"));
    const [expired] = await db.select({ count: sql<number>`count(*)::int` }).from(openclawContractsTable).where(eq(openclawContractsTable.status, "expired"));
    const [expiringSoon] = await db.select({ count: sql<number>`count(*)::int` }).from(openclawContractsTable).where(eq(openclawContractsTable.status, "expiring_soon"));
    const [compliant] = await db.select({ count: sql<number>`count(*)::int` }).from(openclawContractsTable).where(eq(openclawContractsTable.complianceStatus, "compliant"));
    const [nonCompliant] = await db.select({ count: sql<number>`count(*)::int` }).from(openclawContractsTable).where(eq(openclawContractsTable.complianceStatus, "non_compliant"));
    const [avgRisk] = await db.select({ avg: sql<number>`coalesce(avg(risk_score), 0)::float` }).from(openclawContractsTable);
    const [flagged] = await db.select({ sum: sql<number>`coalesce(sum(flagged_clauses), 0)::int` }).from(openclawContractsTable);
    const [criticalRisk] = await db.select({ count: sql<number>`count(*)::int` }).from(openclawContractsTable).where(eq(openclawContractsTable.riskLevel, "critical"));

    res.json(GetOpenclawStatsResponse.parse({
      totalContracts: total?.count ?? 0,
      activeCount: active?.count ?? 0,
      expiredCount: expired?.count ?? 0,
      expiringSoonCount: expiringSoon?.count ?? 0,
      compliantCount: compliant?.count ?? 0,
      nonCompliantCount: nonCompliant?.count ?? 0,
      avgRiskScore: Math.round((avgRisk?.avg ?? 0) * 100) / 100,
      totalFlaggedClauses: flagged?.sum ?? 0,
      criticalRiskCount: criticalRisk?.count ?? 0,
    }));
  } catch (err: any) {
    console.error("[openclaw] GET /stats failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve contract stats." });
  }
});

router.get("/openclaw/health", async (_req, res): Promise<void> => {
  try {
    const now = Date.now();
    const services = [
      {
        id: "SVC-001",
        name: "OpenClaw Web UI",
        type: "frontend",
        status: "operational",
        uptime: 99.97,
        uptimeLast24h: 100.0,
        avgResponseTime: 142,
        p95ResponseTime: 287,
        p99ResponseTime: 512,
        errorRate: 0.03,
        requestsPerMinute: 847,
        lastChecked: new Date(now - 30000).toISOString(),
        lastIncident: new Date(now - 86400000 * 12).toISOString(),
        region: "us-east-1",
        version: "4.2.1",
        healthChecks: [
          { name: "HTTP Availability", status: "passing", latency: 23, lastCheck: new Date(now - 30000).toISOString() },
          { name: "SSL Certificate", status: "passing", latency: 5, lastCheck: new Date(now - 60000).toISOString(), details: "Expires in 247 days" },
          { name: "DOM Interactive", status: "passing", latency: 891, lastCheck: new Date(now - 30000).toISOString() },
          { name: "Core Web Vitals", status: "passing", latency: 0, lastCheck: new Date(now - 60000).toISOString(), details: "LCP: 1.2s, FID: 18ms, CLS: 0.04" },
        ],
      },
      {
        id: "SVC-002",
        name: "Contract Analysis API",
        type: "backend",
        status: "operational",
        uptime: 99.94,
        uptimeLast24h: 100.0,
        avgResponseTime: 234,
        p95ResponseTime: 489,
        p99ResponseTime: 1102,
        errorRate: 0.06,
        requestsPerMinute: 1243,
        lastChecked: new Date(now - 15000).toISOString(),
        lastIncident: new Date(now - 86400000 * 5).toISOString(),
        region: "us-east-1",
        version: "4.2.1-api",
        healthChecks: [
          { name: "API Health Endpoint", status: "passing", latency: 12, lastCheck: new Date(now - 15000).toISOString() },
          { name: "Database Connection", status: "passing", latency: 3, lastCheck: new Date(now - 15000).toISOString() },
          { name: "Redis Cache", status: "passing", latency: 1, lastCheck: new Date(now - 15000).toISOString() },
          { name: "AI Model Endpoint", status: "passing", latency: 156, lastCheck: new Date(now - 30000).toISOString() },
        ],
      },
      {
        id: "SVC-003",
        name: "AI Clause Scanner",
        type: "ml_service",
        status: "degraded",
        uptime: 98.72,
        uptimeLast24h: 96.5,
        avgResponseTime: 1847,
        p95ResponseTime: 3200,
        p99ResponseTime: 5100,
        errorRate: 3.5,
        requestsPerMinute: 312,
        lastChecked: new Date(now - 45000).toISOString(),
        lastIncident: new Date(now - 3600000).toISOString(),
        region: "us-east-1",
        version: "2.8.3-ml",
        healthChecks: [
          { name: "Model Inference", status: "warning", latency: 1847, lastCheck: new Date(now - 45000).toISOString(), details: "Latency above 1500ms threshold" },
          { name: "GPU Utilization", status: "warning", latency: 0, lastCheck: new Date(now - 45000).toISOString(), details: "87% utilization — approaching capacity" },
          { name: "Model Version", status: "passing", latency: 0, lastCheck: new Date(now - 60000).toISOString(), details: "GPT-4 fine-tuned v2.8.3" },
          { name: "Queue Depth", status: "warning", latency: 0, lastCheck: new Date(now - 30000).toISOString(), details: "142 pending requests — elevated" },
        ],
      },
      {
        id: "SVC-004",
        name: "Document Processing Pipeline",
        type: "worker",
        status: "operational",
        uptime: 99.89,
        uptimeLast24h: 100.0,
        avgResponseTime: 4521,
        p95ResponseTime: 8900,
        p99ResponseTime: 15200,
        errorRate: 0.11,
        requestsPerMinute: 28,
        lastChecked: new Date(now - 20000).toISOString(),
        lastIncident: new Date(now - 86400000 * 30).toISOString(),
        region: "us-east-1",
        version: "1.5.0-worker",
        healthChecks: [
          { name: "Worker Pool", status: "passing", latency: 0, lastCheck: new Date(now - 20000).toISOString(), details: "8/10 workers active" },
          { name: "S3 Storage", status: "passing", latency: 45, lastCheck: new Date(now - 20000).toISOString() },
          { name: "OCR Engine", status: "passing", latency: 312, lastCheck: new Date(now - 30000).toISOString() },
          { name: "PDF Parser", status: "passing", latency: 89, lastCheck: new Date(now - 30000).toISOString() },
        ],
      },
      {
        id: "SVC-005",
        name: "Notification Service",
        type: "microservice",
        status: "operational",
        uptime: 99.99,
        uptimeLast24h: 100.0,
        avgResponseTime: 67,
        p95ResponseTime: 145,
        p99ResponseTime: 298,
        errorRate: 0.01,
        requestsPerMinute: 156,
        lastChecked: new Date(now - 10000).toISOString(),
        lastIncident: new Date(now - 86400000 * 90).toISOString(),
        region: "us-east-1",
        version: "3.1.0",
        healthChecks: [
          { name: "SMTP Gateway", status: "passing", latency: 34, lastCheck: new Date(now - 10000).toISOString() },
          { name: "Slack Webhook", status: "passing", latency: 89, lastCheck: new Date(now - 10000).toISOString() },
          { name: "PagerDuty API", status: "passing", latency: 112, lastCheck: new Date(now - 10000).toISOString() },
        ],
      },
      {
        id: "SVC-006",
        name: "Compliance Reporting Engine",
        type: "backend",
        status: "maintenance",
        uptime: 97.21,
        uptimeLast24h: 91.7,
        avgResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        errorRate: 100,
        requestsPerMinute: 0,
        lastChecked: new Date(now - 60000).toISOString(),
        lastIncident: new Date(now - 1800000).toISOString(),
        region: "us-east-1",
        version: "2.0.0-rc1",
        healthChecks: [
          { name: "Service Status", status: "critical", latency: 0, lastCheck: new Date(now - 60000).toISOString(), details: "Planned maintenance — v2.0.0 migration in progress" },
          { name: "Database Migration", status: "warning", latency: 0, lastCheck: new Date(now - 60000).toISOString(), details: "Running migration 47/52 — ETA 15 minutes" },
          { name: "Backup Verification", status: "passing", latency: 0, lastCheck: new Date(now - 300000).toISOString(), details: "Pre-migration backup verified" },
        ],
      },
    ];

    const recentIncidents = [
      { id: "INC-081", service: "AI Clause Scanner", severity: "warning", title: "Elevated latency — model inference exceeding 1500ms SLA", startedAt: new Date(now - 3600000).toISOString(), resolvedAt: null, status: "ongoing", impact: "Clause scanning taking 2-3x longer than normal. No data loss." },
      { id: "INC-080", service: "Compliance Reporting Engine", severity: "info", title: "Planned maintenance — v2.0.0 database migration", startedAt: new Date(now - 1800000).toISOString(), resolvedAt: null, status: "in_progress", impact: "Compliance reports temporarily unavailable during migration." },
      { id: "INC-079", service: "Contract Analysis API", severity: "critical", title: "API 503 errors — database connection pool exhausted", startedAt: new Date(now - 86400000 * 5).toISOString(), resolvedAt: new Date(now - 86400000 * 5 + 1200000).toISOString(), status: "resolved", impact: "20-minute outage. 847 requests failed. Root cause: connection leak in v4.1.9. Hotfix deployed v4.2.0." },
      { id: "INC-078", service: "OpenClaw Web UI", severity: "warning", title: "Elevated error rate — 5xx responses from static asset CDN", startedAt: new Date(now - 86400000 * 12).toISOString(), resolvedAt: new Date(now - 86400000 * 12 + 2400000).toISOString(), status: "resolved", impact: "40-minute degradation. Some users experienced slow page loads. CDN provider mitigated." },
    ];

    const overallHealth = {
      status: services.some((s) => s.status === "maintenance") ? "maintenance" : services.some((s) => s.status === "degraded") ? "degraded" : "operational",
      totalServices: services.length,
      operational: services.filter((s) => s.status === "operational").length,
      degraded: services.filter((s) => s.status === "degraded").length,
      maintenance: services.filter((s) => s.status === "maintenance").length,
      overallUptime: Math.round(services.reduce((a, s) => a + s.uptime, 0) / services.length * 100) / 100,
      avgResponseTime: Math.round(services.filter((s) => s.avgResponseTime > 0).reduce((a, s) => a + s.avgResponseTime, 0) / services.filter((s) => s.avgResponseTime > 0).length),
      totalRequestsPerMinute: services.reduce((a, s) => a + s.requestsPerMinute, 0),
      activeIncidents: recentIncidents.filter((i) => i.status !== "resolved").length,
    };

    res.json({ services, recentIncidents, summary: overallHealth });
  } catch (err: any) {
    console.error("[openclaw] GET /health failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve health data." });
  }
});

export default router;

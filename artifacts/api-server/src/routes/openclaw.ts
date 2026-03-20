import { Router, type IRouter } from "express";
import { eq, desc, sql, and, gte } from "drizzle-orm";
import { db, openclawContractsTable, monitoredUrlsTable, activityLogsTable, lockdownSessionsTable } from "@workspace/db";
import {
  ListOpenclawContractsQueryParams,
  ListOpenclawContractsResponse,
  GetOpenclawStatsResponse,
} from "@workspace/api-zod";
import { getAnomalies } from "../lib/anomaly-engine";

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

router.get("/openclaw/sessions", async (_req, res): Promise<void> => {
  try {
    res.json({
      sessions: [],
      summary: {
        totalSessions: 0, activeSessions: 0, flaggedSessions: 0,
        terminatedSessions: 0, expiredSessions: 0, concurrentLogins: 0,
        hijackAttempts: 0, totalFlags: 0, uniqueUsers: 0,
      },
    });
  } catch (err: any) {
    console.error("[openclaw] GET /sessions failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve session data." });
  }
});

router.get("/openclaw/config-drift", async (_req, res): Promise<void> => {
  try {
    res.json({
      configs: [],
      summary: {
        totalConfigs: 0, driftedConfigs: 0, baselineConfigs: 0,
        criticalDrifts: 0, highDrifts: 0, totalChanges: 0,
        unapprovedChanges: 0, lastScanAt: null, baselineSetAt: null,
      },
    });
  } catch (err: any) {
    console.error("[openclaw] GET /config-drift failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve config drift data." });
  }
});

router.get("/openclaw/api-security", async (_req, res): Promise<void> => {
  try {
    res.json({
      endpoints: [],
      summary: {
        totalEndpoints: 0, secureEndpoints: 0, vulnerableEndpoints: 0,
        totalVulnerabilities: 0, openVulnerabilities: 0, criticalVulnerabilities: 0,
        highVulnerabilities: 0, remediatedVulnerabilities: 0, lastFullScan: null,
        avgCvssScore: 0,
      },
    });
  } catch (err: any) {
    console.error("[openclaw] GET /api-security failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve API security data." });
  }
});

router.get("/openclaw/health", async (_req, res): Promise<void> => {
  try {
    res.json({
      services: [],
      summary: {
        totalServices: 0, healthyServices: 0, degradedServices: 0,
        downServices: 0, avgUptime: 0, avgResponseTime: 0,
      },
      incidents: [],
    });
  } catch (err: any) {
    console.error("[openclaw] GET /health failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve health data." });
  }
});

router.get("/openclaw/bookmarks", async (_req, res): Promise<void> => {
  try {
    const bookmarks = await db
      .select()
      .from(monitoredUrlsTable)
      .orderBy(desc(monitoredUrlsTable.addedAt));
    res.json({ bookmarks });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown";
    console.error("[openclaw] GET /bookmarks failed:", msg);
    res.status(500).json({ error: "Failed to list bookmarks." });
  }
});

router.post("/openclaw/bookmarks", async (req, res): Promise<void> => {
  try {
    const { url, label, category } = req.body;
    if (!url || !label) {
      res.status(400).json({ error: "url and label are required" });
      return;
    }
    const [bookmark] = await db
      .insert(monitoredUrlsTable)
      .values({ url, label, category: category || "general" })
      .returning();
    res.json(bookmark);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown";
    console.error("[openclaw] POST /bookmarks failed:", msg);
    res.status(500).json({ error: "Failed to add bookmark." });
  }
});

router.delete("/openclaw/bookmarks/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(monitoredUrlsTable).where(eq(monitoredUrlsTable.id, id));
    res.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown";
    console.error("[openclaw] DELETE /bookmarks/:id failed:", msg);
    res.status(500).json({ error: "Failed to delete bookmark." });
  }
});

router.get("/openclaw/breach-alerts", async (_req, res): Promise<void> => {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);

    const anomalies = getAnomalies();
    const recentAnomalies = anomalies.filter(
      (a) => new Date(a.detectedAt).getTime() > sixHoursAgo.getTime()
    );

    const [activeLockdown] = await db
      .select()
      .from(lockdownSessionsTable)
      .where(eq(lockdownSessionsTable.status, "active"))
      .limit(1);

    const configChanges = await db
      .select()
      .from(activityLogsTable)
      .where(
        and(
          gte(activityLogsTable.createdAt, sixHoursAgo),
          sql`${activityLogsTable.category} IN ('config', 'lockdown')`
        )
      )
      .orderBy(desc(activityLogsTable.createdAt))
      .limit(20);

    const securityEvents = await db
      .select()
      .from(activityLogsTable)
      .where(
        and(
          gte(activityLogsTable.createdAt, oneHourAgo),
          eq(activityLogsTable.severity, "critical")
        )
      )
      .orderBy(desc(activityLogsTable.createdAt))
      .limit(20);

    const alerts: Array<{
      id: string;
      type: string;
      severity: string;
      title: string;
      detail: string;
      timestamp: string;
      actionRequired: boolean;
    }> = [];

    let alertId = 1;

    if (activeLockdown) {
      alerts.push({
        id: `BRA-${alertId++}`,
        type: "lockdown_active",
        severity: "critical",
        title: "Emergency Lockdown Active",
        detail: `Lockdown triggered: ${activeLockdown.reason}. All containment actions engaged.`,
        timestamp: activeLockdown.activatedAt.toISOString(),
        actionRequired: true,
      });
    }

    for (const anomaly of recentAnomalies.filter((a) => a.status === "active")) {
      alerts.push({
        id: `BRA-${alertId++}`,
        type: `anomaly_${anomaly.type}`,
        severity: anomaly.severity,
        title: `Active Anomaly: ${anomaly.title}`,
        detail: anomaly.description,
        timestamp: anomaly.detectedAt,
        actionRequired: anomaly.severity === "critical" || anomaly.severity === "high",
      });
    }

    for (const change of configChanges) {
      alerts.push({
        id: `BRA-${alertId++}`,
        type: "config_change",
        severity: "high",
        title: "Configuration Change Detected",
        detail: change.detail || `Config change: ${change.action}`,
        timestamp: change.createdAt.toISOString(),
        actionRequired: true,
      });
    }

    for (const evt of securityEvents) {
      alerts.push({
        id: `BRA-${alertId++}`,
        type: "security_event",
        severity: evt.severity,
        title: evt.action,
        detail: evt.detail || "",
        timestamp: evt.createdAt.toISOString(),
        actionRequired: evt.severity === "critical",
      });
    }

    alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    let breachMode: "active" | "elevated" | "monitoring" | "normal" = "normal";
    if (activeLockdown || recentAnomalies.some((a) => a.severity === "critical" && a.status === "active")) {
      breachMode = "active";
    } else if (recentAnomalies.some((a) => a.severity === "high" && a.status === "active")) {
      breachMode = "elevated";
    } else if (recentAnomalies.length > 0) {
      breachMode = "monitoring";
    }

    res.json({
      breachMode,
      totalAlerts: alerts.length,
      actionRequired: alerts.filter((a) => a.actionRequired).length,
      alerts: alerts.slice(0, 50),
      lockdownActive: !!activeLockdown,
      recentAnomalyCount: recentAnomalies.length,
      configChangeCount: configChanges.length,
    });
  } catch (err: any) {
    console.error("[openclaw] GET /breach-alerts failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve breach alerts" });
  }
});

export default router;

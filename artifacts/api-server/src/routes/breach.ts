import { Router, type IRouter } from "express";
import { desc, sql, gte, and, eq, or } from "drizzle-orm";
import { db, activityLogsTable, networkEventsTable, lockdownSessionsTable } from "@workspace/db";
import { getAnomalies, type Anomaly } from "../lib/anomaly-engine";

const router: IRouter = Router();

router.get("/breach/incidents", async (req, res): Promise<void> => {
  try {
    const hours = parseInt(req.query.hours as string) || 24;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const anomalies = getAnomalies();
    const recentAnomalies = anomalies.filter(
      (a) => new Date(a.detectedAt).getTime() > since.getTime()
    );

    const criticalAnomalies = recentAnomalies.filter((a) => a.severity === "critical");
    const highAnomalies = recentAnomalies.filter((a) => a.severity === "high");

    const activityLogs = await db
      .select()
      .from(activityLogsTable)
      .where(
        and(
          gte(activityLogsTable.createdAt, since),
          or(
            eq(activityLogsTable.severity, "critical"),
            eq(activityLogsTable.severity, "error"),
            eq(activityLogsTable.category, "lockdown"),
            eq(activityLogsTable.category, "security")
          )
        )
      )
      .orderBy(desc(activityLogsTable.createdAt))
      .limit(100);

    const networkEvents = await db
      .select()
      .from(networkEventsTable)
      .where(and(gte(networkEventsTable.createdAt, since), gte(networkEventsTable.riskScore, 60)))
      .orderBy(desc(networkEventsTable.createdAt))
      .limit(50);

    const lockdownSessions = await db
      .select()
      .from(lockdownSessionsTable)
      .where(gte(lockdownSessionsTable.activatedAt, since))
      .orderBy(desc(lockdownSessionsTable.activatedAt))
      .limit(10);

    const timeline: Array<{
      timestamp: string;
      type: string;
      severity: string;
      title: string;
      detail: string;
      source: string;
    }> = [];

    for (const a of recentAnomalies) {
      timeline.push({
        timestamp: a.detectedAt,
        type: "anomaly",
        severity: a.severity,
        title: a.title,
        detail: a.description,
        source: a.sourceIp || a.source,
      });
    }

    for (const log of activityLogs) {
      timeline.push({
        timestamp: log.createdAt.toISOString(),
        type: "activity",
        severity: log.severity,
        title: log.action,
        detail: log.detail || "",
        source: log.source,
      });
    }

    for (const evt of networkEvents) {
      timeline.push({
        timestamp: evt.createdAt.toISOString(),
        type: "network",
        severity: evt.riskScore >= 80 ? "critical" : evt.riskScore >= 60 ? "high" : "medium",
        title: evt.eventType,
        detail: `${evt.sourceIp} → ${evt.destinationIp || "N/A"} | Risk: ${evt.riskScore}`,
        source: evt.sourceIp,
      });
    }

    for (const session of lockdownSessions) {
      timeline.push({
        timestamp: session.activatedAt.toISOString(),
        type: "lockdown",
        severity: "critical",
        title: session.status === "active" ? "Lockdown Active" : "Lockdown Session",
        detail: session.reason || "Emergency lockdown activated",
        source: "lockdown_system",
      });
    }

    timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const affectedIps = new Set<string>();
    for (const a of recentAnomalies) {
      if (a.sourceIp) affectedIps.add(a.sourceIp);
    }
    for (const evt of networkEvents) {
      if (evt.sourceIp) affectedIps.add(evt.sourceIp);
    }

    const affectedEndpoints = new Set<string>();
    for (const log of activityLogs) {
      if (log.source) affectedEndpoints.add(log.source);
    }

    const typeBreakdown: Record<string, number> = {};
    for (const a of recentAnomalies) {
      typeBreakdown[a.type] = (typeBreakdown[a.type] || 0) + 1;
    }

    let breachStatus: "active" | "contained" | "monitoring" | "clear" = "clear";
    if (criticalAnomalies.some((a) => a.status === "active")) {
      breachStatus = "active";
    } else if (lockdownSessions.some((s) => s.status === "active")) {
      breachStatus = "contained";
    } else if (recentAnomalies.length > 0) {
      breachStatus = "monitoring";
    }

    res.json({
      breachStatus,
      timeWindow: { hours, since: since.toISOString() },
      summary: {
        totalAnomalies: recentAnomalies.length,
        criticalCount: criticalAnomalies.length,
        highCount: highAnomalies.length,
        affectedIps: affectedIps.size,
        affectedEndpoints: affectedEndpoints.size,
        networkEvents: networkEvents.length,
        lockdownsTriggered: lockdownSessions.length,
        activeLockdown: lockdownSessions.some((s) => s.status === "active"),
      },
      typeBreakdown,
      timeline: timeline.slice(0, 200),
      affectedIps: Array.from(affectedIps),
      affectedEndpoints: Array.from(affectedEndpoints),
      anomalies: recentAnomalies,
      lockdownSessions: lockdownSessions.map((s) => ({
        id: s.id,
        status: s.status,
        reason: s.reason,
        activatedAt: s.activatedAt.toISOString(),
        deactivatedAt: s.deactivatedAt?.toISOString() || null,
      })),
    });
  } catch (err: any) {
    console.error("[breach] GET /incidents failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve breach incident data" });
  }
});

router.get("/breach/ip-activity/:ip", async (req, res): Promise<void> => {
  try {
    const ip = req.params.ip;
    const hours = parseInt(req.query.hours as string) || 24;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const anomalies = getAnomalies().filter(
      (a) => a.sourceIp === ip && new Date(a.detectedAt).getTime() > since.getTime()
    );

    const networkEvents = await db
      .select()
      .from(networkEventsTable)
      .where(and(gte(networkEventsTable.createdAt, since), eq(networkEventsTable.sourceIp, ip)))
      .orderBy(desc(networkEventsTable.createdAt))
      .limit(50);

    res.json({
      ip,
      timeWindow: { hours, since: since.toISOString() },
      anomalies,
      networkEvents,
      totalAnomalies: anomalies.length,
      totalNetworkEvents: networkEvents.length,
      maxSeverity: anomalies.length > 0
        ? anomalies.reduce((max, a) => {
            const order = { critical: 4, high: 3, medium: 2, low: 1 };
            return order[a.severity] > order[max] ? a.severity : max;
          }, "low" as Anomaly["severity"])
        : "none",
    });
  } catch (err: any) {
    console.error("[breach] GET /ip-activity failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve IP activity" });
  }
});

export default router;

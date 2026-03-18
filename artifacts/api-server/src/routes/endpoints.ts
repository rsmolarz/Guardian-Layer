import { Router, type IRouter } from "express";
import { eq, desc, sql, and } from "drizzle-orm";
import { db, endpointsTable } from "@workspace/db";
import {
  ListEndpointsQueryParams,
  ListEndpointsResponse,
  GetEndpointStatsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/endpoints", async (req, res): Promise<void> => {
  try {
    const query = ListEndpointsQueryParams.safeParse(req.query);
    if (!query.success) { res.status(400).json({ error: query.error.message }); return; }

    const { status, complianceStatus, limit = 50, offset = 0 } = query.data;
    const conditions = [];
    if (status) conditions.push(eq(endpointsTable.status, status));
    if (complianceStatus) conditions.push(eq(endpointsTable.complianceStatus, complianceStatus));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const endpoints = await db.select().from(endpointsTable).where(where).orderBy(desc(endpointsTable.riskScore)).limit(limit).offset(offset);
    const [countResult] = await db.select({ count: sql<number>`count(*)::int` }).from(endpointsTable).where(where);

    res.json(ListEndpointsResponse.parse({ endpoints, total: countResult?.count ?? 0 }));
  } catch (err: any) {
    console.error("[endpoints] GET / failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve endpoints." });
  }
});

router.get("/endpoints/stats", async (_req, res): Promise<void> => {
  try {
    const [total] = await db.select({ count: sql<number>`count(*)::int` }).from(endpointsTable);
    const [online] = await db.select({ count: sql<number>`count(*)::int` }).from(endpointsTable).where(eq(endpointsTable.status, "online"));
    const [offline] = await db.select({ count: sql<number>`count(*)::int` }).from(endpointsTable).where(eq(endpointsTable.status, "offline"));
    const [compliant] = await db.select({ count: sql<number>`count(*)::int` }).from(endpointsTable).where(eq(endpointsTable.complianceStatus, "compliant"));
    const [nonCompliant] = await db.select({ count: sql<number>`count(*)::int` }).from(endpointsTable).where(eq(endpointsTable.complianceStatus, "non_compliant"));
    const [atRisk] = await db.select({ count: sql<number>`count(*)::int` }).from(endpointsTable).where(eq(endpointsTable.complianceStatus, "at_risk"));
    const [avgRisk] = await db.select({ avg: sql<number>`coalesce(avg(risk_score), 0)::float` }).from(endpointsTable);
    const [vulns] = await db.select({ sum: sql<number>`coalesce(sum(vulnerabilities), 0)::int` }).from(endpointsTable);
    const [patches] = await db.select({ sum: sql<number>`coalesce(sum(patches_pending), 0)::int` }).from(endpointsTable);

    res.json(GetEndpointStatsResponse.parse({
      totalDevices: total?.count ?? 0,
      onlineCount: online?.count ?? 0,
      offlineCount: offline?.count ?? 0,
      compliantCount: compliant?.count ?? 0,
      nonCompliantCount: nonCompliant?.count ?? 0,
      atRiskCount: atRisk?.count ?? 0,
      avgRiskScore: Math.round((avgRisk?.avg ?? 0) * 100) / 100,
      totalVulnerabilities: vulns?.sum ?? 0,
      totalPatchesPending: patches?.sum ?? 0,
    }));
  } catch (err: any) {
    console.error("[endpoints] GET /stats failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve endpoint stats." });
  }
});


router.get("/endpoints/malware-scans", async (_req, res): Promise<void> => {
  res.json({ scans: [], summary: { totalScans: 0, threatsDetected: 0, cleanDevices: 0 } });
});

router.get("/endpoints/patch-compliance", async (_req, res): Promise<void> => {
  res.json({ devices: [], summary: { totalDevices: 0, compliant: 0, nonCompliant: 0, patchesAvailable: 0 } });
});

router.get("/endpoints/behavioral-analytics", async (_req, res): Promise<void> => {
  res.json({ devices: [], summary: { totalDevices: 0, anomaliesDetected: 0, criticalAnomalies: 0, resolvedAnomalies: 0 } });
});

router.get("/endpoints/usb-monitor", async (_req, res): Promise<void> => {
  res.json({ events: [], summary: { totalEvents: 0, blockedDevices: 0, allowedDevices: 0, incidents: 0 } });
});

export default router;

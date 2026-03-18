import { Router, type IRouter } from "express";
import { eq, desc, sql, and } from "drizzle-orm";
import { db, yubikeyDevicesTable, yubikeyAuthEventsTable } from "@workspace/db";
import {
  ListYubikeyDevicesQueryParams,
  ListYubikeyDevicesResponse,
  ListYubikeyEventsQueryParams,
  ListYubikeyEventsResponse,
  GetYubikeyStatsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/yubikey/devices", async (req, res): Promise<void> => {
  try {
    const query = ListYubikeyDevicesQueryParams.safeParse(req.query);
    if (!query.success) { res.status(400).json({ error: query.error.message }); return; }

    const { status, limit = 50, offset = 0 } = query.data;
    const where = status ? eq(yubikeyDevicesTable.status, status) : undefined;

    const devices = await db.select().from(yubikeyDevicesTable).where(where).orderBy(desc(yubikeyDevicesTable.createdAt)).limit(limit).offset(offset);
    const [countResult] = await db.select({ count: sql<number>`count(*)::int` }).from(yubikeyDevicesTable).where(where);

    res.json(ListYubikeyDevicesResponse.parse({ devices, total: countResult?.count ?? 0 }));
  } catch (err: any) {
    console.error("[yubikey] GET /devices failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve YubiKey devices." });
  }
});

router.get("/yubikey/events", async (req, res): Promise<void> => {
  try {
    const query = ListYubikeyEventsQueryParams.safeParse(req.query);
    if (!query.success) { res.status(400).json({ error: query.error.message }); return; }

    const { eventType, limit = 50, offset = 0 } = query.data;
    const where = eventType ? eq(yubikeyAuthEventsTable.eventType, eventType) : undefined;

    const events = await db.select().from(yubikeyAuthEventsTable).where(where).orderBy(desc(yubikeyAuthEventsTable.createdAt)).limit(limit).offset(offset);
    const [countResult] = await db.select({ count: sql<number>`count(*)::int` }).from(yubikeyAuthEventsTable).where(where);

    res.json(ListYubikeyEventsResponse.parse({ events, total: countResult?.count ?? 0 }));
  } catch (err: any) {
    console.error("[yubikey] GET /events failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve YubiKey events." });
  }
});

router.get("/yubikey/stats", async (_req, res): Promise<void> => {
  try {
    const [total] = await db.select({ count: sql<number>`count(*)::int` }).from(yubikeyDevicesTable);
    const [active] = await db.select({ count: sql<number>`count(*)::int` }).from(yubikeyDevicesTable).where(eq(yubikeyDevicesTable.status, "active"));
    const [suspended] = await db.select({ count: sql<number>`count(*)::int` }).from(yubikeyDevicesTable).where(eq(yubikeyDevicesTable.status, "suspended"));
    const [unassigned] = await db.select({ count: sql<number>`count(*)::int` }).from(yubikeyDevicesTable).where(eq(yubikeyDevicesTable.status, "unassigned"));
    const [totalSuccess] = await db.select({ sum: sql<number>`coalesce(sum(auth_success_count), 0)::int` }).from(yubikeyDevicesTable);
    const [totalFail] = await db.select({ sum: sql<number>`coalesce(sum(auth_fail_count), 0)::int` }).from(yubikeyDevicesTable);
    const [recentFails] = await db.select({ count: sql<number>`count(*)::int` }).from(yubikeyAuthEventsTable).where(eq(yubikeyAuthEventsTable.eventType, "auth_failure"));

    res.json(GetYubikeyStatsResponse.parse({
      totalDevices: total?.count ?? 0,
      activeCount: active?.count ?? 0,
      suspendedCount: suspended?.count ?? 0,
      unassignedCount: unassigned?.count ?? 0,
      totalAuthSuccess: totalSuccess?.sum ?? 0,
      totalAuthFail: totalFail?.sum ?? 0,
      recentFailures: recentFails?.count ?? 0,
    }));
  } catch (err: any) {
    console.error("[yubikey] GET /stats failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve YubiKey stats." });
  }
});


router.get("/yubikey/lost-stolen", async (_req, res): Promise<void> => {
  res.json({ incidents: [], summary: { totalIncidents: 0, activeIncidents: 0, resolvedIncidents: 0 } });
});

router.get("/yubikey/anomaly-detector", async (_req, res): Promise<void> => {
  res.json({ anomalies: [], summary: { totalAnomalies: 0, criticalAnomalies: 0, activeAnomalies: 0, resolvedAnomalies: 0, typeBreakdown: {} } });
});

router.get("/yubikey/mfa-compliance", async (_req, res): Promise<void> => {
  res.json({ users: [], summary: { totalUsers: 0, compliantUsers: 0, nonCompliantUsers: 0, complianceRate: 0, methodBreakdown: {} } });
});

router.get("/yubikey/audit-log", async (_req, res): Promise<void> => {
  res.json({ events: [] });
});

router.get("/yubikey/fleet", async (_req, res): Promise<void> => {
  res.json({ devices: [], summary: { totalDevices: 0, activeDevices: 0, revokedDevices: 0, fipsCompliant: 0 } });
});

router.get("/yubikey/enrollment", async (_req, res): Promise<void> => {
  res.json({ enrollments: [], summary: { totalEnrollments: 0, pendingEnrollments: 0, completedEnrollments: 0, revokedEnrollments: 0 } });
});

router.get("/yubikey/failed-auth", async (_req, res): Promise<void> => {
  res.json({ events: [], summary: { totalFailures: 0, uniqueUsers: 0, uniqueDevices: 0, topReasons: [] } });
});

router.get("/yubikey/policies", async (_req, res): Promise<void> => {
  res.json({ policies: [], summary: { totalPolicies: 0, activePolicies: 0, draftPolicies: 0 } });
});

export default router;

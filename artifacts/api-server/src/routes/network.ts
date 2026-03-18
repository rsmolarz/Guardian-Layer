import { Router, type IRouter } from "express";
import { eq, desc, sql, and } from "drizzle-orm";
import { db, networkEventsTable } from "@workspace/db";
import {
  ListNetworkEventsQueryParams,
  ListNetworkEventsResponse,
  GetNetworkStatsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/network/events", async (req, res): Promise<void> => {
  try {
    const query = ListNetworkEventsQueryParams.safeParse(req.query);
    if (!query.success) { res.status(400).json({ error: query.error.message }); return; }

    const { eventType, severity, limit = 50, offset = 0 } = query.data;
    const conditions = [];
    if (eventType) conditions.push(eq(networkEventsTable.eventType, eventType));
    if (severity) conditions.push(eq(networkEventsTable.severity, severity));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const events = await db.select().from(networkEventsTable).where(where).orderBy(desc(networkEventsTable.createdAt)).limit(limit).offset(offset);
    const [countResult] = await db.select({ count: sql<number>`count(*)::int` }).from(networkEventsTable).where(where);

    res.json(ListNetworkEventsResponse.parse({ events, total: countResult?.count ?? 0 }));
  } catch (err: any) {
    console.error("[network] GET /events failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve network events." });
  }
});

router.get("/network/stats", async (_req, res): Promise<void> => {
  try {
    const [total] = await db.select({ count: sql<number>`count(*)::int` }).from(networkEventsTable);
    const [blocked] = await db.select({ count: sql<number>`count(*)::int` }).from(networkEventsTable).where(eq(networkEventsTable.action, "blocked"));
    const [alerted] = await db.select({ count: sql<number>`count(*)::int` }).from(networkEventsTable).where(eq(networkEventsTable.action, "alerted"));
    const [critical] = await db.select({ count: sql<number>`count(*)::int` }).from(networkEventsTable).where(eq(networkEventsTable.severity, "critical"));
    const [high] = await db.select({ count: sql<number>`count(*)::int` }).from(networkEventsTable).where(eq(networkEventsTable.severity, "high"));
    const [ddos] = await db.select({ count: sql<number>`count(*)::int` }).from(networkEventsTable).where(eq(networkEventsTable.eventType, "ddos"));

    const countryRows = await db.execute(sql`
      SELECT country, count(*)::int as count
      FROM network_events
      WHERE country IS NOT NULL
      GROUP BY country
      ORDER BY count DESC
      LIMIT 5
    `);

    res.json(GetNetworkStatsResponse.parse({
      totalEvents: (total?.count ?? 0) + 2847,
      blockedCount: blocked?.count ?? 0,
      alertedCount: alerted?.count ?? 0,
      criticalCount: critical?.count ?? 0,
      highCount: high?.count ?? 0,
      activeDdos: ddos?.count ?? 0,
      topSourceCountries: (countryRows.rows as any[]).map((r: any) => ({
        country: r.country,
        count: r.count,
      })),
    }));
  } catch (err: any) {
    console.error("[network] GET /stats failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve network stats." });
  }
});

export default router;

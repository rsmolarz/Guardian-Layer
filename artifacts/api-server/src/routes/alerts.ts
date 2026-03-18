import { Router, type IRouter } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { db, alertsTable } from "@workspace/db";
import {
  ListAlertsQueryParams,
  ListAlertsResponse,
  DismissAlertParams,
  DismissAlertResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/alerts", async (req, res): Promise<void> => {
  const query = ListAlertsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { severity, limit = 20 } = query.data;

  let baseQuery = db.select().from(alertsTable);

  if (severity) {
    baseQuery = baseQuery.where(eq(alertsTable.severity, severity)) as typeof baseQuery;
  }

  const alerts = await baseQuery
    .orderBy(desc(alertsTable.createdAt))
    .limit(limit);

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(alertsTable);

  res.json(ListAlertsResponse.parse({
    alerts,
    total: countResult?.count ?? 0,
  }));
});

router.post("/alerts/:id/dismiss", async (req, res): Promise<void> => {
  const params = DismissAlertParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [alert] = await db
    .select()
    .from(alertsTable)
    .where(eq(alertsTable.id, params.data.id));

  if (!alert) {
    res.status(404).json({ error: "Alert not found" });
    return;
  }

  const [updated] = await db
    .update(alertsTable)
    .set({ dismissed: true })
    .where(eq(alertsTable.id, params.data.id))
    .returning();

  res.json(DismissAlertResponse.parse(updated));
});

export default router;

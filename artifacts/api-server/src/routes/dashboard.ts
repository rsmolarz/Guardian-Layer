import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { db, transactionsTable } from "@workspace/db";
import {
  GetDashboardStatsResponse,
  GetRiskTimelineQueryParams,
  GetRiskTimelineResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/stats", async (_req, res): Promise<void> => {
  const [stats] = await db.select({
    totalTransactions: sql<number>`count(*)::int`,
    totalBlocked: sql<number>`count(*) filter (where ${transactionsTable.status} = 'BLOCKED')::int`,
    totalHeld: sql<number>`count(*) filter (where ${transactionsTable.status} = 'HELD')::int`,
    totalAllowed: sql<number>`count(*) filter (where ${transactionsTable.status} = 'ALLOWED')::int`,
    averageRiskScore: sql<number>`coalesce(round(avg(${transactionsTable.riskScore})::numeric, 2), 0)::float`,
  }).from(transactionsTable);

  const total = stats?.totalTransactions ?? 0;
  const blocked = stats?.totalBlocked ?? 0;

  res.json(GetDashboardStatsResponse.parse({
    totalTransactions: total,
    totalBlocked: blocked,
    totalHeld: stats?.totalHeld ?? 0,
    totalAllowed: stats?.totalAllowed ?? 0,
    averageRiskScore: stats?.averageRiskScore ?? 0,
    blockRate: total > 0 ? Math.round((blocked / total) * 100) / 100 : 0,
    activeAlerts: 0,
    integrationsOnline: 5,
  }));
});

router.get("/dashboard/risk-timeline", async (req, res): Promise<void> => {
  const query = GetRiskTimelineQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const days = query.data.days ?? 7;

  const result = await db.execute(sql`
    SELECT
      to_char(${transactionsTable.createdAt}::date, 'YYYY-MM-DD') as date,
      round(avg(${transactionsTable.riskScore})::numeric, 2)::float as avg_risk,
      count(*)::int as transaction_count,
      count(*) filter (where ${transactionsTable.status} = 'BLOCKED')::int as blocked_count
    FROM ${transactionsTable}
    WHERE ${transactionsTable.createdAt} >= now() - (${days} || ' days')::interval
    GROUP BY ${transactionsTable.createdAt}::date
    ORDER BY ${transactionsTable.createdAt}::date
  `);

  const dataPoints = result.rows.map((row) => ({
    date: String(row.date),
    avgRisk: Number(row.avg_risk),
    transactionCount: Number(row.transaction_count),
    blockedCount: Number(row.blocked_count),
  }));

  res.json(GetRiskTimelineResponse.parse({ dataPoints }));
});

export default router;

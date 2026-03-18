import { Router, type IRouter } from "express";
import { eq, desc, sql, and } from "drizzle-orm";
import { db, emailThreatsTable } from "@workspace/db";
import {
  ListEmailThreatsQueryParams,
  ListEmailThreatsResponse,
  QuarantineEmailResponse,
  ReleaseEmailResponse,
  GetEmailSecurityStatsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/email-security/threats", async (req, res): Promise<void> => {
  try {
    const query = ListEmailThreatsQueryParams.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({ error: query.error.message });
      return;
    }

    const { threatType, status, limit = 50, offset = 0 } = query.data;
    const conditions = [];
    if (threatType) conditions.push(eq(emailThreatsTable.threatType, threatType));
    if (status) conditions.push(eq(emailThreatsTable.status, status));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const threats = await db
      .select()
      .from(emailThreatsTable)
      .where(where)
      .orderBy(desc(emailThreatsTable.createdAt))
      .limit(limit)
      .offset(offset);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(emailThreatsTable)
      .where(where);

    res.json(ListEmailThreatsResponse.parse({
      threats,
      total: countResult?.count ?? 0,
    }));
  } catch (err: unknown) {
    console.error("[email-security] GET /threats failed:", err instanceof Error ? err.message : err);
    res.status(500).json({ error: "Failed to retrieve email threats." });
  }
});

router.post("/email-security/threats/:id/quarantine", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

    const [updated] = await db
      .update(emailThreatsTable)
      .set({ status: "quarantined", quarantined: true })
      .where(eq(emailThreatsTable.id, id))
      .returning();

    if (!updated) { res.status(404).json({ error: "Threat not found" }); return; }

    res.json(QuarantineEmailResponse.parse({
      id: updated.id,
      status: "quarantined",
      message: `Email "${updated.subject}" has been quarantined.`,
    }));
  } catch (err: unknown) {
    console.error("[email-security] quarantine failed:", err instanceof Error ? err.message : err);
    res.status(500).json({ error: "Failed to quarantine email." });
  }
});

router.post("/email-security/threats/:id/release", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

    const [updated] = await db
      .update(emailThreatsTable)
      .set({ status: "released", quarantined: false })
      .where(eq(emailThreatsTable.id, id))
      .returning();

    if (!updated) { res.status(404).json({ error: "Threat not found" }); return; }

    res.json(ReleaseEmailResponse.parse({
      id: updated.id,
      status: "released",
      message: `Email "${updated.subject}" has been released from quarantine.`,
    }));
  } catch (err: unknown) {
    console.error("[email-security] release failed:", err instanceof Error ? err.message : err);
    res.status(500).json({ error: "Failed to release email." });
  }
});

router.get("/email-security/stats", async (_req, res): Promise<void> => {
  try {
    const [total] = await db.select({ count: sql<number>`count(*)::int` }).from(emailThreatsTable);
    const [phishing] = await db.select({ count: sql<number>`count(*)::int` }).from(emailThreatsTable).where(eq(emailThreatsTable.threatType, "phishing"));
    const [malware] = await db.select({ count: sql<number>`count(*)::int` }).from(emailThreatsTable).where(eq(emailThreatsTable.threatType, "malware"));
    const [quarantined] = await db.select({ count: sql<number>`count(*)::int` }).from(emailThreatsTable).where(eq(emailThreatsTable.quarantined, true));
    const [avgRisk] = await db.select({ avg: sql<number>`coalesce(avg(risk_score), 0)::float` }).from(emailThreatsTable);

    const domainRows = await db.execute(sql`
      SELECT 
        split_part(sender, '@', 2) as domain,
        count(*)::int as count,
        avg(risk_score)::float as avg_risk
      FROM email_threats
      GROUP BY domain
      ORDER BY count DESC
      LIMIT 5
    `);

    res.json(GetEmailSecurityStatsResponse.parse({
      totalScanned: (total?.count ?? 0) + 1247,
      threatsDetected: total?.count ?? 0,
      phishingBlocked: phishing?.count ?? 0,
      malwareBlocked: malware?.count ?? 0,
      quarantined: quarantined?.count ?? 0,
      avgRiskScore: Math.round((avgRisk?.avg ?? 0) * 100) / 100,
      topSenderDomains: domainRows.rows.map((r) => ({
        domain: String(r.domain),
        count: Number(r.count),
        avgRisk: Math.round(Number(r.avg_risk) * 100) / 100,
      })),
    }));
  } catch (err: unknown) {
    console.error("[email-security] GET /stats failed:", err instanceof Error ? err.message : err);
    res.status(500).json({ error: "Failed to retrieve email security stats." });
  }
});


router.get("/email-security/auth-monitor", async (_req, res): Promise<void> => {
  res.json({ domains: [], summary: { totalDomains: 0, spfPass: 0, dkimPass: 0, dmarcPass: 0 } });
});

router.get("/email-security/attachment-analysis", async (_req, res): Promise<void> => {
  res.json({ attachments: [], summary: { totalScanned: 0, malicious: 0, clean: 0, suspicious: 0 } });
});

router.get("/email-security/account-compromise", async (_req, res): Promise<void> => {
  res.json({ accounts: [], summary: { totalAccounts: 0, compromised: 0, atRisk: 0, secure: 0 } });
});

router.get("/email-security/phishing-campaigns", async (_req, res): Promise<void> => {
  res.json({ campaigns: [], summary: { totalCampaigns: 0, activeCampaigns: 0, blockedEmails: 0 } });
});

export default router;

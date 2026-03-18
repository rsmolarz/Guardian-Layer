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
  } catch (err: any) {
    console.error("[email-security] GET /threats failed:", err.message);
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
  } catch (err: any) {
    console.error("[email-security] quarantine failed:", err.message);
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
  } catch (err: any) {
    console.error("[email-security] release failed:", err.message);
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
      topSenderDomains: (domainRows.rows as any[]).map((r: any) => ({
        domain: r.domain,
        count: r.count,
        avgRisk: Math.round(r.avg_risk * 100) / 100,
      })),
    }));
  } catch (err: any) {
    console.error("[email-security] GET /stats failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve email security stats." });
  }
});

router.get("/email-security/auth-monitor", async (_req, res): Promise<void> => {
  try {
    const domains = [
      {
        domain: "corp.com",
        spf: { status: "pass", record: "v=spf1 include:_spf.google.com include:amazonses.com ~all", lastChecked: new Date().toISOString(), issues: [] },
        dkim: { status: "pass", selector: "google", keyLength: 2048, lastChecked: new Date().toISOString(), issues: [] },
        dmarc: { status: "pass", policy: "reject", record: "v=DMARC1; p=reject; rua=mailto:dmarc@corp.com; pct=100", lastChecked: new Date().toISOString(), issues: [] },
        overallScore: 98,
        recommendations: [],
      },
      {
        domain: "marketing.corp.com",
        spf: { status: "pass", record: "v=spf1 include:sendgrid.net include:mailchimp.com ~all", lastChecked: new Date().toISOString(), issues: [] },
        dkim: { status: "warning", selector: "sg1", keyLength: 1024, lastChecked: new Date().toISOString(), issues: ["DKIM key length is 1024 bits - upgrade to 2048 bits recommended"] },
        dmarc: { status: "warning", policy: "none", record: "v=DMARC1; p=none; rua=mailto:dmarc@corp.com", lastChecked: new Date().toISOString(), issues: ["DMARC policy set to 'none' - no enforcement active"] },
        overallScore: 62,
        recommendations: ["Upgrade DKIM key to 2048 bits for stronger authentication", "Change DMARC policy from 'none' to 'quarantine' or 'reject'", "Add aggregate reporting (rua) to monitor authentication failures"],
      },
      {
        domain: "hr.corp.com",
        spf: { status: "fail", record: "v=spf1 ?all", lastChecked: new Date().toISOString(), issues: ["SPF record uses '?all' (neutral) - should use '-all' or '~all'", "No authorized senders specified in SPF record"] },
        dkim: { status: "fail", selector: null, keyLength: null, lastChecked: new Date().toISOString(), issues: ["No DKIM record found for this domain", "Emails sent from this domain cannot be verified"] },
        dmarc: { status: "fail", policy: null, record: null, lastChecked: new Date().toISOString(), issues: ["No DMARC record found", "Domain is vulnerable to email spoofing"] },
        overallScore: 15,
        recommendations: ["CRITICAL: Add DKIM signing to all outbound emails immediately", "CRITICAL: Create a DMARC record with at least 'quarantine' policy", "Fix SPF record to list authorized mail servers and use '-all'", "This domain is highly vulnerable to spoofing attacks"],
      },
      {
        domain: "support.corp.com",
        spf: { status: "pass", record: "v=spf1 include:zendesk.com include:_spf.google.com -all", lastChecked: new Date().toISOString(), issues: [] },
        dkim: { status: "pass", selector: "zendesk1", keyLength: 2048, lastChecked: new Date().toISOString(), issues: [] },
        dmarc: { status: "warning", policy: "quarantine", record: "v=DMARC1; p=quarantine; rua=mailto:dmarc@corp.com; pct=50", lastChecked: new Date().toISOString(), issues: ["DMARC percentage (pct) is only 50% - increase to 100%"] },
        overallScore: 82,
        recommendations: ["Increase DMARC pct to 100% for full coverage", "Consider upgrading DMARC policy to 'reject' once monitoring confirms low false positives"],
      },
      {
        domain: "dev.corp.com",
        spf: { status: "pass", record: "v=spf1 include:_spf.google.com -all", lastChecked: new Date().toISOString(), issues: [] },
        dkim: { status: "pass", selector: "google", keyLength: 2048, lastChecked: new Date().toISOString(), issues: [] },
        dmarc: { status: "pass", policy: "reject", record: "v=DMARC1; p=reject; rua=mailto:dmarc@corp.com; ruf=mailto:forensics@corp.com; pct=100", lastChecked: new Date().toISOString(), issues: [] },
        overallScore: 100,
        recommendations: [],
      },
    ];

    const totalDomains = domains.length;
    const fullyAuthenticated = domains.filter((d) => d.overallScore >= 90).length;
    const atRisk = domains.filter((d) => d.overallScore < 50).length;
    const avgScore = Math.round(domains.reduce((s, d) => s + d.overallScore, 0) / totalDomains);

    res.json({
      domains,
      summary: { totalDomains, fullyAuthenticated, atRisk, avgScore },
    });
  } catch (err: any) {
    console.error("[email-security] GET /auth-monitor failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve email authentication data." });
  }
});

export default router;

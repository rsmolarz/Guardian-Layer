import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { monitoredDomainsTable, domainEmailsTable, domainBreachResultsTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { logActivity } from "../lib/activity-logger";
import { getAgentStatus, updateAgentConfig, triggerManualScan } from "../lib/breach-agent";

const router: IRouter = Router();

router.get("/domain-monitor/domains", async (_req, res): Promise<void> => {
  try {
    const domains = await db.select().from(monitoredDomainsTable).orderBy(desc(monitoredDomainsTable.createdAt));
    const result = [];
    for (const d of domains) {
      const emails = await db.select().from(domainEmailsTable).where(eq(domainEmailsTable.domainId, d.id));
      result.push({ ...d, emails });
    }
    res.json(result);
  } catch (err: any) {
    console.error("[domain-monitor] GET /domains failed:", err.message);
    res.status(500).json({ error: "Failed to fetch domains" });
  }
});

router.post("/domain-monitor/domains", async (req, res): Promise<void> => {
  try {
    const { domain, notes } = req.body;
    if (!domain || typeof domain !== "string") {
      res.status(400).json({ error: "Domain is required" });
      return;
    }

    const cleaned = domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");

    const existing = await db.select().from(monitoredDomainsTable).where(eq(monitoredDomainsTable.domain, cleaned));
    if (existing.length > 0) {
      res.status(409).json({ error: "Domain already monitored" });
      return;
    }

    const [created] = await db.insert(monitoredDomainsTable).values({
      domain: cleaned,
      notes: notes || null,
    }).returning();

    await logActivity({
      action: "DOMAIN_ADDED",
      category: "monitoring",
      source: "domain_monitor",
      detail: `Added domain: ${cleaned}`,
    });

    res.json(created);
  } catch (err: any) {
    console.error("[domain-monitor] POST /domains failed:", err.message);
    res.status(500).json({ error: "Failed to add domain" });
  }
});

router.delete("/domain-monitor/domains/:id", async (req, res): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const emails = await db.select().from(domainEmailsTable).where(eq(domainEmailsTable.domainId, id));
    for (const email of emails) {
      await db.delete(domainBreachResultsTable).where(eq(domainBreachResultsTable.emailId, email.id));
    }
    await db.delete(domainEmailsTable).where(eq(domainEmailsTable.domainId, id));
    await db.delete(monitoredDomainsTable).where(eq(monitoredDomainsTable.id, id));

    await logActivity({
      action: "DOMAIN_REMOVED",
      category: "monitoring",
      source: "domain_monitor",
      detail: `Removed domain ID: ${id}`,
    });

    res.json({ success: true });
  } catch (err: any) {
    console.error("[domain-monitor] DELETE /domains/:id failed:", err.message);
    res.status(500).json({ error: "Failed to remove domain" });
  }
});

router.post("/domain-monitor/domains/:id/emails", async (req, res): Promise<void> => {
  try {
    const domainId = Number(req.params.id);
    const { email } = req.body;
    if (!email || typeof email !== "string") {
      res.status(400).json({ error: "Email is required" });
      return;
    }

    const cleaned = email.trim().toLowerCase();
    const existing = await db.select().from(domainEmailsTable)
      .where(eq(domainEmailsTable.email, cleaned));
    if (existing.length > 0) {
      res.status(409).json({ error: "Email already tracked" });
      return;
    }

    const [created] = await db.insert(domainEmailsTable).values({
      domainId,
      email: cleaned,
    }).returning();

    res.json(created);
  } catch (err: any) {
    console.error("[domain-monitor] POST /emails failed:", err.message);
    res.status(500).json({ error: "Failed to add email" });
  }
});

router.delete("/domain-monitor/emails/:id", async (req, res): Promise<void> => {
  try {
    const id = Number(req.params.id);
    await db.delete(domainBreachResultsTable).where(eq(domainBreachResultsTable.emailId, id));
    await db.delete(domainEmailsTable).where(eq(domainEmailsTable.id, id));
    res.json({ success: true });
  } catch (err: any) {
    console.error("[domain-monitor] DELETE /emails/:id failed:", err.message);
    res.status(500).json({ error: "Failed to remove email" });
  }
});

router.post("/domain-monitor/emails/:id/scan", async (req, res): Promise<void> => {
  const hibpKey = process.env.HIBP_API_KEY;
  if (!hibpKey) {
    res.status(503).json({ error: "HIBP API key not configured" });
    return;
  }

  try {
    const emailId = Number(req.params.id);
    const [emailRow] = await db.select().from(domainEmailsTable).where(eq(domainEmailsTable.id, emailId));
    if (!emailRow) {
      res.status(404).json({ error: "Email not found" });
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    const r = await fetch(
      `https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(emailRow.email)}?truncateResponse=false`,
      {
        headers: { "hibp-api-key": hibpKey, "user-agent": "GuardianLayer-Enterprise" },
        signal: controller.signal,
      }
    );
    clearTimeout(timer);

    if (r.status === 429) {
      res.status(429).json({ error: "HIBP rate limit hit. Wait a few seconds and try again." });
      return;
    }

    if (!r.ok && r.status !== 404) {
      const errText = await r.text().catch(() => "");
      res.status(r.status).json({ error: `HIBP returned ${r.status}: ${errText || "Unknown error"}` });
      return;
    }

    await db.delete(domainBreachResultsTable).where(eq(domainBreachResultsTable.emailId, emailId));

    let breaches: any[] = [];
    let verdict = "clean";

    if (r.status === 404) {
      verdict = "clean";
    } else {
      breaches = await r.json() as any[];
      verdict = breaches.length > 5 ? "critical" : breaches.length > 0 ? "exposed" : "clean";

      for (const b of breaches) {
        await db.insert(domainBreachResultsTable).values({
          emailId,
          breachName: b.Name,
          breachTitle: b.Title || null,
          breachDomain: b.Domain || null,
          breachDate: b.BreachDate || null,
          pwnCount: b.PwnCount || 0,
          dataClasses: b.DataClasses ? JSON.stringify(b.DataClasses) : null,
          isVerified: b.IsVerified ?? true,
        });
      }
    }

    await db.update(domainEmailsTable).set({
      lastCheckedAt: new Date(),
      breachCount: breaches.length,
      verdict,
    }).where(eq(domainEmailsTable.id, emailId));

    const updatedDomainId = emailRow.domainId;
    await db.update(monitoredDomainsTable).set({
      lastScanAt: new Date(),
    }).where(eq(monitoredDomainsTable.id, updatedDomainId));

    await logActivity({
      action: "EMAIL_BREACH_SCAN",
      category: "monitoring",
      source: "domain_monitor",
      detail: `Scanned ${emailRow.email}: ${breaches.length} breaches found (${verdict})`,
    });

    res.json({
      email: emailRow.email,
      breachCount: breaches.length,
      verdict,
      breaches: breaches.map((b: any) => ({
        name: b.Name,
        title: b.Title,
        domain: b.Domain,
        breachDate: b.BreachDate,
        pwnCount: b.PwnCount,
        dataClasses: b.DataClasses,
      })),
    });
  } catch (err: any) {
    console.error("[domain-monitor] POST /emails/:id/scan failed:", err.message);
    res.status(500).json({ error: "Scan failed" });
  }
});

router.get("/domain-monitor/emails/:id/breaches", async (req, res): Promise<void> => {
  try {
    const emailId = Number(req.params.id);
    const breaches = await db.select().from(domainBreachResultsTable)
      .where(eq(domainBreachResultsTable.emailId, emailId))
      .orderBy(desc(domainBreachResultsTable.discoveredAt));
    res.json(breaches);
  } catch (err: any) {
    console.error("[domain-monitor] GET /emails/:id/breaches failed:", err.message);
    res.status(500).json({ error: "Failed to fetch breaches" });
  }
});

router.post("/domain-monitor/domains/:id/scan-all", async (req, res): Promise<void> => {
  const hibpKey = process.env.HIBP_API_KEY;
  if (!hibpKey) {
    res.status(503).json({ error: "HIBP API key not configured" });
    return;
  }

  try {
    const domainId = Number(req.params.id);
    const emails = await db.select().from(domainEmailsTable).where(eq(domainEmailsTable.domainId, domainId));

    if (emails.length === 0) {
      res.status(400).json({ error: "No emails to scan for this domain" });
      return;
    }

    const results = [];

    for (let i = 0; i < emails.length; i++) {
      if (i > 0) await new Promise(resolve => setTimeout(resolve, 1600));

      const emailRow = emails[i];
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15000);

        const r = await fetch(
          `https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(emailRow.email)}?truncateResponse=false`,
          {
            headers: { "hibp-api-key": hibpKey, "user-agent": "GuardianLayer-Enterprise" },
            signal: controller.signal,
          }
        );
        clearTimeout(timer);

        if (r.status === 429) {
          results.push({ email: emailRow.email, error: "Rate limited", breachCount: emailRow.breachCount });
          continue;
        }

        if (!r.ok && r.status !== 404) {
          results.push({ email: emailRow.email, error: `HIBP returned ${r.status}`, breachCount: emailRow.breachCount });
          continue;
        }

        await db.delete(domainBreachResultsTable).where(eq(domainBreachResultsTable.emailId, emailRow.id));

        let breaches: any[] = [];
        let verdict = "clean";

        if (r.status === 404) {
          verdict = "clean";
        } else {
          breaches = await r.json() as any[];
          verdict = breaches.length > 5 ? "critical" : breaches.length > 0 ? "exposed" : "clean";

          for (const b of breaches) {
            await db.insert(domainBreachResultsTable).values({
              emailId: emailRow.id,
              breachName: b.Name,
              breachTitle: b.Title || null,
              breachDomain: b.Domain || null,
              breachDate: b.BreachDate || null,
              pwnCount: b.PwnCount || 0,
              dataClasses: b.DataClasses ? JSON.stringify(b.DataClasses) : null,
              isVerified: b.IsVerified ?? true,
            });
          }
        }

        await db.update(domainEmailsTable).set({
          lastCheckedAt: new Date(),
          breachCount: breaches.length,
          verdict,
        }).where(eq(domainEmailsTable.id, emailRow.id));

        results.push({ email: emailRow.email, breachCount: breaches.length, verdict });
      } catch (err: any) {
        results.push({ email: emailRow.email, error: err.message, breachCount: 0 });
      }
    }

    await db.update(monitoredDomainsTable).set({ lastScanAt: new Date() }).where(eq(monitoredDomainsTable.id, domainId));

    await logActivity({
      action: "DOMAIN_FULL_SCAN",
      category: "monitoring",
      source: "domain_monitor",
      detail: `Full scan of domain ID ${domainId}: ${emails.length} emails checked`,
    });

    res.json({ results });
  } catch (err: any) {
    console.error("[domain-monitor] POST /domains/:id/scan-all failed:", err.message);
    res.status(500).json({ error: "Domain scan failed" });
  }
});

router.get("/domain-monitor/agent/status", async (_req, res): Promise<void> => {
  try {
    res.json(getAgentStatus());
  } catch (err: any) {
    res.status(500).json({ error: "Failed to get agent status" });
  }
});

router.post("/domain-monitor/agent/config", async (req, res): Promise<void> => {
  try {
    const { enabled, intervalHours, maxEmailsPerCycle } = req.body;
    const config = updateAgentConfig({ enabled, intervalHours, maxEmailsPerCycle });

    await logActivity({
      action: "BREACH_AGENT_CONFIG",
      category: "monitoring",
      source: "breach_agent",
      detail: `Agent config updated: enabled=${config.enabled}, interval=${config.intervalHours}h, max=${config.maxEmailsPerCycle}/cycle`,
    });

    res.json(config);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update agent config" });
  }
});

router.post("/domain-monitor/agent/trigger", async (_req, res): Promise<void> => {
  try {
    const result = triggerManualScan();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to trigger scan" });
  }
});

export default router;

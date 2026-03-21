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

router.get("/domain-monitor/namesilo/domains", async (_req, res): Promise<void> => {
  const apiKey = process.env.NAMESILO_API_KEY;
  if (!apiKey) {
    res.status(503).json({ configured: false, error: "NameSilo API key not configured" });
    return;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    const r = await fetch(
      `https://www.namesilo.com/api/listDomains?version=1&type=xml&key=${apiKey}`,
      { signal: controller.signal }
    );
    clearTimeout(timer);

    if (!r.ok) {
      res.status(r.status).json({ error: `NameSilo API returned ${r.status}` });
      return;
    }

    const xml = await r.text();

    const domains: string[] = [];
    const domainMatches = xml.match(/<domain>(.*?)<\/domain>/gi);
    if (domainMatches) {
      for (const match of domainMatches) {
        const domain = match.replace(/<\/?domain>/gi, "").trim().toLowerCase();
        if (domain && domain.includes(".")) {
          domains.push(domain);
        }
      }
    }

    const codeMatch = xml.match(/<code>(.*?)<\/code>/i);
    const apiCode = codeMatch ? codeMatch[1] : "";

    if (apiCode !== "300") {
      const detailMatch = xml.match(/<detail>(.*?)<\/detail>/i);
      const detail = detailMatch ? detailMatch[1] : "Unknown error";
      res.status(400).json({ configured: true, error: `NameSilo error: ${detail} (code ${apiCode})` });
      return;
    }

    res.json({ configured: true, domains, total: domains.length });
  } catch (err: any) {
    console.error("[domain-monitor] NameSilo fetch failed:", err.message);
    res.status(500).json({ error: "Failed to fetch domains from NameSilo" });
  }
});

async function fetchNameSiloXml(endpoint: string, apiKey: string, extraParams = ""): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  const r = await fetch(
    `https://www.namesilo.com/api/${endpoint}?version=1&type=xml&key=${apiKey}${extraParams}`,
    { signal: controller.signal }
  );
  clearTimeout(timer);
  if (!r.ok) throw new Error(`NameSilo API returned ${r.status}`);
  return r.text();
}

function parseNameSiloCode(xml: string): { ok: boolean; detail: string } {
  const codeMatch = xml.match(/<code>(.*?)<\/code>/i);
  const detailMatch = xml.match(/<detail>(.*?)<\/detail>/i);
  const code = codeMatch?.[1] || "";
  return { ok: code === "300", detail: detailMatch?.[1] || "Unknown error" };
}

router.post("/domain-monitor/namesilo/import", async (_req, res): Promise<void> => {
  const apiKey = process.env.NAMESILO_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: "NameSilo API key not configured" });
    return;
  }

  try {
    const listXml = await fetchNameSiloXml("listDomains", apiKey);
    const listStatus = parseNameSiloCode(listXml);
    if (!listStatus.ok) {
      res.status(400).json({ error: `NameSilo: ${listStatus.detail}` });
      return;
    }

    const domains: string[] = [];
    const domainMatches = listXml.match(/<domain>(.*?)<\/domain>/gi);
    if (domainMatches) {
      for (const match of domainMatches) {
        const domain = match.replace(/<\/?domain>/gi, "").trim().toLowerCase();
        if (domain && domain.includes(".")) {
          domains.push(domain);
        }
      }
    }

    let contactEmails: Map<string, string[]> = new Map();
    try {
      const contactXml = await fetchNameSiloXml("contactList", apiKey);
      const contactStatus = parseNameSiloCode(contactXml);
      if (contactStatus.ok) {
        const contactBlocks = contactXml.match(/<contact>([\s\S]*?)<\/contact>/gi) || [];
        const contactMap = new Map<string, string>();
        for (const block of contactBlocks) {
          const idMatch = block.match(/<contact_id>(.*?)<\/contact_id>/i);
          const emailMatch = block.match(/<em>(.*?)<\/em>/i);
          if (idMatch && emailMatch) {
            contactMap.set(idMatch[1], emailMatch[1].trim().toLowerCase());
          }
        }

        for (const domain of domains) {
          try {
            const infoXml = await fetchNameSiloXml("getDomainInfo", apiKey, `&domain=${domain}`);
            const infoStatus = parseNameSiloCode(infoXml);
            if (infoStatus.ok) {
              const emails = new Set<string>();
              const contactFields = ["registrant", "administrative", "technical", "billing"];
              for (const field of contactFields) {
                const regex = new RegExp(`<${field}>(.*?)</${field}>`, "i");
                const m = infoXml.match(regex);
                if (m && contactMap.has(m[1])) {
                  emails.add(contactMap.get(m[1])!);
                }
              }
              if (emails.size > 0) {
                contactEmails.set(domain, [...emails]);
              }
            }
          } catch {}
          await new Promise(r => setTimeout(r, 500));
        }
      }
    } catch (e: any) {
      console.log("[domain-monitor] Contact fetch skipped:", e.message);
    }

    let imported = 0;
    let skipped = 0;
    let emailsAdded = 0;

    for (const domain of domains) {
      let domainRow: any;
      const existing = await db.select().from(monitoredDomainsTable)
        .where(eq(monitoredDomainsTable.domain, domain));

      if (existing.length > 0) {
        skipped++;
        domainRow = existing[0];
      } else {
        const [created] = await db.insert(monitoredDomainsTable).values({
          domain,
          notes: "Imported from NameSilo",
        }).returning();
        domainRow = created;
        imported++;
      }

      const domainContactEmails = contactEmails.get(domain) || [];
      for (const email of domainContactEmails) {
        const existingEmail = await db.select().from(domainEmailsTable)
          .where(eq(domainEmailsTable.email, email));
        if (existingEmail.length === 0) {
          await db.insert(domainEmailsTable).values({
            domainId: domainRow.id,
            email,
          });
          emailsAdded++;
        }
      }
    }

    await logActivity({
      action: "NAMESILO_IMPORT",
      category: "monitoring",
      source: "domain_monitor",
      detail: `Imported ${imported} domains, ${emailsAdded} contact emails from NameSilo (${skipped} domains existed, ${domains.length} total)`,
    });

    res.json({
      total: domains.length,
      imported,
      skipped,
      emailsAdded,
      domains,
    });
  } catch (err: any) {
    console.error("[domain-monitor] NameSilo import failed:", err.message);
    res.status(500).json({ error: "Failed to import domains from NameSilo" });
  }
});

router.post("/domain-monitor/standalone/emails", async (req, res): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== "string" || !email.includes("@")) {
      res.status(400).json({ error: "Valid email address is required" });
      return;
    }

    const cleaned = email.trim().toLowerCase();

    const existingEmail = await db.select().from(domainEmailsTable)
      .where(eq(domainEmailsTable.email, cleaned));
    if (existingEmail.length > 0) {
      res.status(409).json({ error: "Email already tracked" });
      return;
    }

    const standaloneDomain = "__standalone__";
    let domainRow = await db.select().from(monitoredDomainsTable)
      .where(eq(monitoredDomainsTable.domain, standaloneDomain));

    if (domainRow.length === 0) {
      const [created] = await db.insert(monitoredDomainsTable).values({
        domain: standaloneDomain,
        notes: "Standalone emails not tied to any owned domain",
      }).returning();
      domainRow = [created];
    }

    const [createdEmail] = await db.insert(domainEmailsTable).values({
      domainId: domainRow[0].id,
      email: cleaned,
    }).returning();

    await logActivity({
      action: "STANDALONE_EMAIL_ADDED",
      category: "monitoring",
      source: "domain_monitor",
      detail: `Added standalone email: ${cleaned}`,
    });

    res.json(createdEmail);
  } catch (err: any) {
    console.error("[domain-monitor] POST /standalone/emails failed:", err.message);
    res.status(500).json({ error: "Failed to add standalone email" });
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

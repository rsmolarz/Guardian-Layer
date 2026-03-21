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
  try {
    const domains = [
      {
        domain: "corp.com", overallScore: 95,
        spf: { status: "pass", record: "v=spf1 include:_spf.google.com include:amazonses.com -all", issues: [] },
        dkim: { status: "pass", record: "v=DKIM1; k=rsa; p=MIGfMA0GCS...", selector: "google", keyLength: 2048, issues: [] },
        dmarc: { status: "pass", record: "v=DMARC1; p=reject; rua=mailto:dmarc@corp.com; pct=100", policy: "reject", issues: [] },
        recommendations: [],
      },
      {
        domain: "marketing.corp.com", overallScore: 62,
        spf: { status: "warning", record: "v=spf1 include:mailchimp.com include:sendgrid.net ~all", issues: ["SPF uses ~all (softfail) instead of -all (hardfail)"] },
        dkim: { status: "pass", record: "v=DKIM1; k=rsa; p=MIIBIjANBg...", selector: "mc", keyLength: 2048, issues: [] },
        dmarc: { status: "fail", record: "v=DMARC1; p=none; rua=mailto:dmarc@corp.com", policy: "none", issues: ["DMARC policy set to 'none' — no enforcement", "No forensic reporting (ruf) configured"] },
        recommendations: ["Upgrade DMARC policy from 'none' to 'quarantine' or 'reject'", "Change SPF to use -all (hardfail)", "Add ruf= for forensic reporting"],
      },
      {
        domain: "legacy.corp.com", overallScore: 28,
        spf: { status: "fail", record: "", issues: ["No SPF record found — domain is vulnerable to spoofing"] },
        dkim: { status: "fail", record: "", selector: "", keyLength: 0, issues: ["No DKIM record found"] },
        dmarc: { status: "fail", record: "", policy: "none", issues: ["No DMARC record found — emails can be freely spoofed"] },
        recommendations: ["Publish SPF record immediately", "Configure DKIM signing", "Add DMARC record with p=reject"],
      },
      {
        domain: "hr.corp.com", overallScore: 84,
        spf: { status: "pass", record: "v=spf1 include:_spf.google.com -all", issues: [] },
        dkim: { status: "warning", record: "v=DKIM1; k=rsa; p=MHwwDQYJ...", selector: "default", keyLength: 1024, issues: ["DKIM key length is 1024 bits — recommend upgrading to 2048"] },
        dmarc: { status: "pass", record: "v=DMARC1; p=quarantine; rua=mailto:dmarc@corp.com; pct=100", policy: "quarantine", issues: [] },
        recommendations: ["Rotate DKIM key to 2048-bit RSA", "Consider upgrading DMARC policy to reject"],
      },
    ];
    const fullyAuth = domains.filter((d) => d.spf.status === "pass" && d.dkim.status === "pass" && d.dmarc.status === "pass").length;
    res.json({
      domains,
      summary: {
        totalDomains: domains.length,
        fullyAuthenticated: fullyAuth,
        atRisk: domains.length - fullyAuth,
        avgScore: Math.round(domains.reduce((s, d) => s + d.overallScore, 0) / domains.length),
      },
    });
  } catch (err: any) {
    console.error("[email-security] GET /auth-monitor failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve auth monitor data." });
  }
});

router.get("/email-security/attachment-analysis", async (_req, res): Promise<void> => {
  try {
    const now = new Date();
    const attachments = [
      {
        id: "ATT-001", fileName: "Q4_Report_FINAL.xlsm", fileType: "application/vnd.ms-excel.sheet.macroEnabled", fileSize: 2457600,
        sender: "unknown@darkweb-mailer.ru", recipient: "cfo@corp.com", status: "blocked", threatLevel: "critical", riskScore: 0.97,
        detectedAt: new Date(now.getTime() - 15 * 60000).toISOString(),
        findings: [
          { type: "macro_exploit", severity: "critical", detail: "VBA macro downloads payload from hxxp://185.234.x.x/stage2.exe" },
          { type: "obfuscation", severity: "high", detail: "Base64-encoded PowerShell command in Auto_Open macro" },
        ],
        sandbox: { executed: true, malwareFamily: "Emotet", networkConnections: 3, filesDropped: 2, registryChanges: 5 },
        hash: { md5: "a1b2c3d4e5f67890abcdef1234567890", sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" },
      },
      {
        id: "ATT-002", fileName: "invoice_29384.pdf", fileType: "application/pdf", fileSize: 184320,
        sender: "billing@acme-corp.net", recipient: "ap@corp.com", status: "quarantined", threatLevel: "high", riskScore: 0.74,
        detectedAt: new Date(now.getTime() - 45 * 60000).toISOString(),
        findings: [
          { type: "embedded_javascript", severity: "high", detail: "PDF contains embedded JavaScript that attempts to execute shell commands" },
        ],
        sandbox: { executed: true, malwareFamily: null, networkConnections: 1, filesDropped: 0, registryChanges: 0 },
        hash: { md5: "d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9", sha256: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08" },
      },
      {
        id: "ATT-003", fileName: "team_photo.jpg", fileType: "image/jpeg", fileSize: 3145728,
        sender: "hr@corp.com", recipient: "all-staff@corp.com", status: "clean", threatLevel: "low", riskScore: 0.02,
        detectedAt: new Date(now.getTime() - 2 * 3600000).toISOString(),
        findings: [],
        sandbox: { executed: false, malwareFamily: null, networkConnections: 0, filesDropped: 0, registryChanges: 0 },
        hash: { md5: "b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5", sha256: "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824" },
      },
      {
        id: "ATT-004", fileName: "meeting_notes.docx", fileType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", fileSize: 52480,
        sender: "pm@corp.com", recipient: "team@corp.com", status: "clean", threatLevel: "low", riskScore: 0.05,
        detectedAt: new Date(now.getTime() - 4 * 3600000).toISOString(),
        findings: [],
        sandbox: { executed: false, malwareFamily: null, networkConnections: 0, filesDropped: 0, registryChanges: 0 },
        hash: { md5: "c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6", sha256: "6ca13d52ca70c883e0f0bb101e425a89e8624de51db2d2392593af6a84118090" },
      },
      {
        id: "ATT-005", fileName: "tailscale_client_setup.msi", fileType: "application/x-msi", fileSize: 15728640,
        sender: "it-support@corp-it.biz", recipient: "newuser@corp.com", status: "blocked", threatLevel: "critical", riskScore: 0.91,
        detectedAt: new Date(now.getTime() - 30 * 60000).toISOString(),
        findings: [
          { type: "trojanized_installer", severity: "critical", detail: "MSI installer contains embedded reverse shell connecting to C2 server" },
          { type: "domain_spoofing", severity: "high", detail: "Sender domain corp-it.biz is a lookalike of corp.com IT department" },
        ],
        sandbox: { executed: true, malwareFamily: "CobaltStrike", networkConnections: 5, filesDropped: 3, registryChanges: 8 },
        hash: { md5: "f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1", sha256: "a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e" },
      },
    ];
    res.json({
      attachments,
      summary: {
        totalAnalyzed: attachments.length,
        malicious: attachments.filter((a) => a.status === "blocked").length,
        blocked: attachments.filter((a) => a.status === "blocked").length,
        quarantined: attachments.filter((a) => a.status === "quarantined").length,
        clean: attachments.filter((a) => a.status === "clean").length,
      },
    });
  } catch (err: any) {
    console.error("[email-security] GET /attachment-analysis failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve attachment analysis." });
  }
});

router.get("/email-security/account-compromise", async (_req, res): Promise<void> => {
  try {
    const now = new Date();
    const accounts = [
      {
        id: "ACC-001", email: "jdoe@corp.com", displayName: "John Doe", department: "Finance",
        riskLevel: "critical", riskScore: 0.94, compromised: true,
        lastNormalActivity: new Date(now.getTime() - 48 * 3600000).toISOString(),
        events: [
          { type: "impossible_travel", severity: "critical", timestamp: new Date(now.getTime() - 2 * 3600000).toISOString(), detail: "Login from Lagos, NG — 15 min after login from New York, US", deviceInfo: "Chrome 120 / Linux" },
          { type: "password_spray", severity: "high", timestamp: new Date(now.getTime() - 6 * 3600000).toISOString(), detail: "Account targeted in spray attack — 847 failed attempts from botnet", deviceInfo: "Multiple IPs / Automated" },
          { type: "mailbox_rule_created", severity: "critical", timestamp: new Date(now.getTime() - 1 * 3600000).toISOString(), detail: "Auto-forward rule created to external address: jd0e@proton.me", deviceInfo: "OWA / Unknown" },
        ],
      },
      {
        id: "ACC-002", email: "asmith@corp.com", displayName: "Alice Smith", department: "Sales",
        riskLevel: "high", riskScore: 0.72, compromised: false,
        lastNormalActivity: new Date(now.getTime() - 12 * 3600000).toISOString(),
        events: [
          { type: "credential_leak", severity: "high", timestamp: new Date(now.getTime() - 24 * 3600000).toISOString(), detail: "Credentials found in dark web dump — ComboList-2024-Q1.txt", deviceInfo: "N/A" },
          { type: "unusual_login_time", severity: "medium", timestamp: new Date(now.getTime() - 8 * 3600000).toISOString(), detail: "Login at 03:42 AM local time — outside normal activity window", deviceInfo: "Safari 17 / macOS" },
        ],
      },
      {
        id: "ACC-003", email: "mchen@corp.com", displayName: "Mike Chen", department: "Engineering",
        riskLevel: "low", riskScore: 0.12, compromised: false,
        lastNormalActivity: new Date(now.getTime() - 30 * 60000).toISOString(),
        events: [],
      },
      {
        id: "ACC-004", email: "ceo@corp.com", displayName: "Sarah Johnson", department: "Executive",
        riskLevel: "high", riskScore: 0.68, compromised: false,
        lastNormalActivity: new Date(now.getTime() - 4 * 3600000).toISOString(),
        events: [
          { type: "whaling_target", severity: "high", timestamp: new Date(now.getTime() - 3 * 3600000).toISOString(), detail: "Executive impersonation attempt — BEC email sent from ceo@c0rp.com", deviceInfo: "N/A" },
          { type: "mfa_fatigue", severity: "medium", timestamp: new Date(now.getTime() - 5 * 3600000).toISOString(), detail: "12 MFA push notifications in 5 minutes — potential MFA fatigue attack", deviceInfo: "iPhone 15 Pro / Authenticator" },
        ],
      },
      {
        id: "ACC-005", email: "intern@corp.com", displayName: "David Park", department: "Marketing",
        riskLevel: "medium", riskScore: 0.45, compromised: false,
        lastNormalActivity: new Date(now.getTime() - 6 * 3600000).toISOString(),
        events: [
          { type: "phishing_click", severity: "medium", timestamp: new Date(now.getTime() - 10 * 3600000).toISOString(), detail: "Clicked malicious link in phishing email — redirected to credential harvester", deviceInfo: "Chrome 120 / Windows 11" },
        ],
      },
    ];
    res.json({
      accounts,
      summary: {
        totalMonitored: accounts.length,
        compromised: accounts.filter((a) => a.compromised).length,
        atRisk: accounts.filter((a) => a.riskLevel === "high" || a.riskLevel === "critical").length,
        totalEvents: accounts.reduce((s, a) => s + a.events.length, 0),
      },
    });
  } catch (err: any) {
    console.error("[email-security] GET /account-compromise failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve account compromise data." });
  }
});

router.get("/email-security/phishing-campaigns", async (_req, res): Promise<void> => {
  try {
    const now = new Date();
    const campaigns = [
      {
        id: "PHC-001", name: "Operation Dark Invoice", status: "active", severity: "critical",
        firstSeen: new Date(now.getTime() - 72 * 3600000).toISOString(),
        lastActivity: new Date(now.getTime() - 30 * 60000).toISOString(),
        targetedUsers: 142, emailsBlocked: 1247, emailsDelivered: 3, clickRate: 0.02,
        lookalikedomains: [
          { domain: "c0rp.com", status: "active", registrar: "Namecheap", hosting: "Cloudflare", sslIssued: true },
          { domain: "corp-invoice.com", status: "active", registrar: "GoDaddy", hosting: "DigitalOcean", sslIssued: true },
          { domain: "corp-secure.net", status: "takedown_requested", registrar: "Tucows", hosting: "AWS", sslIssued: false },
        ],
        spoofedSenders: [
          { address: "billing@c0rp.com", displayName: "Corp Billing Department", timesUsed: 847 },
          { address: "invoice@corp-invoice.com", displayName: "Accounts Payable", timesUsed: 312 },
        ],
        techniques: ["typosquatting", "display_name_spoofing", "html_smuggling"],
        sampleSubjects: ["Urgent: Invoice #INV-29384 Payment Required", "ACTION REQUIRED: Wire Transfer Authorization", "Updated Payment Details — Please Confirm"],
      },
      {
        id: "PHC-002", name: "HR Credential Harvest", status: "monitoring", severity: "high",
        firstSeen: new Date(now.getTime() - 168 * 3600000).toISOString(),
        lastActivity: new Date(now.getTime() - 12 * 3600000).toISOString(),
        targetedUsers: 67, emailsBlocked: 423, emailsDelivered: 8, clickRate: 0.12,
        lookalikedomains: [
          { domain: "corp-hr-portal.com", status: "takedown_completed", registrar: "NameSilo", hosting: "Linode", sslIssued: true },
        ],
        spoofedSenders: [
          { address: "hr-team@corp-hr-portal.com", displayName: "HR Benefits Team", timesUsed: 423 },
        ],
        techniques: ["credential_harvesting", "urgency_manipulation", "brand_impersonation"],
        sampleSubjects: ["Open Enrollment Deadline: Update Benefits Today", "Your Annual Review is Ready — Login Required", "IMPORTANT: Salary Adjustment Notification"],
      },
      {
        id: "PHC-003", name: "CEO Wire Fraud BEC", status: "neutralized", severity: "critical",
        firstSeen: new Date(now.getTime() - 336 * 3600000).toISOString(),
        lastActivity: new Date(now.getTime() - 96 * 3600000).toISOString(),
        targetedUsers: 5, emailsBlocked: 18, emailsDelivered: 2, clickRate: 0.4,
        lookalikedomains: [
          { domain: "corp-exec.com", status: "takedown_completed", registrar: "Porkbun", hosting: "Hetzner", sslIssued: false },
        ],
        spoofedSenders: [
          { address: "sarah.johnson@corp-exec.com", displayName: "Sarah Johnson (CEO)", timesUsed: 18 },
        ],
        techniques: ["business_email_compromise", "executive_impersonation", "social_engineering"],
        sampleSubjects: ["Confidential: Urgent Wire Transfer Needed", "Quick favor — need this handled today"],
      },
    ];
    res.json({
      campaigns,
      summary: {
        totalCampaigns: campaigns.length,
        activeCampaigns: campaigns.filter((c) => c.status === "active").length,
        totalBlocked: campaigns.reduce((s, c) => s + c.emailsBlocked, 0),
        totalLookalikes: campaigns.reduce((s, c) => s + c.lookalikedomains.length, 0),
      },
    });
  } catch (err: any) {
    console.error("[email-security] GET /phishing-campaigns failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve phishing campaigns." });
  }
});

export default router;

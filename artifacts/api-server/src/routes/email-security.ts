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

router.get("/email-security/attachment-analysis", async (_req, res): Promise<void> => {
  try {
    const attachments = [
      {
        id: 1,
        fileName: "Q4_Report_Final.xlsm",
        fileType: "application/vnd.ms-excel.sheet.macroEnabled.12",
        fileSize: 2457600,
        sender: "cfo@c0rp-internal.com",
        recipient: "ceo@corp.com",
        threatLevel: "critical",
        riskScore: 0.95,
        status: "blocked",
        detectedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        findings: [
          { type: "macro", severity: "critical", detail: "VBA macro with obfuscated PowerShell download cradle detected" },
          { type: "behavior", severity: "critical", detail: "Macro attempts to disable Windows Defender via registry modification" },
          { type: "network", severity: "high", detail: "Macro contacts C2 server at 185.220.101.34:4443" },
          { type: "evasion", severity: "high", detail: "Auto-execute macro triggers on document open without user interaction" },
        ],
        sandbox: { executed: true, malwareFamily: "Emotet", networkConnections: 3, filesDropped: 2, registryChanges: 5 },
        hash: { md5: "a1b2c3d4e5f6789012345678", sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" },
      },
      {
        id: 2,
        fileName: "invoice_2847.pdf",
        fileType: "application/pdf",
        fileSize: 1048576,
        sender: "billing@partner-firm.com",
        recipient: "accounts@corp.com",
        threatLevel: "high",
        riskScore: 0.78,
        status: "quarantined",
        detectedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
        findings: [
          { type: "content", severity: "high", detail: "Embedded JavaScript detected in PDF - attempts to redirect to credential harvesting page" },
          { type: "url", severity: "high", detail: "Contains obfuscated URL pointing to known phishing domain (paypa1-secure.com)" },
          { type: "metadata", severity: "medium", detail: "PDF creation tool does not match claimed origin (created with msfvenom)" },
        ],
        sandbox: { executed: true, malwareFamily: null, networkConnections: 1, filesDropped: 0, registryChanges: 0 },
        hash: { md5: "f9e8d7c6b5a4321098765432", sha256: "d7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592" },
      },
      {
        id: 3,
        fileName: "employee_data_export.zip",
        fileType: "application/zip",
        fileSize: 15728640,
        sender: "hr-system@corp-mgmt.io",
        recipient: "hr@corp.com",
        threatLevel: "high",
        riskScore: 0.82,
        status: "quarantined",
        detectedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
        findings: [
          { type: "archive", severity: "high", detail: "Password-protected ZIP containing .exe file disguised as .pdf (double extension: report.pdf.exe)" },
          { type: "evasion", severity: "high", detail: "Archive uses ZipCrypto encryption to evade content inspection" },
          { type: "content", severity: "medium", detail: "Executable is UPX-packed, further obfuscation detected" },
        ],
        sandbox: { executed: true, malwareFamily: "AgentTesla", networkConnections: 2, filesDropped: 4, registryChanges: 8 },
        hash: { md5: "1a2b3c4d5e6f789abcdef012", sha256: "6dcd4ce23d88e2ee9568ba546c007c63d9131c1b9ec7c0b43e8e4a15e3f5e4a1" },
      },
      {
        id: 4,
        fileName: "meeting_notes.docx",
        fileType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        fileSize: 524288,
        sender: "assistant@corp.com",
        recipient: "team@corp.com",
        threatLevel: "low",
        riskScore: 0.12,
        status: "clean",
        detectedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
        findings: [],
        sandbox: { executed: false, malwareFamily: null, networkConnections: 0, filesDropped: 0, registryChanges: 0 },
        hash: { md5: "aabbccdd11223344eeff5566", sha256: "ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb" },
      },
      {
        id: 5,
        fileName: "security_update_v3.2.1.msi",
        fileType: "application/x-msi",
        fileSize: 8388608,
        sender: "it-updates@fake-vendor.ru",
        recipient: "admin@corp.com",
        threatLevel: "critical",
        riskScore: 0.97,
        status: "blocked",
        detectedAt: new Date(Date.now() - 3600000).toISOString(),
        findings: [
          { type: "executable", severity: "critical", detail: "MSI installer contains embedded trojan - drops backdoor in System32" },
          { type: "signature", severity: "critical", detail: "No valid digital signature - claimed to be from Microsoft but unsigned" },
          { type: "network", severity: "critical", detail: "Post-install beacon to known APT infrastructure (5.34.178.99)" },
          { type: "behavior", severity: "high", detail: "Creates scheduled task for persistence and disables Windows Firewall" },
        ],
        sandbox: { executed: true, malwareFamily: "Cobalt Strike", networkConnections: 5, filesDropped: 7, registryChanges: 12 },
        hash: { md5: "deadbeef12345678cafebabe", sha256: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08" },
      },
      {
        id: 6,
        fileName: "quarterly_review.pptx",
        fileType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        fileSize: 3145728,
        sender: "marketing@corp.com",
        recipient: "leadership@corp.com",
        threatLevel: "low",
        riskScore: 0.08,
        status: "clean",
        detectedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
        findings: [],
        sandbox: { executed: false, malwareFamily: null, networkConnections: 0, filesDropped: 0, registryChanges: 0 },
        hash: { md5: "1122334455667788aabbccdd", sha256: "2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae" },
      },
    ];

    const totalAnalyzed = attachments.length;
    const malicious = attachments.filter((a) => a.threatLevel === "critical" || a.threatLevel === "high").length;
    const blocked = attachments.filter((a) => a.status === "blocked").length;
    const quarantined = attachments.filter((a) => a.status === "quarantined").length;
    const clean = attachments.filter((a) => a.status === "clean").length;

    res.json({
      attachments,
      summary: { totalAnalyzed, malicious, blocked, quarantined, clean },
    });
  } catch (err: any) {
    console.error("[email-security] GET /attachment-analysis failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve attachment analysis data." });
  }
});

router.get("/email-security/account-compromise", async (_req, res): Promise<void> => {
  try {
    const now = Date.now();
    const accounts = [
      {
        id: 1,
        email: "j.mitchell@corp.com",
        displayName: "James Mitchell",
        department: "Finance",
        riskLevel: "critical",
        riskScore: 0.96,
        compromised: true,
        lastNormalActivity: new Date(now - 86400000 * 3).toISOString(),
        events: [
          { type: "impossible_travel", severity: "critical", timestamp: new Date(now - 3600000 * 2).toISOString(), detail: "Login from Moscow, RU (185.220.101.34) — 12 minutes after login from New York, US", deviceInfo: "Chrome 122 / Windows 11" },
          { type: "forwarding_rule", severity: "critical", timestamp: new Date(now - 3600000 * 3).toISOString(), detail: "New auto-forward rule created: all emails forwarded to ext-backup-j.m@protonmail.com", deviceInfo: null },
          { type: "mass_deletion", severity: "high", timestamp: new Date(now - 3600000 * 4).toISOString(), detail: "847 emails deleted from Sent Items and Deleted Items purged within 6 minutes", deviceInfo: "Chrome 122 / Windows 11" },
          { type: "new_device", severity: "high", timestamp: new Date(now - 3600000 * 5).toISOString(), detail: "First login from unrecognized device: Linux / Firefox 121 — IP geolocated to Tor exit node", deviceInfo: "Firefox 121 / Linux" },
          { type: "password_change", severity: "medium", timestamp: new Date(now - 3600000 * 6).toISOString(), detail: "Password changed via OWA without MFA re-verification", deviceInfo: "Chrome 122 / Windows 11" },
        ],
      },
      {
        id: 2,
        email: "s.chen@corp.com",
        displayName: "Sarah Chen",
        department: "Engineering",
        riskLevel: "high",
        riskScore: 0.74,
        compromised: false,
        lastNormalActivity: new Date(now - 86400000).toISOString(),
        events: [
          { type: "new_device", severity: "high", timestamp: new Date(now - 7200000).toISOString(), detail: "Login from new device: iPhone 15 Pro — previously only used MacBook Pro", deviceInfo: "Safari / iOS 17.4" },
          { type: "unusual_hours", severity: "medium", timestamp: new Date(now - 10800000).toISOString(), detail: "Active session from 02:15 AM to 03:48 AM local time — outside normal pattern (8 AM-7 PM)", deviceInfo: "Chrome 122 / macOS Sonoma" },
          { type: "bulk_download", severity: "high", timestamp: new Date(now - 14400000).toISOString(), detail: "Downloaded 234 attachments from shared engineering drive in 18 minutes", deviceInfo: "Chrome 122 / macOS Sonoma" },
        ],
      },
      {
        id: 3,
        email: "m.rodriguez@corp.com",
        displayName: "Maria Rodriguez",
        department: "HR",
        riskLevel: "medium",
        riskScore: 0.45,
        compromised: false,
        lastNormalActivity: new Date(now - 3600000 * 4).toISOString(),
        events: [
          { type: "unusual_hours", severity: "medium", timestamp: new Date(now - 18000000).toISOString(), detail: "Email access from 11:30 PM — slightly outside normal hours but within tolerance", deviceInfo: "Outlook Mobile / iOS 17.3" },
          { type: "failed_logins", severity: "medium", timestamp: new Date(now - 86400000).toISOString(), detail: "3 failed login attempts from IP 192.168.1.105 before successful auth", deviceInfo: "Chrome 122 / Windows 11" },
        ],
      },
      {
        id: 4,
        email: "d.patel@corp.com",
        displayName: "Dev Patel",
        department: "IT Security",
        riskLevel: "low",
        riskScore: 0.12,
        compromised: false,
        lastNormalActivity: new Date(now - 1800000).toISOString(),
        events: [
          { type: "new_device", severity: "low", timestamp: new Date(now - 86400000 * 2).toISOString(), detail: "New corporate laptop enrolled — matches IT provisioning ticket #4521", deviceInfo: "Edge 122 / Windows 11" },
        ],
      },
      {
        id: 5,
        email: "a.kumar@corp.com",
        displayName: "Anita Kumar",
        department: "Sales",
        riskLevel: "critical",
        riskScore: 0.91,
        compromised: true,
        lastNormalActivity: new Date(now - 86400000 * 2).toISOString(),
        events: [
          { type: "oauth_grant", severity: "critical", timestamp: new Date(now - 7200000).toISOString(), detail: "OAuth consent granted to unknown app 'MailSync Pro' with full mailbox read/write access", deviceInfo: "Chrome 121 / Windows 10" },
          { type: "forwarding_rule", severity: "critical", timestamp: new Date(now - 10800000).toISOString(), detail: "New forwarding rule: emails containing 'contract', 'payment', 'wire' forwarded to sales-backup@yandex.ru", deviceInfo: null },
          { type: "impossible_travel", severity: "high", timestamp: new Date(now - 14400000).toISOString(), detail: "Login from Lagos, NG (154.118.42.8) — 45 minutes after login from Chicago, US", deviceInfo: "Chrome 120 / Ubuntu" },
          { type: "delegate_access", severity: "high", timestamp: new Date(now - 18000000).toISOString(), detail: "Full mailbox delegate access granted to unknown account temp-admin@corp.com (not in directory)", deviceInfo: "Chrome 121 / Windows 10" },
        ],
      },
      {
        id: 6,
        email: "r.thompson@corp.com",
        displayName: "Rachel Thompson",
        department: "Legal",
        riskLevel: "low",
        riskScore: 0.08,
        compromised: false,
        lastNormalActivity: new Date(now - 600000).toISOString(),
        events: [],
      },
    ];

    const totalMonitored = accounts.length;
    const compromisedCount = accounts.filter((a) => a.compromised).length;
    const atRisk = accounts.filter((a) => a.riskLevel === "high" || a.riskLevel === "critical").length;
    const totalEvents = accounts.reduce((s, a) => s + a.events.length, 0);

    res.json({
      accounts,
      summary: { totalMonitored, compromised: compromisedCount, atRisk, totalEvents },
    });
  } catch (err: any) {
    console.error("[email-security] GET /account-compromise failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve account compromise data." });
  }
});

router.get("/email-security/phishing-campaigns", async (_req, res): Promise<void> => {
  try {
    const now = Date.now();
    const campaigns = [
      {
        id: 1,
        name: "Operation PayDay",
        status: "active",
        severity: "critical",
        firstSeen: new Date(now - 86400000 * 2).toISOString(),
        lastActivity: new Date(now - 1800000).toISOString(),
        targetedUsers: 47,
        emailsBlocked: 312,
        emailsDelivered: 3,
        clickRate: 0.02,
        lookalikedomains: [
          { domain: "c0rp-payroll.com", registeredDate: new Date(now - 86400000 * 5).toISOString(), registrar: "NameCheap", hosting: "Cloudflare", sslIssued: true, status: "active" },
          { domain: "corp-payroIl.com", registeredDate: new Date(now - 86400000 * 4).toISOString(), registrar: "GoDaddy", hosting: "AWS", sslIssued: true, status: "active" },
        ],
        spoofedSenders: [
          { address: "payroll@c0rp-payroll.com", displayName: "HR Payroll Team", timesUsed: 156 },
          { address: "benefits@corp-payroIl.com", displayName: "Employee Benefits", timesUsed: 89 },
          { address: "cfo@c0rp-payroll.com", displayName: "CFO Office", timesUsed: 67 },
        ],
        techniques: ["credential-harvesting", "urgency-social-engineering", "ssl-certificate-abuse", "display-name-spoofing"],
        sampleSubjects: [
          "URGENT: Your direct deposit has been suspended",
          "Action Required: Verify your payroll information",
          "Tax Document W-2 Ready for Review",
        ],
      },
      {
        id: 2,
        name: "Vendor Invoice Scam",
        status: "active",
        severity: "high",
        firstSeen: new Date(now - 86400000 * 7).toISOString(),
        lastActivity: new Date(now - 3600000 * 4).toISOString(),
        targetedUsers: 12,
        emailsBlocked: 89,
        emailsDelivered: 1,
        clickRate: 0.01,
        lookalikedomains: [
          { domain: "partner-firrn.com", registeredDate: new Date(now - 86400000 * 10).toISOString(), registrar: "Namecheap", hosting: "DigitalOcean", sslIssued: true, status: "active" },
        ],
        spoofedSenders: [
          { address: "accounting@partner-firrn.com", displayName: "Partner Firm Billing", timesUsed: 52 },
          { address: "invoices@partner-firrn.com", displayName: "Accounts Payable", timesUsed: 37 },
        ],
        techniques: ["bec-invoice-fraud", "attachment-malware", "reply-chain-hijacking"],
        sampleSubjects: [
          "RE: Outstanding Invoice #INV-2847 - Payment Overdue",
          "Updated Banking Details - Please Process",
          "Fw: Signed Contract - Final Version Attached",
        ],
      },
      {
        id: 3,
        name: "IT Support Impersonation",
        status: "monitoring",
        severity: "medium",
        firstSeen: new Date(now - 86400000 * 14).toISOString(),
        lastActivity: new Date(now - 86400000 * 3).toISOString(),
        targetedUsers: 8,
        emailsBlocked: 34,
        emailsDelivered: 0,
        clickRate: 0,
        lookalikedomains: [
          { domain: "corp-itsupport.net", registeredDate: new Date(now - 86400000 * 20).toISOString(), registrar: "Tucows", hosting: "Hetzner", sslIssued: false, status: "parked" },
        ],
        spoofedSenders: [
          { address: "helpdesk@corp-itsupport.net", displayName: "IT Help Desk", timesUsed: 34 },
        ],
        techniques: ["credential-harvesting", "fake-password-reset", "mfa-fatigue"],
        sampleSubjects: [
          "Your password expires in 24 hours - Reset Now",
          "Microsoft 365 Account Verification Required",
          "VPN Access Update - Action Needed",
        ],
      },
      {
        id: 4,
        name: "Executive Whaling Attack",
        status: "neutralized",
        severity: "critical",
        firstSeen: new Date(now - 86400000 * 30).toISOString(),
        lastActivity: new Date(now - 86400000 * 10).toISOString(),
        targetedUsers: 3,
        emailsBlocked: 18,
        emailsDelivered: 0,
        clickRate: 0,
        lookalikedomains: [
          { domain: "corp-board.com", registeredDate: new Date(now - 86400000 * 35).toISOString(), registrar: "Porkbun", hosting: "Vultr", sslIssued: true, status: "suspended" },
          { domain: "corp-lega1.com", registeredDate: new Date(now - 86400000 * 33).toISOString(), registrar: "GoDaddy", hosting: "AWS", sslIssued: true, status: "suspended" },
        ],
        spoofedSenders: [
          { address: "chairman@corp-board.com", displayName: "Board Chairman", timesUsed: 12 },
          { address: "counsel@corp-lega1.com", displayName: "General Counsel", timesUsed: 6 },
        ],
        techniques: ["spear-phishing", "ceo-fraud", "wire-transfer-request", "urgency-social-engineering"],
        sampleSubjects: [
          "Confidential: Urgent Wire Transfer Required",
          "Board Resolution - Immediate Action",
          "Legal Matter - Do Not Forward",
        ],
      },
      {
        id: 5,
        name: "Cloud Storage Credential Theft",
        status: "active",
        severity: "high",
        firstSeen: new Date(now - 86400000 * 4).toISOString(),
        lastActivity: new Date(now - 7200000).toISOString(),
        targetedUsers: 23,
        emailsBlocked: 145,
        emailsDelivered: 2,
        clickRate: 0.03,
        lookalikedomains: [
          { domain: "sharepoint-corp.cloud", registeredDate: new Date(now - 86400000 * 6).toISOString(), registrar: "Namecheap", hosting: "Cloudflare", sslIssued: true, status: "active" },
          { domain: "onedrive-corp.cloud", registeredDate: new Date(now - 86400000 * 6).toISOString(), registrar: "Namecheap", hosting: "Cloudflare", sslIssued: true, status: "active" },
        ],
        spoofedSenders: [
          { address: "noreply@sharepoint-corp.cloud", displayName: "SharePoint Notification", timesUsed: 87 },
          { address: "sharing@onedrive-corp.cloud", displayName: "OneDrive File Share", timesUsed: 58 },
        ],
        techniques: ["credential-harvesting", "oauth-consent-phishing", "fake-file-share", "branded-phishing-kit"],
        sampleSubjects: [
          "Someone shared a document with you",
          "You have new files in your OneDrive",
          "Action required: Review shared folder access",
        ],
      },
    ];

    const totalCampaigns = campaigns.length;
    const activeCampaigns = campaigns.filter((c) => c.status === "active").length;
    const totalBlocked = campaigns.reduce((s, c) => s + c.emailsBlocked, 0);
    const totalLookalikes = campaigns.reduce((s, c) => s + c.lookalikedomains.length, 0);

    res.json({
      campaigns,
      summary: { totalCampaigns, activeCampaigns, totalBlocked, totalLookalikes },
    });
  } catch (err: any) {
    console.error("[email-security] GET /phishing-campaigns failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve phishing campaign data." });
  }
});

export default router;

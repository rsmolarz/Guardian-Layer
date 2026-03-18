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
  try {
    const now = Date.now();
    const incidents = [
      {
        id: "LSK-001",
        reportedAt: new Date(now - 86400000 * 7).toISOString(),
        reportedBy: "Lisa Wang",
        email: "l.wang@guardianlayer.io",
        department: "Finance",
        deviceSerial: "YK5-REVOKED-0042",
        deviceModel: "YubiKey 5 NFC",
        incidentType: "stolen",
        status: "revoked",
        description: "Key stolen during business trip to London. Last seen at Heathrow Airport terminal 5. Discovered missing upon arrival at hotel.",
        location: "London Heathrow Airport, UK",
        discoveredAt: new Date(now - 86400000 * 7 - 3600000).toISOString(),
        revokedAt: new Date(now - 86400000 * 7 + 300000).toISOString(),
        revokedBy: "Sarah Chen (CISO)",
        timeline: [
          { time: new Date(now - 86400000 * 7 - 3600000).toISOString(), event: "Key last used successfully — Heathrow WiFi portal auth", actor: "Lisa Wang" },
          { time: new Date(now - 86400000 * 7).toISOString(), event: "Incident reported via security hotline", actor: "Lisa Wang" },
          { time: new Date(now - 86400000 * 7 + 300000).toISOString(), event: "Key revoked — all active sessions terminated", actor: "Sarah Chen (CISO)" },
          { time: new Date(now - 86400000 * 7 + 600000).toISOString(), event: "Security team alerted — SOC ticket #SOC-2026-0891 created", actor: "System" },
          { time: new Date(now - 86400000 * 7 + 900000).toISOString(), event: "Re-enrollment workflow initiated — replacement key ENR-002 approved", actor: "Sarah Chen (CISO)" },
          { time: new Date(now - 86400000 * 6).toISOString(), event: "47 brute force attempts detected from Moscow IP (185.220.101.34)", actor: "IDS Alert" },
          { time: new Date(now - 86400000 * 6 + 1800000).toISOString(), event: "Source IP blocked at firewall — rule FW-BLOCK-0042 created", actor: "System" },
        ],
        securityAlerts: [
          { type: "soc_ticket", id: "SOC-2026-0891", status: "resolved" },
          { type: "email_alert", recipients: ["ciso@guardianlayer.io", "soc@guardianlayer.io", "it-security@guardianlayer.io"], sentAt: new Date(now - 86400000 * 7 + 600000).toISOString() },
          { type: "slack_alert", channel: "#security-incidents", sentAt: new Date(now - 86400000 * 7 + 600000).toISOString() },
        ],
        reEnrollment: { status: "completed", newKeySerial: "YK5-NEW-0098", enrollmentId: "ENR-002", approvedBy: "Sarah Chen (CISO)", shippedAt: new Date(now - 86400000 * 5).toISOString(), activatedAt: new Date(now - 86400000 * 2).toISOString() },
        postIncidentActions: ["All sessions using revoked key terminated", "Password reset enforced for associated accounts", "Increased monitoring on Lisa Wang's accounts for 30 days", "Firewall rule created to block attacker IP range"],
        severity: "critical",
      },
      {
        id: "LSK-002",
        reportedAt: new Date(now - 86400000 * 45).toISOString(),
        reportedBy: "Tom Richards",
        email: "t.richards@guardianlayer.io",
        department: "HR",
        deviceSerial: "YK5-51928374",
        deviceModel: "YubiKey 5 NFC",
        incidentType: "lost",
        status: "suspended",
        description: "Key possibly lost — last known location was desk drawer in HR office. Key may be in office but cannot be located after desk reorganization.",
        location: "HQ — HR Department, Floor 4",
        discoveredAt: new Date(now - 86400000 * 45).toISOString(),
        revokedAt: new Date(now - 86400000 * 45 + 1800000).toISOString(),
        revokedBy: "IT Security (auto-policy)",
        timeline: [
          { time: new Date(now - 86400000 * 45).toISOString(), event: "Key reported as possibly lost via IT helpdesk ticket #HD-4521", actor: "Tom Richards" },
          { time: new Date(now - 86400000 * 45 + 1800000).toISOString(), event: "Key suspended per lost-key policy (not fully revoked — recovery possible)", actor: "IT Security" },
          { time: new Date(now - 86400000 * 45 + 3600000).toISOString(), event: "Security team notified — low severity (internal loss, no external exposure)", actor: "System" },
          { time: new Date(now - 86400000 * 30).toISOString(), event: "15-day recovery window expired — escalated to full investigation", actor: "System" },
        ],
        securityAlerts: [
          { type: "soc_ticket", id: "SOC-2026-0847", status: "open" },
          { type: "email_alert", recipients: ["it-security@guardianlayer.io"], sentAt: new Date(now - 86400000 * 45 + 3600000).toISOString() },
        ],
        reEnrollment: { status: "pending", newKeySerial: null, enrollmentId: "ENR-007", approvedBy: null, shippedAt: null, activatedAt: null },
        postIncidentActions: ["Key suspended (not revoked — physical search ongoing)", "Temporary TOTP fallback enabled for Tom Richards", "Physical search of HR department scheduled"],
        severity: "medium",
      },
      {
        id: "LSK-003",
        reportedAt: new Date(now - 86400000 * 120).toISOString(),
        reportedBy: "David Kim",
        email: "d.kim@guardianlayer.io",
        department: "Engineering",
        deviceSerial: "YK5-DECOM-0019",
        deviceModel: "YubiKey 5C",
        incidentType: "damaged",
        status: "revoked",
        description: "Key physically damaged — USB-C connector bent after being stepped on. Key no longer recognized by any device.",
        location: "Home Office — Remote",
        discoveredAt: new Date(now - 86400000 * 120).toISOString(),
        revokedAt: new Date(now - 86400000 * 120 + 7200000).toISOString(),
        revokedBy: "IT Security",
        timeline: [
          { time: new Date(now - 86400000 * 120).toISOString(), event: "Damage reported via IT helpdesk — photo evidence attached", actor: "David Kim" },
          { time: new Date(now - 86400000 * 120 + 7200000).toISOString(), event: "Key revoked and marked for physical destruction", actor: "IT Security" },
          { time: new Date(now - 86400000 * 118).toISOString(), event: "Replacement key shipped — standard priority", actor: "System" },
          { time: new Date(now - 86400000 * 115).toISOString(), event: "Replacement key activated — incident closed", actor: "David Kim" },
        ],
        securityAlerts: [
          { type: "soc_ticket", id: "SOC-2026-0712", status: "resolved" },
        ],
        reEnrollment: { status: "completed", newKeySerial: "YK5C-NEW-0077", enrollmentId: "ENR-REPL-019", approvedBy: "James Mitchell (VP Eng)", shippedAt: new Date(now - 86400000 * 118).toISOString(), activatedAt: new Date(now - 86400000 * 115).toISOString() },
        postIncidentActions: ["Damaged key collected for secure physical destruction", "Replacement key provisioned and activated", "No security exposure — key was physically inoperable"],
        severity: "low",
      },
      {
        id: "LSK-004",
        reportedAt: new Date(now - 3600000 * 2).toISOString(),
        reportedBy: "Anita Kumar",
        email: "a.kumar@guardianlayer.io",
        department: "Engineering",
        deviceSerial: "YK5-47283900",
        deviceModel: "YubiKey 5 NFC",
        incidentType: "stolen",
        status: "investigating",
        description: "Key stolen from laptop bag during transit on Mumbai local train. Bag was briefly unattended. Multiple personal items also stolen.",
        location: "Mumbai, IN — Public Transit",
        discoveredAt: new Date(now - 3600000 * 3).toISOString(),
        revokedAt: new Date(now - 3600000 * 2 + 180000).toISOString(),
        revokedBy: "System (auto-revoke on theft report)",
        timeline: [
          { time: new Date(now - 3600000 * 3).toISOString(), event: "Theft discovered — laptop bag stolen on Mumbai local train", actor: "Anita Kumar" },
          { time: new Date(now - 3600000 * 2).toISOString(), event: "Incident reported via emergency security hotline", actor: "Anita Kumar" },
          { time: new Date(now - 3600000 * 2 + 180000).toISOString(), event: "Key auto-revoked — theft classification triggers immediate revocation", actor: "System" },
          { time: new Date(now - 3600000 * 2 + 300000).toISOString(), event: "All active sessions terminated — VPN disconnected, SSO tokens invalidated", actor: "System" },
          { time: new Date(now - 3600000 * 2 + 600000).toISOString(), event: "SOC team investigating — correlating with geo-anomaly from VPN logs", actor: "SOC Team" },
        ],
        securityAlerts: [
          { type: "soc_ticket", id: "SOC-2026-0923", status: "investigating" },
          { type: "email_alert", recipients: ["ciso@guardianlayer.io", "soc@guardianlayer.io", "it-security@guardianlayer.io", "legal@guardianlayer.io"], sentAt: new Date(now - 3600000 * 2 + 300000).toISOString() },
          { type: "slack_alert", channel: "#security-incidents", sentAt: new Date(now - 3600000 * 2 + 300000).toISOString() },
          { type: "pagerduty", incidentId: "PD-9821", sentAt: new Date(now - 3600000 * 2 + 300000).toISOString() },
        ],
        reEnrollment: { status: "initiated", newKeySerial: null, enrollmentId: "ENR-EMRG-004", approvedBy: "Sarah Chen (CISO)", shippedAt: null, activatedAt: null },
        postIncidentActions: ["Key immediately revoked", "All sessions terminated", "Password reset enforced", "Geo-anomaly correlation in progress", "Police report filed — case #MUM-2026-44891"],
        severity: "critical",
      },
    ];

    const incidentSummary = {
      totalIncidents: incidents.length,
      activeInvestigations: incidents.filter((i) => i.status === "investigating").length,
      revokedKeys: incidents.filter((i) => i.status === "revoked").length,
      suspendedKeys: incidents.filter((i) => i.status === "suspended").length,
      reEnrollmentsPending: incidents.filter((i) => i.reEnrollment.status === "pending" || i.reEnrollment.status === "initiated").length,
      criticalIncidents: incidents.filter((i) => i.severity === "critical").length,
    };

    res.json({ incidents, summary: incidentSummary });
  } catch (err: any) {
    console.error("[yubikey] GET /lost-stolen failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve lost/stolen key data." });
  }
});

router.get("/yubikey/mfa-compliance", async (_req, res): Promise<void> => {
  try {
    const users = [
      { id: "USR-001", name: "Priya Sharma", email: "p.sharma@guardianlayer.io", department: "Engineering", role: "Senior DevOps Engineer", mfaMethod: "hardware_key", deviceSerial: "YK-BIO-62837461", deviceModel: "YubiKey Bio", lastAuth: new Date(Date.now() - 3600000).toISOString(), compliant: true, complianceScore: 100, riskLevel: "low", enrolledAt: new Date(Date.now() - 86400000 * 180).toISOString(), protocols: ["FIDO2", "WebAuthn"], backupMethod: "recovery_codes" },
      { id: "USR-002", name: "James Mitchell", email: "j.mitchell@guardianlayer.io", department: "Engineering", role: "VP Engineering", mfaMethod: "hardware_key", deviceSerial: "YK5-18294731", deviceModel: "YubiKey 5 NFC", lastAuth: new Date(Date.now() - 7200000).toISOString(), compliant: true, complianceScore: 100, riskLevel: "low", enrolledAt: new Date(Date.now() - 86400000 * 365).toISOString(), protocols: ["FIDO2", "PIV"], backupMethod: "hardware_key_backup" },
      { id: "USR-003", name: "Marcus Johnson", email: "m.johnson@guardianlayer.io", department: "Executive", role: "CTO", mfaMethod: "hardware_key", deviceSerial: "YK5C-84019273", deviceModel: "YubiKey 5C NFC", lastAuth: new Date(Date.now() - 14400000).toISOString(), compliant: true, complianceScore: 100, riskLevel: "low", enrolledAt: new Date(Date.now() - 86400000 * 400).toISOString(), protocols: ["FIDO2", "PIV", "OpenPGP"], backupMethod: "hardware_key_backup" },
      { id: "USR-004", name: "Sarah Chen", email: "s.chen@guardianlayer.io", department: "Executive", role: "CISO", mfaMethod: "hardware_key", deviceSerial: "YK5-28371642", deviceModel: "YubiKey 5 NFC", lastAuth: new Date(Date.now() - 28800000).toISOString(), compliant: true, complianceScore: 100, riskLevel: "low", enrolledAt: new Date(Date.now() - 86400000 * 500).toISOString(), protocols: ["FIDO2", "PIV"], backupMethod: "recovery_codes" },
      { id: "USR-005", name: "Maria Rodriguez", email: "m.rodriguez@guardianlayer.io", department: "Finance", role: "Financial Controller", mfaMethod: "hardware_key", deviceSerial: "YK5-39182734", deviceModel: "YubiKey 5 NFC", lastAuth: new Date(Date.now() - 86400000).toISOString(), compliant: true, complianceScore: 100, riskLevel: "low", enrolledAt: new Date(Date.now() - 86400000 * 90).toISOString(), protocols: ["FIDO2"], backupMethod: "totp_backup" },
      { id: "USR-006", name: "Alex Thompson", email: "a.thompson@guardianlayer.io", department: "Sales", role: "Account Executive", mfaMethod: "totp", deviceSerial: null, deviceModel: null, lastAuth: new Date(Date.now() - 43200000).toISOString(), compliant: false, complianceScore: 60, riskLevel: "medium", enrolledAt: new Date(Date.now() - 86400000 * 200).toISOString(), protocols: ["TOTP"], backupMethod: "sms_backup", nonComplianceReason: "TOTP-only — hardware key required for SOC 2 compliance. Enrollment reminder sent 3 times." },
      { id: "USR-007", name: "Lisa Wang", email: "l.wang@guardianlayer.io", department: "Finance", role: "Senior Accountant", mfaMethod: "totp", deviceSerial: null, deviceModel: null, lastAuth: new Date(Date.now() - 86400000 * 2).toISOString(), compliant: false, complianceScore: 55, riskLevel: "medium", enrolledAt: new Date(Date.now() - 86400000 * 150).toISOString(), protocols: ["TOTP"], backupMethod: "email_backup", nonComplianceReason: "TOTP-only — previous YubiKey (YK5-REVOKED-0042) was stolen, replacement pending re-enrollment." },
      { id: "USR-008", name: "Tom Richards", email: "t.richards@guardianlayer.io", department: "HR", role: "HR Manager", mfaMethod: "sms", deviceSerial: null, deviceModel: null, lastAuth: new Date(Date.now() - 86400000 * 3).toISOString(), compliant: false, complianceScore: 25, riskLevel: "high", enrolledAt: new Date(Date.now() - 86400000 * 300).toISOString(), protocols: ["SMS OTP"], backupMethod: "none", nonComplianceReason: "SMS-only MFA — highly vulnerable to SIM swap attacks. YubiKey suspended (LSK-002), TOTP fallback active but SMS still primary." },
      { id: "USR-009", name: "David Kim", email: "d.kim@guardianlayer.io", department: "Engineering", role: "Backend Developer", mfaMethod: "hardware_key", deviceSerial: "YK5C-NEW-0077", deviceModel: "YubiKey 5C", lastAuth: new Date(Date.now() - 3600000 * 6).toISOString(), compliant: true, complianceScore: 95, riskLevel: "low", enrolledAt: new Date(Date.now() - 86400000 * 5).toISOString(), protocols: ["FIDO2"], backupMethod: "recovery_codes" },
      { id: "USR-010", name: "Anita Kumar", email: "a.kumar@guardianlayer.io", department: "Engineering", role: "Frontend Developer", mfaMethod: "none", deviceSerial: null, deviceModel: null, lastAuth: new Date(Date.now() - 86400000 * 10).toISOString(), compliant: false, complianceScore: 0, riskLevel: "critical", enrolledAt: null, protocols: [], backupMethod: "none", nonComplianceReason: "No MFA configured — YubiKey stolen (LSK-004, active investigation), all auth methods disabled pending security clearance." },
      { id: "USR-011", name: "Robert Chang", email: "r.chang@guardianlayer.io", department: "Legal", role: "General Counsel", mfaMethod: "totp", deviceSerial: null, deviceModel: null, lastAuth: new Date(Date.now() - 86400000 * 1).toISOString(), compliant: false, complianceScore: 50, riskLevel: "medium", enrolledAt: new Date(Date.now() - 86400000 * 60).toISOString(), protocols: ["TOTP"], backupMethod: "recovery_codes", nonComplianceReason: "TOTP-only — hardware key enrollment requested but not yet completed. Handles privileged legal documents." },
      { id: "USR-012", name: "Emily Foster", email: "e.foster@guardianlayer.io", department: "Marketing", role: "Marketing Director", mfaMethod: "sms", deviceSerial: null, deviceModel: null, lastAuth: new Date(Date.now() - 86400000 * 5).toISOString(), compliant: false, complianceScore: 20, riskLevel: "high", enrolledAt: new Date(Date.now() - 86400000 * 250).toISOString(), protocols: ["SMS OTP"], backupMethod: "email_backup", nonComplianceReason: "SMS-only MFA — multiple enrollment reminders ignored. Access to brand and social media accounts creates phishing risk." },
      { id: "USR-013", name: "svc-ci-pipeline", email: "svc-ci@guardianlayer.io", department: "Engineering", role: "Service Account", mfaMethod: "hardware_key", deviceSerial: "YK-HSM-001", deviceModel: "YubiKey HSM 2", lastAuth: new Date(Date.now() - 600000).toISOString(), compliant: true, complianceScore: 100, riskLevel: "low", enrolledAt: new Date(Date.now() - 86400000 * 730).toISOString(), protocols: ["PKCS#11", "PIV"], backupMethod: "hsm_cluster_backup" },
      { id: "USR-014", name: "Nathan Okafor", email: "n.okafor@guardianlayer.io", department: "Support", role: "Support Engineer", mfaMethod: "totp", deviceSerial: null, deviceModel: null, lastAuth: new Date(Date.now() - 86400000 * 4).toISOString(), compliant: false, complianceScore: 45, riskLevel: "medium", enrolledAt: new Date(Date.now() - 86400000 * 120).toISOString(), protocols: ["TOTP"], backupMethod: "sms_backup", nonComplianceReason: "TOTP with SMS backup — has access to customer PII through support tickets. Hardware key enrollment overdue." },
      { id: "USR-015", name: "Jessica Park", email: "j.park@guardianlayer.io", department: "Engineering", role: "Security Engineer", mfaMethod: "hardware_key", deviceSerial: "YK5C-93817264", deviceModel: "YubiKey 5C NFC", lastAuth: new Date(Date.now() - 1800000).toISOString(), compliant: true, complianceScore: 100, riskLevel: "low", enrolledAt: new Date(Date.now() - 86400000 * 220).toISOString(), protocols: ["FIDO2", "PIV", "OpenPGP"], backupMethod: "hardware_key_backup" },
    ];

    const summary = {
      totalUsers: users.length,
      hardwareKey: users.filter((u) => u.mfaMethod === "hardware_key").length,
      totp: users.filter((u) => u.mfaMethod === "totp").length,
      sms: users.filter((u) => u.mfaMethod === "sms").length,
      none: users.filter((u) => u.mfaMethod === "none").length,
      compliant: users.filter((u) => u.compliant).length,
      nonCompliant: users.filter((u) => !u.compliant).length,
      avgComplianceScore: Math.round(users.reduce((a, u) => a + u.complianceScore, 0) / users.length),
      criticalRisk: users.filter((u) => u.riskLevel === "critical").length,
      highRisk: users.filter((u) => u.riskLevel === "high").length,
    };

    res.json({ users, summary });
  } catch (err: any) {
    console.error("[yubikey] GET /mfa-compliance failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve MFA compliance data." });
  }
});

router.get("/yubikey/audit-log", async (_req, res): Promise<void> => {
  try {
    const now = Date.now();
    const events = [
      {
        id: "AUD-001",
        timestamp: new Date(now - 120000).toISOString(),
        user: "Priya Sharma",
        email: "p.sharma@guardianlayer.io",
        department: "DevOps",
        deviceSerial: "YK-BIO-62837461",
        deviceModel: "YubiKey Bio",
        eventType: "auth_success",
        protocol: "FIDO2",
        application: "AWS Console",
        ipAddress: "10.0.10.5",
        location: "Office LAN — CI Runner Pool",
        country: "US",
        userAgent: "Chrome/122.0 (macOS 14.3)",
        sessionId: "sess-a8f2e1",
        authMethod: "biometric_touch",
        responseTime: 245,
        challenge: "webauthn_assertion",
        relayParty: "aws.amazon.com",
      },
      {
        id: "AUD-002",
        timestamp: new Date(now - 300000).toISOString(),
        user: "James Mitchell",
        email: "j.mitchell@guardianlayer.io",
        department: "Engineering",
        deviceSerial: "YK5-18294731",
        deviceModel: "YubiKey 5 NFC",
        eventType: "auth_success",
        protocol: "FIDO2",
        application: "GitHub SSO",
        ipAddress: "10.0.1.45",
        location: "Office LAN — Engineering Floor",
        country: "US",
        userAgent: "Firefox/123.0 (Ubuntu 22.04)",
        sessionId: "sess-b3c4d2",
        authMethod: "touch",
        responseTime: 312,
        challenge: "webauthn_assertion",
        relayParty: "github.com",
      },
      {
        id: "AUD-003",
        timestamp: new Date(now - 600000).toISOString(),
        user: "Marcus Johnson",
        email: "m.johnson@guardianlayer.io",
        department: "Executive",
        deviceSerial: "YK5C-84019273",
        deviceModel: "YubiKey 5C Nano",
        eventType: "auth_success",
        protocol: "FIDO2",
        application: "Microsoft 365",
        ipAddress: "10.0.7.15",
        location: "Office LAN — Executive Suite",
        country: "US",
        userAgent: "Edge/122.0 (Windows 11)",
        sessionId: "sess-d5e6f3",
        authMethod: "touch",
        responseTime: 189,
        challenge: "webauthn_assertion",
        relayParty: "login.microsoft.com",
      },
      {
        id: "AUD-004",
        timestamp: new Date(now - 900000).toISOString(),
        user: "svc-ci-pipeline",
        email: null,
        department: "Infrastructure",
        deviceSerial: "YK-HSM-001",
        deviceModel: "YubiHSM 2",
        eventType: "auth_success",
        protocol: "PKCS#11",
        application: "CI/CD Code Signing",
        ipAddress: "10.0.10.5",
        location: "CI Runner Pool",
        country: "US",
        userAgent: "signtool/4.2.1 (Linux)",
        sessionId: "sess-hsm-7291",
        authMethod: "hmac_challenge",
        responseTime: 18,
        challenge: "pkcs11_sign",
        relayParty: "internal-ci",
      },
      {
        id: "AUD-005",
        timestamp: new Date(now - 1800000).toISOString(),
        user: "James Mitchell",
        email: "j.mitchell@guardianlayer.io",
        department: "Engineering",
        deviceSerial: "YK5-18294731",
        deviceModel: "YubiKey 5 NFC",
        eventType: "auth_failure",
        protocol: "FIDO2",
        application: "GitLab CI",
        ipAddress: "45.33.32.156",
        location: "External — New York, US",
        country: "US",
        userAgent: "Chrome/122.0 (macOS 14.3)",
        sessionId: "sess-e7f8a4",
        authMethod: "touch",
        responseTime: 0,
        challenge: "webauthn_assertion",
        relayParty: "gitlab.guardianlayer.io",
        failureReason: "HMAC mismatch — OTP validation failed",
        riskFlag: "counter_desync",
      },
      {
        id: "AUD-006",
        timestamp: new Date(now - 2400000).toISOString(),
        user: "Sarah Chen",
        email: "s.chen@guardianlayer.io",
        department: "Executive",
        deviceSerial: "YK5-28371642",
        deviceModel: "YubiKey 5C",
        eventType: "auth_success",
        protocol: "PIV",
        application: "Corporate VPN",
        ipAddress: "10.0.7.12",
        location: "Office LAN — Executive Suite",
        country: "US",
        userAgent: "OpenVPN/2.6.8 (macOS)",
        sessionId: "sess-vpn-c912",
        authMethod: "piv_certificate",
        responseTime: 423,
        challenge: "piv_auth",
        relayParty: "vpn.guardianlayer.io",
      },
      {
        id: "AUD-007",
        timestamp: new Date(now - 3600000).toISOString(),
        user: "Unknown Actor",
        email: null,
        department: null,
        deviceSerial: "YK5-REVOKED-0042",
        deviceModel: "YubiKey 5 NFC",
        eventType: "auth_failure",
        protocol: "FIDO2",
        application: "Corporate SSO Portal",
        ipAddress: "185.220.101.34",
        location: "External — Moscow, RU",
        country: "RU",
        userAgent: "Python-Requests/2.31.0",
        sessionId: "sess-blocked-001",
        authMethod: "automated",
        responseTime: 0,
        challenge: "webauthn_assertion",
        relayParty: "sso.guardianlayer.io",
        failureReason: "Key revoked — device YK5-REVOKED-0042 was reported lost/stolen",
        riskFlag: "brute_force",
      },
      {
        id: "AUD-008",
        timestamp: new Date(now - 5400000).toISOString(),
        user: "Alex Thompson",
        email: "a.thompson@guardianlayer.io",
        department: "Sales",
        deviceSerial: "YK5-47283916",
        deviceModel: "YubiKey 5Ci",
        eventType: "auth_failure",
        protocol: "U2F",
        application: "Salesforce SSO",
        ipAddress: "172.16.0.55",
        location: "VPN — Remote",
        country: "US",
        userAgent: "Safari/17.3 (iOS 17.3)",
        sessionId: "sess-g1h2i5",
        authMethod: "lightning",
        responseTime: 0,
        challenge: "u2f_register",
        relayParty: "salesforce.com",
        failureReason: "Protocol mismatch — client requested U2F but key configured for FIDO2 only",
        riskFlag: "config_error",
      },
      {
        id: "AUD-009",
        timestamp: new Date(now - 7200000).toISOString(),
        user: "Sarah Chen",
        email: "s.chen@guardianlayer.io",
        department: "Executive",
        deviceSerial: "YK5-28371642",
        deviceModel: "YubiKey 5C",
        eventType: "auth_failure",
        protocol: "OTP",
        application: "Corporate VPN",
        ipAddress: "10.0.7.12",
        location: "Office LAN — Executive Suite",
        country: "US",
        userAgent: "OpenVPN/2.6.8 (macOS)",
        sessionId: "sess-vpn-c890",
        authMethod: "otp_slot2",
        responseTime: 0,
        challenge: "yubico_otp",
        relayParty: "vpn.guardianlayer.io",
        failureReason: "Wrong slot — user triggered slot 2 (static password) instead of slot 1 (OTP)",
        riskFlag: "user_error",
      },
      {
        id: "AUD-010",
        timestamp: new Date(now - 10800000).toISOString(),
        user: "Maria Rodriguez",
        email: "m.rodriguez@guardianlayer.io",
        department: "Finance",
        deviceSerial: "YK5-39182734",
        deviceModel: "YubiKey 5 NFC",
        eventType: "auth_success",
        protocol: "FIDO2",
        application: "Accounting Portal",
        ipAddress: "172.16.0.88",
        location: "Remote VPN",
        country: "US",
        userAgent: "Chrome/122.0 (Windows 11)",
        sessionId: "sess-j3k4l6",
        authMethod: "nfc_tap",
        responseTime: 534,
        challenge: "webauthn_assertion",
        relayParty: "accounting.guardianlayer.io",
      },
      {
        id: "AUD-011",
        timestamp: new Date(now - 14400000).toISOString(),
        user: "Priya Sharma",
        email: "p.sharma@guardianlayer.io",
        department: "DevOps",
        deviceSerial: "YK-BIO-62837461",
        deviceModel: "YubiKey Bio",
        eventType: "key_enrolled",
        protocol: "FIDO2",
        application: "Device Management Portal",
        ipAddress: "10.0.10.5",
        location: "Office LAN — DevOps",
        country: "US",
        userAgent: "Chrome/122.0 (macOS 14.3)",
        sessionId: "sess-enroll-001",
        authMethod: "biometric_enrollment",
        responseTime: 2841,
        challenge: "webauthn_create",
        relayParty: "admin.guardianlayer.io",
      },
      {
        id: "AUD-012",
        timestamp: new Date(now - 21600000).toISOString(),
        user: "Tom Richards",
        email: "t.richards@guardianlayer.io",
        department: "HR",
        deviceSerial: "YK5-51928374",
        deviceModel: "YubiKey 5 NFC",
        eventType: "key_revoked",
        protocol: "N/A",
        application: "Device Management Portal",
        ipAddress: "10.0.7.1",
        location: "Office LAN — IT Admin",
        country: "US",
        userAgent: "Chrome/122.0 (Windows 11)",
        sessionId: "sess-admin-revoke",
        authMethod: "admin_action",
        responseTime: 0,
        challenge: "admin_revoke",
        relayParty: "admin.guardianlayer.io",
      },
    ];

    const auditSummary = {
      totalEvents: events.length,
      successCount: events.filter((e) => e.eventType === "auth_success").length,
      failureCount: events.filter((e) => e.eventType === "auth_failure").length,
      enrollments: events.filter((e) => e.eventType === "key_enrolled").length,
      revocations: events.filter((e) => e.eventType === "key_revoked").length,
      uniqueUsers: [...new Set(events.map((e) => e.user))].length,
      uniqueDevices: [...new Set(events.map((e) => e.deviceSerial))].length,
      avgResponseTime: Math.round(events.filter((e) => e.responseTime > 0).reduce((s, e) => s + e.responseTime, 0) / events.filter((e) => e.responseTime > 0).length),
      externalAttempts: events.filter((e) => e.location.startsWith("External")).length,
      bruteForceDetected: events.filter((e) => (e as any).riskFlag === "brute_force").length,
    };

    res.json({ events, summary: auditSummary });
  } catch (err: any) {
    console.error("[yubikey] GET /audit-log failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve audit log." });
  }
});

router.get("/yubikey/fleet", async (_req, res): Promise<void> => {
  try {
    const now = Date.now();
    const fleet = [
      {
        id: 1,
        serialNumber: "YK5-18294731",
        model: "YubiKey 5 NFC",
        formFactor: "USB-A + NFC",
        firmwareVersion: "5.4.3",
        fipsCertified: true,
        interfaces: ["USB-A", "NFC"],
        protocols: ["FIDO2", "U2F", "OTP", "PIV", "OpenPGP"],
        assignedUser: "James Mitchell",
        email: "j.mitchell@guardianlayer.io",
        department: "Engineering",
        status: "active",
        registeredAt: new Date(now - 86400000 * 365).toISOString(),
        lastUsed: new Date(now - 1800000).toISOString(),
        lastUsedApp: "GitHub SSO",
        lastUsedLocation: "Office LAN — 10.0.1.45",
        warrantyExpiry: new Date(now + 86400000 * 365).toISOString(),
        attestationStatus: "verified",
        attestationDate: new Date(now - 86400000 * 30).toISOString(),
        totalAuths: 4821,
        failedAuths: 14,
        uptime: "365 days",
        notes: "Primary key — backup key YK5-BACKUP-001 also registered",
      },
      {
        id: 2,
        serialNumber: "YK5-28371642",
        model: "YubiKey 5C",
        formFactor: "USB-C",
        firmwareVersion: "5.4.3",
        fipsCertified: true,
        interfaces: ["USB-C"],
        protocols: ["FIDO2", "U2F", "OTP", "PIV"],
        assignedUser: "Sarah Chen",
        email: "s.chen@guardianlayer.io",
        department: "Executive",
        status: "active",
        registeredAt: new Date(now - 86400000 * 300).toISOString(),
        lastUsed: new Date(now - 7200000).toISOString(),
        lastUsedApp: "Corporate VPN",
        lastUsedLocation: "Office LAN — 10.0.7.12",
        warrantyExpiry: new Date(now + 86400000 * 430).toISOString(),
        attestationStatus: "verified",
        attestationDate: new Date(now - 86400000 * 15).toISOString(),
        totalAuths: 3201,
        failedAuths: 3,
        uptime: "300 days",
        notes: "CISO — dual key policy compliant (backup: YK5-28371643)",
      },
      {
        id: 3,
        serialNumber: "YK5-39182734",
        model: "YubiKey 5 NFC",
        formFactor: "USB-A + NFC",
        firmwareVersion: "5.2.7",
        fipsCertified: false,
        interfaces: ["USB-A", "NFC"],
        protocols: ["FIDO2", "U2F", "OTP"],
        assignedUser: "Maria Rodriguez",
        email: "m.rodriguez@guardianlayer.io",
        department: "Finance",
        status: "active",
        registeredAt: new Date(now - 86400000 * 540).toISOString(),
        lastUsed: new Date(now - 86400000 * 3).toISOString(),
        lastUsedApp: "Accounting Portal",
        lastUsedLocation: "Remote VPN — 172.16.0.88",
        warrantyExpiry: new Date(now - 86400000 * 90).toISOString(),
        attestationStatus: "expired",
        attestationDate: new Date(now - 86400000 * 400).toISOString(),
        totalAuths: 1872,
        failedAuths: 8,
        uptime: "540 days",
        notes: "FW 5.2.7 — flagged for upgrade to 5.4+ by Q2 2026. Warranty expired.",
      },
      {
        id: 4,
        serialNumber: "YK5-47283916",
        model: "YubiKey 5Ci",
        formFactor: "USB-C + Lightning",
        firmwareVersion: "5.4.3",
        fipsCertified: true,
        interfaces: ["USB-C", "Lightning"],
        protocols: ["FIDO2", "U2F", "OTP", "PIV", "OpenPGP"],
        assignedUser: "Alex Thompson",
        email: "a.thompson@guardianlayer.io",
        department: "Sales",
        status: "active",
        registeredAt: new Date(now - 86400000 * 180).toISOString(),
        lastUsed: new Date(now - 5400000).toISOString(),
        lastUsedApp: "Salesforce SSO",
        lastUsedLocation: "Remote VPN — 172.16.0.55",
        warrantyExpiry: new Date(now + 86400000 * 550).toISOString(),
        attestationStatus: "verified",
        attestationDate: new Date(now - 86400000 * 60).toISOString(),
        totalAuths: 2147,
        failedAuths: 7,
        uptime: "180 days",
        notes: "Uses Lightning interface on iPhone, USB-C on laptop",
      },
      {
        id: 5,
        serialNumber: "YK5-51928374",
        model: "YubiKey 5 NFC",
        formFactor: "USB-A + NFC",
        firmwareVersion: "5.2.7",
        fipsCertified: false,
        interfaces: ["USB-A", "NFC"],
        protocols: ["U2F", "OTP"],
        assignedUser: "Tom Richards",
        email: "t.richards@guardianlayer.io",
        department: "HR",
        status: "suspended",
        registeredAt: new Date(now - 86400000 * 730).toISOString(),
        lastUsed: new Date(now - 86400000 * 45).toISOString(),
        lastUsedApp: "HR Portal",
        lastUsedLocation: "Office LAN — 10.0.3.22",
        warrantyExpiry: new Date(now - 86400000 * 365).toISOString(),
        attestationStatus: "failed",
        attestationDate: new Date(now - 86400000 * 90).toISOString(),
        totalAuths: 892,
        failedAuths: 2,
        uptime: "685 days (suspended 45 days ago)",
        notes: "Suspended — user reported key may be compromised. Awaiting re-issuance. FW 5.2.7 EOL.",
      },
      {
        id: 6,
        serialNumber: "YK-BIO-62837461",
        model: "YubiKey Bio",
        formFactor: "USB-A + Fingerprint",
        firmwareVersion: "5.6.1",
        fipsCertified: true,
        interfaces: ["USB-A", "Biometric"],
        protocols: ["FIDO2", "U2F"],
        assignedUser: "Priya Sharma",
        email: "p.sharma@guardianlayer.io",
        department: "DevOps",
        status: "active",
        registeredAt: new Date(now - 86400000 * 90).toISOString(),
        lastUsed: new Date(now - 600000).toISOString(),
        lastUsedApp: "AWS Console",
        lastUsedLocation: "Office LAN — 10.0.10.5",
        warrantyExpiry: new Date(now + 86400000 * 640).toISOString(),
        attestationStatus: "verified",
        attestationDate: new Date(now - 86400000 * 7).toISOString(),
        totalAuths: 1456,
        failedAuths: 0,
        uptime: "90 days",
        notes: "Biometric enrollment: 3 fingerprints registered. Zero failed auths.",
      },
      {
        id: 7,
        serialNumber: "YK5-73928415",
        model: "YubiKey 5 NFC",
        formFactor: "USB-A + NFC",
        firmwareVersion: "5.4.3",
        fipsCertified: true,
        interfaces: ["USB-A", "NFC"],
        protocols: ["FIDO2", "U2F", "OTP", "PIV"],
        assignedUser: null,
        email: null,
        department: null,
        status: "unassigned",
        registeredAt: new Date(now - 86400000 * 14).toISOString(),
        lastUsed: null,
        lastUsedApp: null,
        lastUsedLocation: null,
        warrantyExpiry: new Date(now + 86400000 * 716).toISOString(),
        attestationStatus: "pending",
        attestationDate: null,
        totalAuths: 0,
        failedAuths: 0,
        uptime: "N/A — never activated",
        notes: "Spare inventory — received in bulk order PO-2026-0042",
      },
      {
        id: 8,
        serialNumber: "YK5C-84019273",
        model: "YubiKey 5C Nano",
        formFactor: "USB-C Nano",
        firmwareVersion: "5.4.3",
        fipsCertified: true,
        interfaces: ["USB-C"],
        protocols: ["FIDO2", "U2F", "OTP", "PIV", "OpenPGP"],
        assignedUser: "Marcus Johnson",
        email: "m.johnson@guardianlayer.io",
        department: "Executive",
        status: "active",
        registeredAt: new Date(now - 86400000 * 200).toISOString(),
        lastUsed: new Date(now - 3600000).toISOString(),
        lastUsedApp: "Microsoft 365",
        lastUsedLocation: "Office LAN — 10.0.7.15",
        warrantyExpiry: new Date(now + 86400000 * 530).toISOString(),
        attestationStatus: "verified",
        attestationDate: new Date(now - 86400000 * 45).toISOString(),
        totalAuths: 3892,
        failedAuths: 1,
        uptime: "200 days",
        notes: "Nano form factor — semi-permanently inserted in MacBook Pro",
      },
      {
        id: 9,
        serialNumber: "YK-HSM-001",
        model: "YubiHSM 2",
        formFactor: "USB-A (HSM)",
        firmwareVersion: "2.3.1",
        fipsCertified: true,
        interfaces: ["USB-A"],
        protocols: ["PKCS#11", "YubiHSM Auth", "OpenPGP"],
        assignedUser: "svc-ci-pipeline",
        email: null,
        department: "Infrastructure",
        status: "active",
        registeredAt: new Date(now - 86400000 * 400).toISOString(),
        lastUsed: new Date(now - 300000).toISOString(),
        lastUsedApp: "CI/CD Code Signing",
        lastUsedLocation: "CI Runner Pool — 10.0.10.5",
        warrantyExpiry: new Date(now + 86400000 * 330).toISOString(),
        attestationStatus: "verified",
        attestationDate: new Date(now - 86400000 * 10).toISOString(),
        totalAuths: 187429,
        failedAuths: 23,
        uptime: "400 days",
        notes: "Hardware Security Module for CI/CD pipeline code signing. Rate limit: 60 req/min.",
      },
      {
        id: 10,
        serialNumber: "YK5-REVOKED-0042",
        model: "YubiKey 5 NFC",
        formFactor: "USB-A + NFC",
        firmwareVersion: "5.4.3",
        fipsCertified: true,
        interfaces: ["USB-A", "NFC"],
        protocols: ["FIDO2", "U2F", "OTP"],
        assignedUser: "Lisa Wang (former)",
        email: "l.wang@guardianlayer.io",
        department: "Finance",
        status: "revoked",
        registeredAt: new Date(now - 86400000 * 500).toISOString(),
        lastUsed: new Date(now - 86400000 * 7).toISOString(),
        lastUsedApp: "Unknown — post-revocation attempt",
        lastUsedLocation: "External — 185.220.101.34 (Moscow, RU)",
        warrantyExpiry: new Date(now + 86400000 * 230).toISOString(),
        attestationStatus: "revoked",
        attestationDate: null,
        totalAuths: 1204,
        failedAuths: 47,
        uptime: "493 days (revoked 7 days ago)",
        notes: "REVOKED — reported lost/stolen by Lisa Wang. 47 brute force attempts from Moscow IP post-revocation. Replacement key ENR-002 approved.",
      },
    ];

    const fleetSummary = {
      totalDevices: fleet.length,
      activeDevices: fleet.filter((d) => d.status === "active").length,
      suspendedDevices: fleet.filter((d) => d.status === "suspended").length,
      revokedDevices: fleet.filter((d) => d.status === "revoked").length,
      unassignedDevices: fleet.filter((d) => d.status === "unassigned").length,
      fipsCertified: fleet.filter((d) => d.fipsCertified).length,
      attestationExpired: fleet.filter((d) => d.attestationStatus === "expired" || d.attestationStatus === "failed").length,
      warrantyExpired: fleet.filter((d) => new Date(d.warrantyExpiry).getTime() < now).length,
      firmwareOutdated: fleet.filter((d) => d.firmwareVersion < "5.4.0").length,
      totalAuths: fleet.reduce((s, d) => s + d.totalAuths, 0),
    };

    res.json({ fleet, summary: fleetSummary });
  } catch (err: any) {
    console.error("[yubikey] GET /fleet failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve fleet data." });
  }
});

router.get("/yubikey/enrollment", async (_req, res): Promise<void> => {
  try {
    const now = Date.now();
    const requests = [
      {
        id: "ENR-001",
        user: "David Park",
        email: "d.park@guardianlayer.io",
        department: "Engineering",
        requestDate: new Date(now - 86400000 * 3).toISOString(),
        status: "pending_approval",
        keyType: "YubiKey 5 NFC",
        justification: "New hire — requires hardware MFA per security policy SOP-2024-MFA-003",
        approver: null,
        shippingAddress: "Remote — 1420 Elm St, Austin TX 78701",
        priority: "high",
      },
      {
        id: "ENR-002",
        user: "Lisa Wang",
        email: "l.wang@guardianlayer.io",
        department: "Finance",
        requestDate: new Date(now - 86400000 * 7).toISOString(),
        status: "approved",
        keyType: "YubiKey 5Ci",
        justification: "Replacement — previous key (SN: YK-0042) reported lost/stolen",
        approver: "Sarah Chen (CISO)",
        shippingAddress: "HQ — Floor 3, Desk 312",
        priority: "critical",
      },
      {
        id: "ENR-003",
        user: "Marcus Johnson",
        email: "m.johnson@guardianlayer.io",
        department: "Executive",
        requestDate: new Date(now - 86400000 * 1).toISOString(),
        status: "pending_approval",
        keyType: "YubiKey 5C Nano",
        justification: "Upgrade from YubiKey 4 — end-of-life firmware, FIDO2 not supported",
        approver: null,
        shippingAddress: "HQ — Executive Suite, Floor 7",
        priority: "medium",
      },
      {
        id: "ENR-004",
        user: "Priya Sharma",
        email: "p.sharma@guardianlayer.io",
        department: "DevOps",
        requestDate: new Date(now - 86400000 * 14).toISOString(),
        status: "shipped",
        keyType: "YubiKey 5 NFC",
        justification: "Second factor for production infrastructure access",
        approver: "James Mitchell (VP Eng)",
        shippingAddress: "Remote — 88 Queen St, Toronto ON M5H 2N2",
        trackingNumber: "1Z999AA10123456784",
        priority: "high",
      },
      {
        id: "ENR-005",
        user: "Tom Richards",
        email: "t.richards@guardianlayer.io",
        department: "Legal",
        requestDate: new Date(now - 86400000 * 21).toISOString(),
        status: "completed",
        keyType: "YubiKey 5 NFC",
        justification: "Department-wide hardware MFA rollout — phase 2",
        approver: "Sarah Chen (CISO)",
        shippingAddress: "HQ — Floor 4, Desk 401",
        activatedDate: new Date(now - 86400000 * 5).toISOString(),
        priority: "low",
      },
      {
        id: "ENR-006",
        user: "Ana Petrov",
        email: "a.petrov@guardianlayer.io",
        department: "Engineering",
        requestDate: new Date(now - 86400000 * 2).toISOString(),
        status: "rejected",
        keyType: "YubiKey Bio",
        justification: "Prefers biometric key for convenience",
        approver: "James Mitchell (VP Eng)",
        rejectionReason: "YubiKey Bio not approved for corporate use — biometric data retention policy conflict. Use YubiKey 5 NFC instead.",
        priority: "low",
      },
    ];

    const summary = {
      totalRequests: requests.length,
      pending: requests.filter((r) => r.status === "pending_approval").length,
      approved: requests.filter((r) => r.status === "approved").length,
      shipped: requests.filter((r) => r.status === "shipped").length,
      completed: requests.filter((r) => r.status === "completed").length,
      rejected: requests.filter((r) => r.status === "rejected").length,
    };

    res.json({ requests, summary });
  } catch (err: any) {
    console.error("[yubikey] GET /enrollment failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve enrollment data." });
  }
});

router.get("/yubikey/failed-auth", async (_req, res): Promise<void> => {
  try {
    const now = Date.now();
    const incidents = [
      {
        id: "FA-001",
        user: "James Mitchell",
        email: "j.mitchell@guardianlayer.io",
        department: "Engineering",
        deviceSerial: "YK-0017",
        failureCount: 14,
        timeWindow: "24h",
        firstFailure: new Date(now - 86400000).toISOString(),
        lastFailure: new Date(now - 1800000).toISOString(),
        failureReasons: [
          { reason: "HMAC mismatch", count: 8, detail: "OTP validation failed — possible cloned key or replay attack" },
          { reason: "Counter desync", count: 4, detail: "YubiKey session counter behind server counter by 12 — key may have been used on unauthorized system" },
          { reason: "Timeout", count: 2, detail: "User did not touch key within 30-second window" },
        ],
        riskLevel: "critical",
        ipAddresses: ["45.33.32.156", "91.189.92.20", "10.0.1.45"],
        geoLocations: ["New York, US", "London, GB", "Office LAN"],
        accountLocked: true,
        lockReason: "Exceeded 10 failed attempts in 24h — automatic lockout policy P-LOCK-001",
        recommendation: "Investigate possible key compromise. Verify no unauthorized systems. Re-issue key after identity verification.",
      },
      {
        id: "FA-002",
        user: "Unknown Actor",
        email: null,
        department: null,
        deviceSerial: "YK-0042",
        failureCount: 47,
        timeWindow: "1h",
        firstFailure: new Date(now - 3600000).toISOString(),
        lastFailure: new Date(now - 120000).toISOString(),
        failureReasons: [
          { reason: "Invalid OTP", count: 47, detail: "Rapid automated OTP submission — brute force pattern detected" },
        ],
        riskLevel: "critical",
        ipAddresses: ["185.220.101.34"],
        geoLocations: ["Moscow, RU"],
        accountLocked: true,
        lockReason: "Brute force attack detected — IP blocked at firewall level",
        recommendation: "Block source IP permanently. Key YK-0042 was reported lost — confirm revocation and issue new key to Lisa Wang.",
      },
      {
        id: "FA-003",
        user: "Sarah Chen",
        email: "s.chen@guardianlayer.io",
        department: "Executive",
        deviceSerial: "YK-0003",
        failureCount: 3,
        timeWindow: "8h",
        firstFailure: new Date(now - 28800000).toISOString(),
        lastFailure: new Date(now - 7200000).toISOString(),
        failureReasons: [
          { reason: "Wrong slot", count: 2, detail: "User triggered slot 2 (static password) instead of slot 1 (OTP)" },
          { reason: "Timeout", count: 1, detail: "Key touch not detected within window" },
        ],
        riskLevel: "low",
        ipAddresses: ["10.0.7.12"],
        geoLocations: ["Office LAN"],
        accountLocked: false,
        lockReason: null,
        recommendation: "User training recommended — configure key to disable slot 2 to prevent confusion.",
      },
      {
        id: "FA-004",
        user: "Alex Thompson",
        email: "a.thompson@guardianlayer.io",
        department: "Sales",
        deviceSerial: "YK-0029",
        failureCount: 7,
        timeWindow: "12h",
        firstFailure: new Date(now - 43200000).toISOString(),
        lastFailure: new Date(now - 5400000).toISOString(),
        failureReasons: [
          { reason: "Protocol mismatch", count: 4, detail: "Client requested U2F but key configured for FIDO2 only" },
          { reason: "PIN required", count: 3, detail: "FIDO2 resident key requires PIN — user unaware of PIN requirement" },
        ],
        riskLevel: "medium",
        ipAddresses: ["10.0.4.88", "172.16.0.55"],
        geoLocations: ["Office LAN", "VPN — Remote"],
        accountLocked: false,
        lockReason: null,
        recommendation: "Update client-side WebAuthn configuration to prefer FIDO2. Send user PIN setup instructions.",
      },
      {
        id: "FA-005",
        user: "svc-ci-pipeline",
        email: null,
        department: "Infrastructure",
        deviceSerial: "YK-HSM-001",
        failureCount: 23,
        timeWindow: "6h",
        firstFailure: new Date(now - 21600000).toISOString(),
        lastFailure: new Date(now - 300000).toISOString(),
        failureReasons: [
          { reason: "Rate limited", count: 23, detail: "CI pipeline making >100 signing requests/minute — exceeds HSM YubiKey rate limit of 60/min" },
        ],
        riskLevel: "high",
        ipAddresses: ["10.0.10.5"],
        geoLocations: ["CI Runner Pool"],
        accountLocked: false,
        lockReason: null,
        recommendation: "Implement request queuing in CI pipeline. Consider dedicated HSM appliance for high-throughput signing.",
      },
    ];

    const summary = {
      totalIncidents: incidents.length,
      criticalIncidents: incidents.filter((i) => i.riskLevel === "critical").length,
      accountsLocked: incidents.filter((i) => i.accountLocked).length,
      totalFailures: incidents.reduce((s, i) => s + i.failureCount, 0),
      uniqueIPs: [...new Set(incidents.flatMap((i) => i.ipAddresses))].length,
      bruteForceDetected: incidents.filter((i) => i.failureReasons.some((r) => r.reason === "Invalid OTP" && r.count > 20)).length,
    };

    res.json({ incidents, summary });
  } catch (err: any) {
    console.error("[yubikey] GET /failed-auth failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve failed auth data." });
  }
});

router.get("/yubikey/policies", async (_req, res): Promise<void> => {
  try {
    const policies = [
      {
        id: "P-MFA-001",
        name: "Hardware MFA Required — All Users",
        description: "All employees must enroll at least one FIDO2-compatible hardware security key for authentication to corporate systems.",
        scope: "organization",
        status: "enforced",
        enforcementLevel: "mandatory",
        createdAt: "2024-01-15T00:00:00Z",
        lastUpdated: "2025-06-01T00:00:00Z",
        compliance: { total: 142, compliant: 128, nonCompliant: 14, exempted: 3 },
        rules: [
          { rule: "Minimum 1 hardware key enrolled per user", status: "active" },
          { rule: "FIDO2/WebAuthn protocol required — U2F deprecated", status: "active" },
          { rule: "Backup key recommended (not mandatory)", status: "advisory" },
        ],
      },
      {
        id: "P-LOCK-001",
        name: "Account Lockout Policy",
        description: "Automatic account lockout after consecutive failed hardware MFA attempts to prevent brute force attacks.",
        scope: "organization",
        status: "enforced",
        enforcementLevel: "mandatory",
        createdAt: "2024-01-15T00:00:00Z",
        lastUpdated: "2025-09-12T00:00:00Z",
        compliance: { total: 142, compliant: 140, nonCompliant: 2, exempted: 0 },
        rules: [
          { rule: "Lock account after 10 failed attempts in 24 hours", status: "active" },
          { rule: "Lock account after 5 failed attempts in 1 hour", status: "active" },
          { rule: "Require manager approval for unlock after lockout", status: "active" },
          { rule: "Alert SOC on any lockout event", status: "active" },
        ],
      },
      {
        id: "P-PRIV-001",
        name: "Privileged Access — Dual Key Required",
        description: "Users with admin or root access to production systems must have two registered hardware keys and complete dual-factor challenge.",
        scope: "admin_users",
        status: "enforced",
        enforcementLevel: "mandatory",
        createdAt: "2024-03-01T00:00:00Z",
        lastUpdated: "2025-11-20T00:00:00Z",
        compliance: { total: 18, compliant: 15, nonCompliant: 3, exempted: 0 },
        rules: [
          { rule: "Minimum 2 hardware keys registered", status: "active" },
          { rule: "Keys must be different models (redundancy)", status: "active" },
          { rule: "Re-authentication required every 4 hours for admin sessions", status: "active" },
          { rule: "No SMS/TOTP fallback for privileged accounts", status: "active" },
        ],
      },
      {
        id: "P-KEY-001",
        name: "Key Lifecycle Management",
        description: "Policies governing hardware key provisioning, rotation, revocation, and disposal throughout the device lifecycle.",
        scope: "organization",
        status: "enforced",
        enforcementLevel: "mandatory",
        createdAt: "2024-01-15T00:00:00Z",
        lastUpdated: "2026-01-10T00:00:00Z",
        compliance: { total: 142, compliant: 135, nonCompliant: 7, exempted: 0 },
        rules: [
          { rule: "Keys must be re-attested annually", status: "active" },
          { rule: "Lost/stolen keys must be reported within 1 hour", status: "active" },
          { rule: "Departed employee keys must be revoked within 24 hours", status: "active" },
          { rule: "Keys with firmware < 5.4 must be replaced by Q2 2026", status: "active" },
          { rule: "Physical destruction required for decommissioned keys", status: "advisory" },
        ],
      },
      {
        id: "P-GUEST-001",
        name: "Contractor/Guest Access — Temporary Keys",
        description: "Temporary hardware key issuance for contractors and guests with automatic expiration and limited scope.",
        scope: "contractors",
        status: "partial",
        enforcementLevel: "recommended",
        createdAt: "2025-06-01T00:00:00Z",
        lastUpdated: "2026-02-28T00:00:00Z",
        compliance: { total: 12, compliant: 8, nonCompliant: 4, exempted: 0 },
        rules: [
          { rule: "Temporary keys expire after 90 days", status: "active" },
          { rule: "Contractors limited to specific application scopes", status: "active" },
          { rule: "Keys must be returned upon contract termination", status: "active" },
          { rule: "No admin-level access on temporary keys", status: "active" },
        ],
      },
    ];

    const overallCompliance = {
      totalPolicies: policies.length,
      enforced: policies.filter((p) => p.status === "enforced").length,
      partial: policies.filter((p) => p.status === "partial").length,
      totalUsers: 142,
      fullyCompliant: 118,
      complianceRate: 83.1,
      criticalGaps: 3,
    };

    res.json({ policies, overallCompliance });
  } catch (err: any) {
    console.error("[yubikey] GET /policies failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve MFA policies." });
  }
});

export default router;

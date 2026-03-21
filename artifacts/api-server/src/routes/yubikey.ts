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
import { getAnomalies, getAnomalySummary } from "../lib/anomaly-engine";

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

router.get("/yubikey/fleet", async (_req, res): Promise<void> => {
  try {
    const devices = await db.select().from(yubikeyDevicesTable).orderBy(desc(yubikeyDevicesTable.createdAt));
    const now = new Date();

    const fleet = devices.map((d) => {
      const protocols = d.protocols ? d.protocols.split(",") : [];
      const isFips = d.model?.includes("FIPS") || protocols.includes("PIV");
      const fwParts = (d.firmwareVersion || "5.4.3").split(".");
      const fwOutdated = parseInt(fwParts[0]) < 5 || (parseInt(fwParts[0]) === 5 && parseInt(fwParts[1]) < 4);
      const enrolledMs = d.enrolledAt ? new Date(d.enrolledAt).getTime() : now.getTime();
      const uptimeDays = Math.floor((now.getTime() - enrolledMs) / 86400000);

      return {
        id: d.id,
        serialNumber: d.serialNumber,
        model: d.model || "YubiKey 5 NFC",
        firmwareVersion: d.firmwareVersion || "5.4.3",
        formFactor: d.model?.includes("Nano") ? "Nano" : d.model?.includes("Bio") ? "Biometric" : d.model?.includes("5C") ? "USB-C" : "USB-A/NFC",
        assignedUser: d.assignedUser,
        department: d.department || null,
        status: d.status,
        fipsCertified: isFips,
        attestationStatus: d.status === "active" ? "verified" : d.status === "suspended" ? "expired" : "pending",
        lastUsed: d.lastUsed,
        totalAuths: d.authSuccessCount || 0,
        failedAuths: d.authFailCount || 0,
        interfaces: d.model?.includes("5C") ? ["USB-C"] : d.model?.includes("Bio") ? ["USB-A", "Fingerprint"] : ["USB-A", "NFC"],
        protocols,
        registeredAt: d.enrolledAt || d.createdAt,
        warrantyExpiry: new Date(enrolledMs + 730 * 86400000).toISOString(),
        uptime: `${uptimeDays}d`,
        attestationDate: d.enrolledAt || d.createdAt,
        lastUsedApp: d.authSuccessCount && d.authSuccessCount > 0 ? "Corporate SSO" : null,
        lastUsedLocation: d.authSuccessCount && d.authSuccessCount > 0 ? "HQ Office" : null,
        notes: d.status === "suspended" ? "Suspended due to multiple failed auth attempts" : null,
      };
    });

    const fipsCount = fleet.filter((d) => d.fipsCertified).length;
    const fwOutdatedCount = fleet.filter((d) => {
      const parts = d.firmwareVersion.split(".");
      return parseInt(parts[0]) < 5 || (parseInt(parts[0]) === 5 && parseInt(parts[1]) < 4);
    }).length;
    const totalAuths = fleet.reduce((sum, d) => sum + d.totalAuths, 0);

    res.json({
      fleet,
      summary: {
        totalDevices: fleet.length,
        activeDevices: fleet.filter((d) => d.status === "active").length,
        fipsCertified: fipsCount,
        firmwareOutdated: fwOutdatedCount,
        totalAuths,
      },
    });
  } catch (err: any) {
    console.error("[yubikey] GET /fleet failed:", err.message);
    res.status(500).json({ error: "Failed to load fleet data." });
  }
});

router.get("/yubikey/enrollment", async (_req, res): Promise<void> => {
  const now = new Date();
  const requests = [
    {
      id: "ENR-001",
      user: "Sarah Chen",
      status: "completed",
      priority: "high",
      keyType: "YubiKey 5 NFC",
      department: "Engineering",
      requestDate: new Date(now.getTime() - 14 * 86400000).toISOString(),
      justification: "New hire onboarding — requires hardware key for code signing and production access.",
      email: "sarah.chen@corp.com",
      shippingAddress: "HQ Office, Floor 3",
      approver: "VP Engineering",
      trackingNumber: "YK-TRK-20260307",
      activatedDate: new Date(now.getTime() - 7 * 86400000).toISOString(),
      rejectionReason: null,
    },
    {
      id: "ENR-002",
      user: "Marcus Johnson",
      status: "pending_approval",
      priority: "critical",
      keyType: "YubiKey 5Ci",
      department: "Executive",
      requestDate: new Date(now.getTime() - 2 * 86400000).toISOString(),
      justification: "Lost key during travel. Needs immediate replacement for board meeting access.",
      email: "m.johnson@corp.com",
      shippingAddress: "Remote — Tokyo Office",
      approver: null,
      trackingNumber: null,
      activatedDate: null,
      rejectionReason: null,
    },
    {
      id: "ENR-003",
      user: "Priya Patel",
      status: "shipped",
      priority: "medium",
      keyType: "YubiKey 5 NFC",
      department: "Finance",
      requestDate: new Date(now.getTime() - 5 * 86400000).toISOString(),
      justification: "Upgrading from TOTP to hardware key per new compliance policy.",
      email: "priya.patel@corp.com",
      shippingAddress: "HQ Office, Floor 5",
      approver: "CISO",
      trackingNumber: "YK-TRK-20260316",
      activatedDate: null,
      rejectionReason: null,
    },
    {
      id: "ENR-004",
      user: "James Wilson",
      status: "approved",
      priority: "medium",
      keyType: "YubiKey Bio",
      department: "HR",
      requestDate: new Date(now.getTime() - 3 * 86400000).toISOString(),
      justification: "Department-wide rollout of biometric security keys for HRIS access.",
      email: "j.wilson@corp.com",
      shippingAddress: "HQ Office, Floor 2",
      approver: "IT Director",
      trackingNumber: null,
      activatedDate: null,
      rejectionReason: null,
    },
    {
      id: "ENR-005",
      user: "Alex Rodriguez",
      status: "rejected",
      priority: "low",
      keyType: "YubiKey 5C Nano",
      department: "Marketing",
      requestDate: new Date(now.getTime() - 10 * 86400000).toISOString(),
      justification: "Would like a second backup key for home office use.",
      email: "a.rodriguez@corp.com",
      shippingAddress: "Remote — Home Address",
      approver: null,
      trackingNumber: null,
      activatedDate: null,
      rejectionReason: "Backup key requests require manager + CISO dual approval. Please resubmit with manager endorsement.",
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
});

router.get("/yubikey/failed-auth", async (_req, res): Promise<void> => {
  const now = new Date();
  const incidents = [
    {
      id: "FA-001",
      user: "hr@corp.com",
      riskLevel: "critical",
      deviceSerial: "YK5-51928374",
      failureCount: 15,
      timeWindow: "45 minutes",
      department: "HR",
      accountLocked: true,
      bruteForce: true,
      firstFailure: new Date(now.getTime() - 3600000).toISOString(),
      lastFailure: new Date(now.getTime() - 900000).toISOString(),
      ipAddresses: ["203.0.113.42", "198.51.100.17"],
      geoLocations: ["Beijing, CN", "New York, US"],
      failureReasons: [
        { count: 8, reason: "Invalid PIN", detail: "PIN verification failed — wrong PIN entered repeatedly." },
        { count: 5, reason: "Key Not Recognized", detail: "The hardware key signature didn't match the registered credential." },
        { count: 2, reason: "Timeout", detail: "User didn't touch the key within the challenge window." },
      ],
      lockReason: "Automatic lockout triggered after 10+ failures within 60 minutes from multiple geographic locations.",
      recommendation: "Verify the user's identity via out-of-band channel (phone call). Check if the key was reported lost/stolen. Review Tailscale node logs and access history for this user over the past 24 hours.",
    },
    {
      id: "FA-002",
      user: "dev@corp.com",
      riskLevel: "medium",
      deviceSerial: "YK5-47283916",
      failureCount: 4,
      timeWindow: "10 minutes",
      department: "Engineering",
      accountLocked: false,
      bruteForce: false,
      firstFailure: new Date(now.getTime() - 7200000).toISOString(),
      lastFailure: new Date(now.getTime() - 6600000).toISOString(),
      ipAddresses: ["10.0.1.45"],
      geoLocations: ["HQ Office"],
      failureReasons: [
        { count: 3, reason: "Wrong Protocol", detail: "Attempted FIDO2 auth but application expected U2F." },
        { count: 1, reason: "Timeout", detail: "Key touch timeout — user was away from desk." },
      ],
      lockReason: null,
      recommendation: "Likely a configuration issue. Verify the application's WebAuthn settings match the key's capabilities. No malicious activity detected.",
    },
    {
      id: "FA-003",
      user: "finance@corp.com",
      riskLevel: "high",
      deviceSerial: "YK5-39182734",
      failureCount: 8,
      timeWindow: "2 hours",
      department: "Finance",
      accountLocked: false,
      bruteForce: false,
      firstFailure: new Date(now.getTime() - 10800000).toISOString(),
      lastFailure: new Date(now.getTime() - 3600000).toISOString(),
      ipAddresses: ["192.168.1.100", "203.0.113.88"],
      geoLocations: ["HQ Office", "Unknown Tailscale Exit Node"],
      failureReasons: [
        { count: 5, reason: "Invalid PIN", detail: "PIN verification failed multiple times." },
        { count: 3, reason: "Certificate Expired", detail: "The PIV certificate on the key has expired and needs renewal." },
      ],
      lockReason: null,
      recommendation: "The PIV certificate on this key has expired. Schedule a re-attestation session. Monitor for additional failures from external IPs.",
    },
  ];

  const summary = {
    totalIncidents: incidents.length,
    criticalIncidents: incidents.filter((i) => i.riskLevel === "critical").length,
    accountsLocked: incidents.filter((i) => i.accountLocked).length,
    totalFailures: incidents.reduce((sum, i) => sum + i.failureCount, 0),
    uniqueIPs: [...new Set(incidents.flatMap((i) => i.ipAddresses))].length,
    bruteForceDetected: incidents.filter((i) => i.bruteForce).length,
  };

  res.json({ incidents, summary });
});

router.get("/yubikey/policies", async (_req, res): Promise<void> => {
  const now = new Date();
  const policies = [
    {
      id: "POL-001",
      name: "Hardware Key Required for Production Access",
      status: "enforced",
      scope: "Engineering + DevOps",
      enforcementLevel: "mandatory",
      description: "All engineers and DevOps personnel must use a FIDO2-capable hardware security key to access production systems, CI/CD pipelines, and code signing services. TOTP and SMS are not accepted.",
      createdAt: new Date(now.getTime() - 90 * 86400000).toISOString(),
      lastUpdated: new Date(now.getTime() - 7 * 86400000).toISOString(),
      compliance: { compliant: 14, total: 16, exempted: 1, nonCompliant: 1 },
      rules: [
        { rule: "FIDO2 hardware key required for SSH access", status: "active" },
        { rule: "PIV certificate required for code signing", status: "active" },
        { rule: "Key must be FIPS 140-2 certified", status: "active" },
        { rule: "Key re-attestation every 90 days", status: "active" },
      ],
    },
    {
      id: "POL-002",
      name: "MFA Required for All Users",
      status: "enforced",
      scope: "All Departments",
      enforcementLevel: "mandatory",
      description: "Every employee must have at least one MFA method configured. Hardware keys are preferred, TOTP is acceptable, SMS is discouraged but allowed during transition period.",
      createdAt: new Date(now.getTime() - 180 * 86400000).toISOString(),
      lastUpdated: new Date(now.getTime() - 14 * 86400000).toISOString(),
      compliance: { compliant: 42, total: 48, exempted: 2, nonCompliant: 4 },
      rules: [
        { rule: "At least one MFA method must be active", status: "active" },
        { rule: "SMS-only MFA flagged for upgrade", status: "active" },
        { rule: "Backup authentication method recommended", status: "partial" },
      ],
    },
    {
      id: "POL-003",
      name: "Executive Protection Program",
      status: "enforced",
      scope: "C-Suite + Board",
      enforcementLevel: "mandatory",
      description: "C-level executives and board members must use YubiKey Bio (biometric) keys with FIDO2+PIV. Additional physical security measures including tamper-evident bags for key storage.",
      createdAt: new Date(now.getTime() - 60 * 86400000).toISOString(),
      lastUpdated: new Date(now.getTime() - 3 * 86400000).toISOString(),
      compliance: { compliant: 5, total: 5, exempted: 0, nonCompliant: 0 },
      rules: [
        { rule: "Biometric key (YubiKey Bio) required", status: "active" },
        { rule: "Anti-phishing protection enabled", status: "active" },
        { rule: "Travel security protocol active", status: "active" },
      ],
    },
    {
      id: "POL-004",
      name: "Contractor Access Policy",
      status: "partial",
      scope: "External Contractors",
      enforcementLevel: "recommended",
      description: "External contractors should use hardware keys when accessing internal systems. Currently transitioning from password-only access.",
      createdAt: new Date(now.getTime() - 30 * 86400000).toISOString(),
      lastUpdated: new Date(now.getTime() - 1 * 86400000).toISOString(),
      compliance: { compliant: 3, total: 8, exempted: 0, nonCompliant: 5 },
      rules: [
        { rule: "Hardware key recommended for Tailscale admin access", status: "partial" },
        { rule: "TOTP required at minimum", status: "active" },
        { rule: "Key return upon contract termination", status: "active" },
      ],
    },
  ];

  const overallCompliance = {
    totalPolicies: policies.length,
    enforced: policies.filter((p) => p.status === "enforced").length,
    partial: policies.filter((p) => p.status === "partial").length,
    totalUsers: policies.reduce((sum, p) => sum + p.compliance.total, 0),
    fullyCompliant: policies.reduce((sum, p) => sum + p.compliance.compliant, 0),
    complianceRate: Math.round(
      (policies.reduce((sum, p) => sum + p.compliance.compliant, 0) /
        Math.max(policies.reduce((sum, p) => sum + p.compliance.total, 0), 1)) * 100
    ),
    criticalGaps: policies.reduce((sum, p) => sum + p.compliance.nonCompliant, 0),
  };

  res.json({ policies, overallCompliance });
});

router.get("/yubikey/lost-stolen", async (_req, res): Promise<void> => {
  const now = new Date();
  const incidents = [
    {
      id: "INC-001",
      incidentType: "stolen",
      severity: "critical",
      status: "revoked",
      reportedBy: "hr@corp.com",
      department: "HR",
      deviceSerial: "YK5-51928374",
      deviceModel: "YubiKey 5 NFC",
      location: "Airport Terminal 3, JFK",
      reportedAt: new Date(now.getTime() - 48 * 3600000).toISOString(),
      description: "Security key stolen from laptop bag during airport security screening. Bag was unattended for approximately 3 minutes. Key was in a labeled pouch with the employee's name.",
      discoveredAt: new Date(now.getTime() - 50 * 3600000).toISOString(),
      revokedAt: new Date(now.getTime() - 47 * 3600000).toISOString(),
      revokedBy: "Security Operations",
      email: "hr@corp.com",
      timeline: [
        { time: new Date(now.getTime() - 50 * 3600000).toISOString(), event: "Key discovered missing from laptop bag", actor: "hr@corp.com" },
        { time: new Date(now.getTime() - 49 * 3600000).toISOString(), event: "Incident reported via security portal", actor: "hr@corp.com" },
        { time: new Date(now.getTime() - 48.5 * 3600000).toISOString(), event: "SOC team acknowledged incident", actor: "Security Operations" },
        { time: new Date(now.getTime() - 47 * 3600000).toISOString(), event: "Key revoked and all active sessions terminated", actor: "Security Operations" },
        { time: new Date(now.getTime() - 46 * 3600000).toISOString(), event: "Replacement key enrollment initiated", actor: "IT Admin" },
      ],
      securityAlerts: [
        { type: "soc_ticket", id: "SOC-2026-0847", status: "investigating" },
        { type: "email_alert", recipients: ["ciso@corp.com", "it-security@corp.com"] },
        { type: "slack_alert", channel: "#security-incidents" },
        { type: "pagerduty", incidentId: "PD-20260319-001" },
      ],
      reEnrollment: {
        status: "initiated",
        enrollmentId: "ENR-006",
        newKeySerial: null,
        approvedBy: "CISO",
        shippedAt: null,
        activatedAt: null,
      },
      postIncidentActions: [
        "All active sessions for hr@corp.com terminated",
        "Password reset enforced on next login",
        "Access audit for the last 72 hours completed — no unauthorized access detected",
        "Airport security notified and report filed",
        "Replacement key expedited via overnight shipping",
      ],
    },
    {
      id: "INC-002",
      incidentType: "lost",
      severity: "medium",
      status: "investigating",
      reportedBy: "dev@corp.com",
      department: "Engineering",
      deviceSerial: "YK5-99182734",
      deviceModel: "YubiKey 5C Nano",
      location: "Home Office",
      reportedAt: new Date(now.getTime() - 12 * 3600000).toISOString(),
      description: "Nano-format key may have fallen out of laptop USB-C port. Employee checking home office, car, and co-working space. Key has not been used since yesterday.",
      discoveredAt: new Date(now.getTime() - 14 * 3600000).toISOString(),
      revokedAt: new Date(now.getTime() - 11 * 3600000).toISOString(),
      revokedBy: "IT Admin",
      email: "dev@corp.com",
      timeline: [
        { time: new Date(now.getTime() - 14 * 3600000).toISOString(), event: "Employee noticed key missing from laptop", actor: "dev@corp.com" },
        { time: new Date(now.getTime() - 12 * 3600000).toISOString(), event: "Incident reported — searching home office", actor: "dev@corp.com" },
        { time: new Date(now.getTime() - 11 * 3600000).toISOString(), event: "Key suspended as precaution", actor: "IT Admin" },
      ],
      securityAlerts: [
        { type: "soc_ticket", id: "SOC-2026-0851", status: "investigating" },
        { type: "email_alert", recipients: ["it-security@corp.com"] },
      ],
      reEnrollment: {
        status: "pending",
        enrollmentId: "ENR-007",
        newKeySerial: null,
        approvedBy: null,
        shippedAt: null,
        activatedAt: null,
      },
      postIncidentActions: [
        "Key temporarily suspended pending search",
        "Employee using backup TOTP method",
        "48-hour search window before permanent revocation",
      ],
    },
  ];

  const summary = {
    totalIncidents: incidents.length,
    activeInvestigations: incidents.filter((i) => i.status === "investigating").length,
    revokedKeys: incidents.filter((i) => i.status === "revoked").length,
    suspendedKeys: incidents.filter((i) => i.status === "suspended").length,
    reEnrollmentsPending: incidents.filter((i) => i.reEnrollment.status === "pending" || i.reEnrollment.status === "initiated").length,
    criticalIncidents: incidents.filter((i) => i.severity === "critical").length,
  };

  res.json({ incidents, summary });
});

router.get("/yubikey/audit-log", async (_req, res): Promise<void> => {
  try {
    const dbEvents = await db
      .select()
      .from(yubikeyAuthEventsTable)
      .orderBy(desc(yubikeyAuthEventsTable.createdAt))
      .limit(50);

    const events = dbEvents.map((e, i) => ({
      id: `EVT-${String(e.id || i + 1).padStart(4, "0")}`,
      eventType: e.eventType,
      protocol: e.protocol || "FIDO2",
      application: "Corporate SSO",
      riskFlag: e.eventType === "auth_failure" ? (i % 3 === 0 ? "brute_force" : "suspicious_location") : null,
      user: e.user || "unknown",
      deviceSerial: e.deviceSerial || "N/A",
      deviceModel: "YubiKey 5 NFC",
      location: e.location || "HQ Office",
      ipAddress: e.ipAddress || "10.0.1.1",
      timestamp: e.createdAt?.toISOString() || new Date().toISOString(),
      authMethod: "fido2_touch",
      responseTime: e.eventType === "auth_success" ? 120 + Math.floor(Math.random() * 200) : 0,
      sessionId: `sess-${Math.random().toString(36).substring(2, 10)}`,
      challenge: `chall-${Math.random().toString(36).substring(2, 14)}`,
      relayParty: "id.corp.com",
      userAgent: e.userAgent || "Chrome/120 (Windows NT 10.0)",
      email: e.user || null,
      department: null,
      failureReason: e.eventType === "auth_failure" ? "Authentication challenge failed" : null,
    }));

    const successCount = events.filter((e) => e.eventType === "auth_success").length;
    const failureCount = events.filter((e) => e.eventType === "auth_failure").length;
    const uniqueUsers = [...new Set(events.map((e) => e.user))].length;
    const responseTimes = events.filter((e) => e.responseTime > 0).map((e) => e.responseTime);
    const avgResponseTime = responseTimes.length > 0 ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) : 0;

    res.json({
      events,
      summary: {
        totalEvents: events.length,
        successCount,
        failureCount,
        uniqueUsers,
        avgResponseTime,
      },
    });
  } catch (err: any) {
    console.error("[yubikey] GET /audit-log failed:", err.message);
    res.json({
      events: [],
      summary: { totalEvents: 0, successCount: 0, failureCount: 0, uniqueUsers: 0, avgResponseTime: 0 },
    });
  }
});

router.get("/yubikey/mfa-compliance", async (_req, res): Promise<void> => {
  const now = new Date();
  const users = [
    { id: "USR-001", name: "Admin User", role: "System Administrator", department: "IT", email: "admin@corp.com", mfaMethod: "hardware_key", compliant: true, riskLevel: "low", complianceScore: 100, lastAuth: new Date(now.getTime() - 1800000).toISOString(), deviceSerial: "YK5-18294731", protocols: ["FIDO2", "PIV"], backupMethod: "totp", nonComplianceReason: null },
    { id: "USR-002", name: "CEO", role: "Chief Executive Officer", department: "Executive", email: "ceo@corp.com", mfaMethod: "hardware_key", compliant: true, riskLevel: "low", complianceScore: 100, lastAuth: new Date(now.getTime() - 3600000).toISOString(), deviceSerial: "YK5-28371642", protocols: ["FIDO2", "U2F"], backupMethod: "hardware_key", nonComplianceReason: null },
    { id: "USR-003", name: "Finance Lead", role: "Finance Director", department: "Finance", email: "finance@corp.com", mfaMethod: "hardware_key", compliant: true, riskLevel: "low", complianceScore: 95, lastAuth: new Date(now.getTime() - 7200000).toISOString(), deviceSerial: "YK5-39182734", protocols: ["FIDO2", "PIV"], backupMethod: "totp", nonComplianceReason: null },
    { id: "USR-004", name: "Lead Developer", role: "Senior Engineer", department: "Engineering", email: "dev@corp.com", mfaMethod: "hardware_key", compliant: true, riskLevel: "low", complianceScore: 100, lastAuth: new Date(now.getTime() - 900000).toISOString(), deviceSerial: "YK5-47283916", protocols: ["FIDO2", "U2F"], backupMethod: "totp", nonComplianceReason: null },
    { id: "USR-005", name: "HR Manager", role: "HR Director", department: "HR", email: "hr@corp.com", mfaMethod: "totp", compliant: false, riskLevel: "high", complianceScore: 40, lastAuth: new Date(now.getTime() - 172800000).toISOString(), deviceSerial: null, protocols: [], backupMethod: "none", nonComplianceReason: "Hardware key suspended after theft incident. Currently using TOTP as temporary measure. Replacement key in transit." },
    { id: "USR-006", name: "DevOps Lead", role: "DevOps Engineer", department: "Engineering", email: "devops@corp.com", mfaMethod: "hardware_key", compliant: true, riskLevel: "low", complianceScore: 100, lastAuth: new Date(now.getTime() - 600000).toISOString(), deviceSerial: "YK5-62837461", protocols: ["FIDO2", "U2F"], backupMethod: "totp", nonComplianceReason: null },
    { id: "USR-007", name: "Marketing Intern", role: "Intern", department: "Marketing", email: "intern@corp.com", mfaMethod: "sms", compliant: false, riskLevel: "critical", complianceScore: 15, lastAuth: new Date(now.getTime() - 86400000).toISOString(), deviceSerial: null, protocols: [], backupMethod: "none", nonComplianceReason: "Using SMS-only MFA. SMS is vulnerable to SIM swap attacks. Must upgrade to hardware key or TOTP immediately." },
    { id: "USR-008", name: "DBA", role: "Database Administrator", department: "Engineering", email: "dba@corp.com", mfaMethod: "hardware_key", compliant: true, riskLevel: "low", complianceScore: 95, lastAuth: new Date(now.getTime() - 3600000).toISOString(), deviceSerial: "YK5-84019273", protocols: ["FIDO2", "U2F"], backupMethod: "totp", nonComplianceReason: null },
    { id: "USR-009", name: "Sales Rep", role: "Account Executive", department: "Sales", email: "sales@corp.com", mfaMethod: "totp", compliant: true, riskLevel: "medium", complianceScore: 70, lastAuth: new Date(now.getTime() - 14400000).toISOString(), deviceSerial: null, protocols: [], backupMethod: "sms", nonComplianceReason: null },
    { id: "USR-010", name: "Contractor A", role: "External Contractor", department: "Contractor", email: "contractor.a@vendor.com", mfaMethod: "none", compliant: false, riskLevel: "critical", complianceScore: 0, lastAuth: new Date(now.getTime() - 259200000).toISOString(), deviceSerial: null, protocols: [], backupMethod: "none", nonComplianceReason: "No MFA configured. Account access restricted to read-only until MFA is enrolled. Deadline: end of week." },
  ];

  const summary = {
    totalUsers: users.length,
    compliant: users.filter((u) => u.compliant).length,
    hardwareKey: users.filter((u) => u.mfaMethod === "hardware_key").length,
    totp: users.filter((u) => u.mfaMethod === "totp").length,
    sms: users.filter((u) => u.mfaMethod === "sms").length,
    none: users.filter((u) => u.mfaMethod === "none").length,
    criticalRisk: users.filter((u) => u.riskLevel === "critical").length,
    highRisk: users.filter((u) => u.riskLevel === "high").length,
  };

  res.json({ users, summary });
});

router.get("/yubikey/anomaly-detector", async (_req, res): Promise<void> => {
  const rawAnomalies = getAnomalies();
  const now = new Date();

  const anomalies = rawAnomalies.map((a, i) => {
    const userMap: Record<string, string> = {
      impossible_travel: "finance@corp.com",
      brute_force: "hr@corp.com",
      unusual_hours: "dev@corp.com",
      concurrent_sessions: "admin@corp.com",
      protocol_mismatch: "dba@corp.com",
      rapid_auth: "devops@corp.com",
    };
    const deptMap: Record<string, string> = {
      impossible_travel: "Finance",
      brute_force: "HR",
      unusual_hours: "Engineering",
      concurrent_sessions: "IT",
      protocol_mismatch: "Engineering",
      rapid_auth: "Engineering",
    };

    return {
      id: a.id,
      type: a.type,
      severity: a.severity,
      status: a.status,
      title: a.title,
      description: a.description,
      riskScore: a.riskScore,
      user: userMap[a.type] || "unknown@corp.com",
      department: deptMap[a.type] || "Unknown",
      deviceSerial: `YK5-${String(39182734 + i * 11).substring(0, 8)}`,
      deviceModel: "YubiKey 5 NFC",
      email: userMap[a.type] || "unknown@corp.com",
      detectedAt: a.detectedAt,
      locations: [
        { city: "New York", country: "US", ip: a.sourceIp || "10.0.1.1", application: "Corporate SSO", timestamp: a.detectedAt },
        ...(a.type === "impossible_travel"
          ? [{ city: "Beijing", country: "CN", ip: "203.0.113.42", application: "Tailscale Admin Console", timestamp: new Date(new Date(a.detectedAt).getTime() + 1800000).toISOString() }]
          : []),
      ],
      aiAnalysis: a.aiAnalysis,
      recommendedActions: a.recommendedActions,
      relatedAlerts: [`SOC-2026-${String(800 + i).padStart(4, "0")}`],
    };
  });

  const summary = {
    totalAnomalies: anomalies.length,
    active: anomalies.filter((a) => a.status === "active").length,
    investigating: anomalies.filter((a) => a.status === "investigating").length,
    mitigated: anomalies.filter((a) => a.status === "mitigated").length,
    avgRiskScore: anomalies.length > 0 ? Math.round(anomalies.reduce((sum, a) => sum + a.riskScore, 0) / anomalies.length) : 0,
  };

  res.json({ anomalies, summary });
});

export default router;

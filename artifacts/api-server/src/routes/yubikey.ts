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

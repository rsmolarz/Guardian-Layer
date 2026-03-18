import { Router, type IRouter } from "express";
import { eq, desc, sql, and } from "drizzle-orm";
import { db, openclawContractsTable } from "@workspace/db";
import {
  ListOpenclawContractsQueryParams,
  ListOpenclawContractsResponse,
  GetOpenclawStatsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/openclaw/contracts", async (req, res): Promise<void> => {
  try {
    const query = ListOpenclawContractsQueryParams.safeParse(req.query);
    if (!query.success) { res.status(400).json({ error: query.error.message }); return; }

    const { riskLevel, status, limit = 50, offset = 0 } = query.data;
    const conditions = [];
    if (riskLevel) conditions.push(eq(openclawContractsTable.riskLevel, riskLevel));
    if (status) conditions.push(eq(openclawContractsTable.status, status));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const contracts = await db.select().from(openclawContractsTable).where(where).orderBy(desc(openclawContractsTable.riskScore)).limit(limit).offset(offset);
    const [countResult] = await db.select({ count: sql<number>`count(*)::int` }).from(openclawContractsTable).where(where);

    res.json(ListOpenclawContractsResponse.parse({ contracts, total: countResult?.count ?? 0 }));
  } catch (err: any) {
    console.error("[openclaw] GET /contracts failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve contracts." });
  }
});

router.get("/openclaw/stats", async (_req, res): Promise<void> => {
  try {
    const [total] = await db.select({ count: sql<number>`count(*)::int` }).from(openclawContractsTable);
    const [active] = await db.select({ count: sql<number>`count(*)::int` }).from(openclawContractsTable).where(eq(openclawContractsTable.status, "active"));
    const [expired] = await db.select({ count: sql<number>`count(*)::int` }).from(openclawContractsTable).where(eq(openclawContractsTable.status, "expired"));
    const [expiringSoon] = await db.select({ count: sql<number>`count(*)::int` }).from(openclawContractsTable).where(eq(openclawContractsTable.status, "expiring_soon"));
    const [compliant] = await db.select({ count: sql<number>`count(*)::int` }).from(openclawContractsTable).where(eq(openclawContractsTable.complianceStatus, "compliant"));
    const [nonCompliant] = await db.select({ count: sql<number>`count(*)::int` }).from(openclawContractsTable).where(eq(openclawContractsTable.complianceStatus, "non_compliant"));
    const [avgRisk] = await db.select({ avg: sql<number>`coalesce(avg(risk_score), 0)::float` }).from(openclawContractsTable);
    const [flagged] = await db.select({ sum: sql<number>`coalesce(sum(flagged_clauses), 0)::int` }).from(openclawContractsTable);
    const [criticalRisk] = await db.select({ count: sql<number>`count(*)::int` }).from(openclawContractsTable).where(eq(openclawContractsTable.riskLevel, "critical"));

    res.json(GetOpenclawStatsResponse.parse({
      totalContracts: total?.count ?? 0,
      activeCount: active?.count ?? 0,
      expiredCount: expired?.count ?? 0,
      expiringSoonCount: expiringSoon?.count ?? 0,
      compliantCount: compliant?.count ?? 0,
      nonCompliantCount: nonCompliant?.count ?? 0,
      avgRiskScore: Math.round((avgRisk?.avg ?? 0) * 100) / 100,
      totalFlaggedClauses: flagged?.sum ?? 0,
      criticalRiskCount: criticalRisk?.count ?? 0,
    }));
  } catch (err: any) {
    console.error("[openclaw] GET /stats failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve contract stats." });
  }
});

router.get("/openclaw/sessions", async (_req, res): Promise<void> => {
  try {
    const now = Date.now();
    const sessions = [
      {
        id: "SESS-001",
        user: "Sarah Chen",
        email: "s.chen@guardianlayer.io",
        role: "admin",
        department: "Executive",
        status: "active",
        ipAddress: "10.0.1.45",
        location: "Office — Executive Suite",
        country: "US",
        device: "MacBook Pro 16\" (Chrome 122)",
        startedAt: new Date(now - 3600000 * 3).toISOString(),
        lastActivity: new Date(now - 120000).toISOString(),
        expiresAt: new Date(now + 3600000 * 5).toISOString(),
        mfaMethod: "YubiKey FIDO2",
        sessionToken: "eyJhbG...x7Kf9Q",
        flags: [],
        pagesVisited: 47,
        apiCalls: 312,
        dataDownloaded: "14.2 MB",
      },
      {
        id: "SESS-002",
        user: "James Mitchell",
        email: "j.mitchell@guardianlayer.io",
        role: "admin",
        department: "Engineering",
        status: "active",
        ipAddress: "10.0.2.88",
        location: "Office — Engineering Floor",
        country: "US",
        device: "MacBook Pro 14\" (Firefox 124)",
        startedAt: new Date(now - 3600000 * 1.5).toISOString(),
        lastActivity: new Date(now - 60000).toISOString(),
        expiresAt: new Date(now + 3600000 * 6.5).toISOString(),
        mfaMethod: "YubiKey FIDO2",
        sessionToken: "eyJhbG...m2RpZ3",
        flags: [],
        pagesVisited: 23,
        apiCalls: 156,
        dataDownloaded: "8.7 MB",
      },
      {
        id: "SESS-003",
        user: "James Mitchell",
        email: "j.mitchell@guardianlayer.io",
        role: "admin",
        department: "Engineering",
        status: "flagged",
        ipAddress: "185.220.101.34",
        location: "London, UK",
        country: "UK",
        device: "Unknown (Python-Requests/2.31)",
        startedAt: new Date(now - 1800000).toISOString(),
        lastActivity: new Date(now - 300000).toISOString(),
        expiresAt: new Date(now + 3600000 * 6).toISOString(),
        mfaMethod: "JWT Forged (Algorithm Confusion)",
        sessionToken: "eyJhbG...FORGED",
        flags: [
          { type: "concurrent_login", severity: "critical", description: "Same user authenticated from New York office (SESS-002) and London simultaneously — impossible travel detected" },
          { type: "session_hijack", severity: "critical", description: "Session token generated with HS256 algorithm using leaked public key — JWT algorithm confusion attack confirmed" },
          { type: "suspicious_ua", severity: "high", description: "User agent 'Python-Requests/2.31' inconsistent with user's typical browser (Firefox). Automated tooling suspected." },
        ],
        pagesVisited: 0,
        apiCalls: 847,
        dataDownloaded: "142.3 MB",
      },
      {
        id: "SESS-004",
        user: "Maria Rodriguez",
        email: "m.rodriguez@guardianlayer.io",
        role: "viewer",
        department: "Finance",
        status: "flagged",
        ipAddress: "73.162.88.201",
        location: "Chicago, US",
        country: "US",
        device: "Windows 11 (Edge 122)",
        startedAt: new Date(now - 3600000 * 2).toISOString(),
        lastActivity: new Date(now - 600000).toISOString(),
        expiresAt: new Date(now + 3600000 * 6).toISOString(),
        mfaMethod: "YubiKey FIDO2",
        sessionToken: "eyJhbG...r0d1gz",
        flags: [
          { type: "unusual_hours", severity: "medium", description: "Session started at 03:17 AM local time — outside normal business hours (08:00-18:30)" },
          { type: "data_exfil", severity: "high", description: "Downloaded 89.4 MB of financial reports in 12 minutes — 15x above normal download volume" },
        ],
        pagesVisited: 8,
        apiCalls: 234,
        dataDownloaded: "89.4 MB",
      },
      {
        id: "SESS-005",
        user: "Alex Thompson",
        email: "a.thompson@guardianlayer.io",
        role: "editor",
        department: "Sales",
        status: "active",
        ipAddress: "75.84.202.113",
        location: "Denver, US",
        country: "US",
        device: "Windows 11 (Chrome 122)",
        startedAt: new Date(now - 3600000 * 5).toISOString(),
        lastActivity: new Date(now - 900000).toISOString(),
        expiresAt: new Date(now + 3600000 * 3).toISOString(),
        mfaMethod: "TOTP",
        sessionToken: "eyJhbG...th0mp5",
        flags: [],
        pagesVisited: 34,
        apiCalls: 89,
        dataDownloaded: "3.2 MB",
      },
      {
        id: "SESS-006",
        user: "Priya Sharma",
        email: "p.sharma@guardianlayer.io",
        role: "admin",
        department: "Engineering",
        status: "active",
        ipAddress: "49.37.142.88",
        location: "Bangalore, IN",
        country: "IN",
        device: "MacBook Pro 14\" (Chrome 122)",
        startedAt: new Date(now - 3600000 * 1).toISOString(),
        lastActivity: new Date(now - 30000).toISOString(),
        expiresAt: new Date(now + 3600000 * 7).toISOString(),
        mfaMethod: "YubiKey Bio (Biometric)",
        sessionToken: "eyJhbG...pr1ya5",
        flags: [],
        pagesVisited: 19,
        apiCalls: 201,
        dataDownloaded: "6.1 MB",
      },
      {
        id: "SESS-007",
        user: "Unknown Actor",
        email: "admin@guardianlayer.io",
        role: "admin",
        department: "N/A",
        status: "terminated",
        ipAddress: "91.234.67.12",
        location: "Kyiv, UA",
        country: "UA",
        device: "Unknown (curl/8.4.0)",
        startedAt: new Date(now - 3600000 * 8).toISOString(),
        lastActivity: new Date(now - 3600000 * 7.5).toISOString(),
        expiresAt: new Date(now - 3600000 * 7.5).toISOString(),
        mfaMethod: "Bypassed (No MFA Challenge)",
        sessionToken: "eyJhbG...TERM",
        flags: [
          { type: "session_hijack", severity: "critical", description: "Session created without MFA challenge — authentication bypass via JWT algorithm confusion vulnerability (VULN-004)" },
          { type: "privilege_escalation", severity: "critical", description: "Session role escalated from 'viewer' to 'admin' within 2 seconds of creation using PUT /api/v2/users/:id/role endpoint (VULN-007)" },
          { type: "suspicious_ua", severity: "high", description: "User agent 'curl/8.4.0' — command-line tool access from external IP. Automated attack sequence detected." },
          { type: "geo_anomaly", severity: "high", description: "Access from Kyiv, UA — no registered users in this region. IP associated with bulletproof hosting provider." },
        ],
        pagesVisited: 0,
        apiCalls: 2341,
        dataDownloaded: "347.8 MB",
      },
      {
        id: "SESS-008",
        user: "Robert Chang",
        email: "r.chang@guardianlayer.io",
        role: "viewer",
        department: "Legal",
        status: "expired",
        ipAddress: "10.0.4.22",
        location: "Office — Legal Floor",
        country: "US",
        device: "iMac (Safari 17)",
        startedAt: new Date(now - 86400000).toISOString(),
        lastActivity: new Date(now - 3600000 * 14).toISOString(),
        expiresAt: new Date(now - 3600000 * 6).toISOString(),
        mfaMethod: "TOTP",
        sessionToken: "eyJhbG...ch4ng",
        flags: [],
        pagesVisited: 12,
        apiCalls: 45,
        dataDownloaded: "1.8 MB",
      },
      {
        id: "SESS-009",
        user: "Emily Foster",
        email: "e.foster@guardianlayer.io",
        role: "editor",
        department: "Marketing",
        status: "active",
        ipAddress: "24.56.178.90",
        location: "Austin, US",
        country: "US",
        device: "MacBook Air (Chrome 122)",
        startedAt: new Date(now - 3600000 * 4).toISOString(),
        lastActivity: new Date(now - 1800000).toISOString(),
        expiresAt: new Date(now + 3600000 * 4).toISOString(),
        mfaMethod: "SMS OTP",
        sessionToken: "eyJhbG...f0st3r",
        flags: [
          { type: "weak_mfa", severity: "medium", description: "Session authenticated with SMS OTP — vulnerable to SIM swap. Hardware key enrollment overdue." },
        ],
        pagesVisited: 28,
        apiCalls: 67,
        dataDownloaded: "4.5 MB",
      },
      {
        id: "SESS-010",
        user: "svc-ci-pipeline",
        email: "svc-ci@guardianlayer.io",
        role: "service",
        department: "Engineering",
        status: "active",
        ipAddress: "10.0.10.50",
        location: "CI Runner Pool",
        country: "US",
        device: "API Client (Node.js/20.11)",
        startedAt: new Date(now - 86400000 * 30).toISOString(),
        lastActivity: new Date(now - 10000).toISOString(),
        expiresAt: new Date(now + 86400000 * 335).toISOString(),
        mfaMethod: "YubiKey HSM (PKCS#11)",
        sessionToken: "eyJhbG...svc01",
        flags: [],
        pagesVisited: 0,
        apiCalls: 142847,
        dataDownloaded: "2.1 GB",
      },
    ];

    const sessionSummary = {
      totalSessions: sessions.length,
      activeSessions: sessions.filter((s) => s.status === "active").length,
      flaggedSessions: sessions.filter((s) => s.status === "flagged").length,
      terminatedSessions: sessions.filter((s) => s.status === "terminated").length,
      expiredSessions: sessions.filter((s) => s.status === "expired").length,
      concurrentLogins: 1,
      hijackAttempts: sessions.reduce((a, s) => a + s.flags.filter((f: any) => f.type === "session_hijack").length, 0),
      totalFlags: sessions.reduce((a, s) => a + s.flags.length, 0),
      uniqueUsers: new Set(sessions.map((s) => s.email)).size,
    };

    res.json({ sessions, summary: sessionSummary });
  } catch (err: any) {
    console.error("[openclaw] GET /sessions failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve session data." });
  }
});

router.get("/openclaw/config-drift", async (_req, res): Promise<void> => {
  try {
    const now = Date.now();
    const configs = [
      {
        id: "CFG-001",
        filePath: "/etc/openclaw/auth.yaml",
        category: "authentication",
        status: "drifted",
        severity: "critical",
        baselineHash: "sha256:a3f8c2d1e9b7...4f6a",
        currentHash: "sha256:7e2b9c0f3d1a...8k2m",
        lastBaseline: new Date(now - 86400000 * 14).toISOString(),
        driftDetectedAt: new Date(now - 3600000 * 2).toISOString(),
        lastChecked: new Date(now - 300000).toISOString(),
        changes: [
          { field: "jwt.algorithm", baseline: "RS256", current: "HS256", severity: "critical", description: "JWT signing algorithm downgraded from RS256 to HS256 — enables algorithm confusion attacks" },
          { field: "session.maxAge", baseline: "3600", current: "86400", severity: "high", description: "Session TTL increased from 1 hour to 24 hours — excessive session lifetime" },
          { field: "mfa.required", baseline: "true", current: "false", severity: "critical", description: "Multi-factor authentication requirement disabled — all endpoints now accept password-only auth" },
        ],
        modifiedBy: "Unknown (no audit trail)",
        approvalStatus: "unapproved",
      },
      {
        id: "CFG-002",
        filePath: "/etc/openclaw/database.yaml",
        category: "database",
        status: "drifted",
        severity: "high",
        baselineHash: "sha256:b4d9e3f2a1c8...5g7b",
        currentHash: "sha256:9f3a1c7e2b4d...1n5p",
        lastBaseline: new Date(now - 86400000 * 14).toISOString(),
        driftDetectedAt: new Date(now - 3600000 * 6).toISOString(),
        lastChecked: new Date(now - 300000).toISOString(),
        changes: [
          { field: "connection.ssl", baseline: "required", current: "preferred", severity: "high", description: "SSL mode downgraded from 'required' to 'preferred' — allows unencrypted database connections" },
          { field: "backup.encryption", baseline: "AES-256-GCM", current: "none", severity: "critical", description: "Backup encryption disabled — database dumps now stored in plaintext on shared storage" },
        ],
        modifiedBy: "svc-deploy@guardianlayer.io",
        approvalStatus: "unapproved",
      },
      {
        id: "CFG-003",
        filePath: "/etc/openclaw/cors.json",
        category: "network",
        status: "drifted",
        severity: "high",
        baselineHash: "sha256:c5e0f4g3b2d9...6h8c",
        currentHash: "sha256:1g4b2d8f3a5c...3q7r",
        lastBaseline: new Date(now - 86400000 * 14).toISOString(),
        driftDetectedAt: new Date(now - 3600000 * 12).toISOString(),
        lastChecked: new Date(now - 300000).toISOString(),
        changes: [
          { field: "allowedOrigins", baseline: "[\"https://app.openclaw.io\"]", current: "[\"*\"]", severity: "high", description: "CORS policy changed to wildcard — any origin can now make cross-origin requests" },
          { field: "allowCredentials", baseline: "false", current: "true", severity: "medium", description: "Credentials flag enabled with wildcard origin — dangerous combination allowing credential theft" },
        ],
        modifiedBy: "j.mitchell@guardianlayer.io",
        approvalStatus: "pending_review",
      },
      {
        id: "CFG-004",
        filePath: "/etc/openclaw/rate-limiting.yaml",
        category: "security",
        status: "drifted",
        severity: "medium",
        baselineHash: "sha256:d6f1g5h4c3e0...7i9d",
        currentHash: "sha256:2h5c3e9g4b6d...4s8t",
        lastBaseline: new Date(now - 86400000 * 14).toISOString(),
        driftDetectedAt: new Date(now - 86400000).toISOString(),
        lastChecked: new Date(now - 300000).toISOString(),
        changes: [
          { field: "login.maxAttempts", baseline: "5", current: "100", severity: "medium", description: "Login rate limit increased from 5 to 100 attempts per minute — effectively disables brute-force protection" },
          { field: "api.globalRateLimit", baseline: "1000/min", current: "50000/min", severity: "medium", description: "Global API rate limit increased 50x — opens door to resource exhaustion attacks" },
        ],
        modifiedBy: "a.thompson@guardianlayer.io",
        approvalStatus: "approved",
      },
      {
        id: "CFG-005",
        filePath: "/etc/openclaw/tls.conf",
        category: "network",
        status: "drifted",
        severity: "critical",
        baselineHash: "sha256:e7g2h6i5d4f1...8j0e",
        currentHash: "sha256:3i6d4f0h5c7e...5u9v",
        lastBaseline: new Date(now - 86400000 * 14).toISOString(),
        driftDetectedAt: new Date(now - 7200000).toISOString(),
        lastChecked: new Date(now - 300000).toISOString(),
        changes: [
          { field: "minVersion", baseline: "TLSv1.3", current: "TLSv1.0", severity: "critical", description: "Minimum TLS version downgraded to 1.0 — vulnerable to BEAST, POODLE, and CRIME attacks" },
          { field: "cipherSuites", baseline: "TLS_AES_256_GCM_SHA384", current: "ALL", severity: "critical", description: "Cipher suite set to ALL — includes weak and deprecated ciphers (RC4, DES, NULL)" },
          { field: "certificate.expiry", baseline: "2026-12-01", current: "2025-03-15", severity: "high", description: "TLS certificate expired 3 days ago — browsers show security warnings, MITM risk" },
        ],
        modifiedBy: "Unknown (no audit trail)",
        approvalStatus: "unapproved",
      },
      {
        id: "CFG-006",
        filePath: "/etc/openclaw/logging.yaml",
        category: "observability",
        status: "drifted",
        severity: "medium",
        baselineHash: "sha256:f8h3i7j6e5g2...9k1f",
        currentHash: "sha256:4j7e5g1i6d8f...6w0x",
        lastBaseline: new Date(now - 86400000 * 14).toISOString(),
        driftDetectedAt: new Date(now - 86400000 * 3).toISOString(),
        lastChecked: new Date(now - 300000).toISOString(),
        changes: [
          { field: "audit.enabled", baseline: "true", current: "false", severity: "high", description: "Audit logging disabled — security events no longer recorded for compliance" },
          { field: "level", baseline: "info", current: "error", severity: "medium", description: "Log level raised to error-only — warning and info events suppressed, reducing observability" },
        ],
        modifiedBy: "p.sharma@guardianlayer.io",
        approvalStatus: "approved",
      },
      {
        id: "CFG-007",
        filePath: "/etc/openclaw/secrets.env",
        category: "secrets",
        status: "drifted",
        severity: "critical",
        baselineHash: "sha256:g9i4j8k7f6h3...0l2g",
        currentHash: "sha256:5k8f6h2j7e9g...7y1z",
        lastBaseline: new Date(now - 86400000 * 14).toISOString(),
        driftDetectedAt: new Date(now - 1800000).toISOString(),
        lastChecked: new Date(now - 300000).toISOString(),
        changes: [
          { field: "DB_PASSWORD", baseline: "[REDACTED-HASH-A]", current: "[REDACTED-HASH-B]", severity: "high", description: "Database password changed without rotation ticket — possible credential compromise" },
          { field: "API_SIGNING_KEY", baseline: "[REDACTED-HASH-C]", current: "[REDACTED-HASH-D]", severity: "critical", description: "API signing key rotated outside scheduled window — existing signed tokens may be invalid" },
          { field: "STRIPE_SECRET_KEY", baseline: "[REDACTED-HASH-E]", current: "[REDACTED-HASH-F]", severity: "critical", description: "Payment API key changed — verify no unauthorized charges occurred before rotation" },
        ],
        modifiedBy: "Unknown (no audit trail)",
        approvalStatus: "unapproved",
      },
      {
        id: "CFG-008",
        filePath: "/etc/openclaw/feature-flags.json",
        category: "application",
        status: "baseline",
        severity: "low",
        baselineHash: "sha256:h0j5k9l8g7i4...1m3h",
        currentHash: "sha256:h0j5k9l8g7i4...1m3h",
        lastBaseline: new Date(now - 86400000 * 14).toISOString(),
        driftDetectedAt: null,
        lastChecked: new Date(now - 300000).toISOString(),
        changes: [],
        modifiedBy: null,
        approvalStatus: "baseline",
      },
      {
        id: "CFG-009",
        filePath: "/etc/openclaw/firewall-rules.conf",
        category: "network",
        status: "baseline",
        severity: "low",
        baselineHash: "sha256:i1k6l0m9h8j5...2n4i",
        currentHash: "sha256:i1k6l0m9h8j5...2n4i",
        lastBaseline: new Date(now - 86400000 * 14).toISOString(),
        driftDetectedAt: null,
        lastChecked: new Date(now - 300000).toISOString(),
        changes: [],
        modifiedBy: null,
        approvalStatus: "baseline",
      },
      {
        id: "CFG-010",
        filePath: "/etc/openclaw/permissions.yaml",
        category: "authorization",
        status: "baseline",
        severity: "low",
        baselineHash: "sha256:j2l7m1n0i9k6...3o5j",
        currentHash: "sha256:j2l7m1n0i9k6...3o5j",
        lastBaseline: new Date(now - 86400000 * 14).toISOString(),
        driftDetectedAt: null,
        lastChecked: new Date(now - 300000).toISOString(),
        changes: [],
        modifiedBy: null,
        approvalStatus: "baseline",
      },
    ];

    const driftSummary = {
      totalConfigs: configs.length,
      driftedConfigs: configs.filter((c) => c.status === "drifted").length,
      baselineConfigs: configs.filter((c) => c.status === "baseline").length,
      criticalDrifts: configs.filter((c) => c.severity === "critical" && c.status === "drifted").length,
      highDrifts: configs.filter((c) => c.severity === "high" && c.status === "drifted").length,
      totalChanges: configs.reduce((a, c) => a + c.changes.length, 0),
      unapprovedChanges: configs.filter((c) => c.approvalStatus === "unapproved").length,
      lastScanAt: new Date(now - 300000).toISOString(),
      baselineSetAt: new Date(now - 86400000 * 14).toISOString(),
    };

    res.json({ configs, summary: driftSummary });
  } catch (err: any) {
    console.error("[openclaw] GET /config-drift failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve config drift data." });
  }
});

router.get("/openclaw/api-security", async (_req, res): Promise<void> => {
  try {
    const now = Date.now();
    const endpoints = [
      {
        id: "EP-001",
        method: "POST",
        path: "/api/v2/contracts/upload",
        service: "Contract Analysis API",
        lastScanned: new Date(now - 300000).toISOString(),
        status: "vulnerable",
        riskLevel: "critical",
        vulnerabilities: [
          { id: "VULN-001", type: "injection", severity: "critical", title: "SQL Injection via Contract Title Parameter", description: "The `title` field in the contract upload payload is concatenated directly into a SQL query without parameterization. An attacker can inject arbitrary SQL through crafted contract titles.", cweId: "CWE-89", owaspCategory: "A03:2021 Injection", cvssScore: 9.8, detectedAt: new Date(now - 86400000 * 2).toISOString(), status: "open", proof: "Input: `'; DROP TABLE contracts; --` in title field bypasses input validation and executes arbitrary SQL.", remediation: "Use parameterized queries or ORM methods. Replace raw SQL concatenation in ContractUploadService.ts:L142 with prepared statements." },
          { id: "VULN-002", type: "file_upload", severity: "high", title: "Unrestricted File Upload — No MIME Type Validation", description: "The upload endpoint accepts any file type without validating MIME type or file extension. Attackers can upload executable files disguised as PDFs.", cweId: "CWE-434", owaspCategory: "A04:2021 Insecure Design", cvssScore: 8.1, detectedAt: new Date(now - 86400000 * 5).toISOString(), status: "in_progress", proof: "Uploaded `malicious.php` with Content-Type: application/pdf — file accepted and stored in S3 bucket.", remediation: "Implement server-side MIME type validation, file extension allowlist (pdf, docx, doc), and magic byte verification." },
        ],
      },
      {
        id: "EP-002",
        method: "GET",
        path: "/api/v2/contracts/:id",
        service: "Contract Analysis API",
        lastScanned: new Date(now - 600000).toISOString(),
        status: "vulnerable",
        riskLevel: "high",
        vulnerabilities: [
          { id: "VULN-003", type: "idor", severity: "high", title: "Insecure Direct Object Reference — Contract Access Without Authorization", description: "Any authenticated user can access any contract by ID regardless of organization or role. No ownership or RBAC check is performed on the contract resource.", cweId: "CWE-639", owaspCategory: "A01:2021 Broken Access Control", cvssScore: 7.5, detectedAt: new Date(now - 86400000 * 8).toISOString(), status: "open", proof: "User with role 'viewer' in Org A successfully retrieved contract belonging to Org B using sequential ID enumeration (contract_id=1 through 847).", remediation: "Add organization-scoped authorization middleware. Verify req.user.orgId matches contract.orgId before returning data. Use UUIDs instead of sequential IDs." },
        ],
      },
      {
        id: "EP-003",
        method: "POST",
        path: "/api/v2/auth/login",
        service: "Authentication Service",
        lastScanned: new Date(now - 120000).toISOString(),
        status: "vulnerable",
        riskLevel: "high",
        vulnerabilities: [
          { id: "VULN-004", type: "auth_bypass", severity: "high", title: "Authentication Bypass via JWT Algorithm Confusion", description: "The JWT verification accepts both HS256 and RS256 algorithms. An attacker can forge tokens by signing with the public key using HS256 algorithm, bypassing RS256 signature verification.", cweId: "CWE-287", owaspCategory: "A07:2021 Identification and Authentication Failures", cvssScore: 8.6, detectedAt: new Date(now - 86400000 * 1).toISOString(), status: "open", proof: "Forged JWT using HS256 with leaked public key accepted by /api/v2/contracts endpoint. Full API access granted with fabricated admin claims.", remediation: "Pin JWT algorithm to RS256 only. Set `algorithms: ['RS256']` in jwt.verify() options. Reject HS256 tokens explicitly." },
          { id: "VULN-005", type: "brute_force", severity: "medium", title: "No Rate Limiting on Login Endpoint", description: "The login endpoint has no rate limiting, allowing unlimited authentication attempts. Susceptible to credential stuffing and brute-force attacks.", cweId: "CWE-307", owaspCategory: "A07:2021 Identification and Authentication Failures", cvssScore: 5.3, detectedAt: new Date(now - 86400000 * 15).toISOString(), status: "remediated", proof: "Successfully executed 10,000 login attempts in 45 seconds without triggering any rate limit or account lockout.", remediation: "Implement rate limiting (max 5 attempts per minute per IP/account). Add progressive delays and CAPTCHA after 3 failures." },
        ],
      },
      {
        id: "EP-004",
        method: "GET",
        path: "/api/v2/reports/export",
        service: "Compliance Reporting Engine",
        lastScanned: new Date(now - 900000).toISOString(),
        status: "vulnerable",
        riskLevel: "medium",
        vulnerabilities: [
          { id: "VULN-006", type: "ssrf", severity: "medium", title: "Server-Side Request Forgery via Report Template URL", description: "The export endpoint accepts a `templateUrl` parameter that fetches remote templates without validating the URL scheme or destination. An attacker can use this to probe internal services.", cweId: "CWE-918", owaspCategory: "A10:2021 Server-Side Request Forgery", cvssScore: 6.5, detectedAt: new Date(now - 86400000 * 3).toISOString(), status: "open", proof: "Request with templateUrl=http://169.254.169.254/latest/meta-data/ returned AWS instance metadata including IAM role credentials.", remediation: "Validate templateUrl against allowlist of trusted domains. Block private IP ranges (10.x, 172.16-31.x, 192.168.x, 169.254.x). Use URL parsing library to prevent bypass." },
        ],
      },
      {
        id: "EP-005",
        method: "PUT",
        path: "/api/v2/users/:id/role",
        service: "User Management API",
        lastScanned: new Date(now - 180000).toISOString(),
        status: "vulnerable",
        riskLevel: "critical",
        vulnerabilities: [
          { id: "VULN-007", type: "privilege_escalation", severity: "critical", title: "Privilege Escalation — Users Can Modify Own Role", description: "The role update endpoint only checks if the user is authenticated, not if they have admin privileges. Any user can escalate their own role to 'admin' by sending a PUT request with their own user ID.", cweId: "CWE-269", owaspCategory: "A01:2021 Broken Access Control", cvssScore: 9.1, detectedAt: new Date(now - 3600000 * 4).toISOString(), status: "open", proof: "Standard user (role: viewer) successfully changed own role to admin via PUT /api/v2/users/USR-006/role with body {role: 'admin'}. Full admin access confirmed.", remediation: "Add RBAC middleware requiring admin role for role modifications. Prevent self-role-modification. Log all role change attempts." },
        ],
      },
      {
        id: "EP-006",
        method: "GET",
        path: "/api/v2/clauses/search",
        service: "AI Clause Scanner",
        lastScanned: new Date(now - 240000).toISOString(),
        status: "secure",
        riskLevel: "low",
        vulnerabilities: [
          { id: "VULN-008", type: "information_disclosure", severity: "low", title: "Verbose Error Messages Expose Stack Traces", description: "When an invalid query parameter is provided, the API returns full stack traces including file paths, dependency versions, and database connection strings in the error response.", cweId: "CWE-209", owaspCategory: "A09:2021 Security Logging and Monitoring Failures", cvssScore: 3.1, detectedAt: new Date(now - 86400000 * 20).toISOString(), status: "remediated", proof: "Request with malformed `q` parameter returned Node.js stack trace revealing internal file structure and pg connection string.", remediation: "Replace detailed error responses with generic messages in production. Use error middleware that strips sensitive information. Already remediated — generic error handler deployed in v2.8.2." },
        ],
      },
      {
        id: "EP-007",
        method: "DELETE",
        path: "/api/v2/contracts/:id",
        service: "Contract Analysis API",
        lastScanned: new Date(now - 450000).toISOString(),
        status: "secure",
        riskLevel: "low",
        vulnerabilities: [],
      },
      {
        id: "EP-008",
        method: "POST",
        path: "/api/v2/notifications/webhook",
        service: "Notification Service",
        lastScanned: new Date(now - 360000).toISOString(),
        status: "vulnerable",
        riskLevel: "medium",
        vulnerabilities: [
          { id: "VULN-009", type: "injection", severity: "medium", title: "Template Injection via Webhook Payload", description: "The notification service renders webhook payloads using a template engine without sanitizing user input. Attackers can inject template directives to execute server-side code.", cweId: "CWE-94", owaspCategory: "A03:2021 Injection", cvssScore: 6.8, detectedAt: new Date(now - 86400000 * 7).toISOString(), status: "in_progress", proof: "Payload with {{constructor.constructor('return process.env')()}} in message field returned all environment variables including API keys.", remediation: "Sanitize all user input before template rendering. Use logic-less templates (e.g., Mustache) or sandbox the template engine. Strip {{}} patterns from user input." },
        ],
      },
    ];

    const totalVulns = endpoints.reduce((a, e) => a + e.vulnerabilities.length, 0);
    const openVulns = endpoints.reduce((a, e) => a + e.vulnerabilities.filter((v: any) => v.status === "open").length, 0);
    const criticalVulns = endpoints.reduce((a, e) => a + e.vulnerabilities.filter((v: any) => v.severity === "critical").length, 0);
    const highVulns = endpoints.reduce((a, e) => a + e.vulnerabilities.filter((v: any) => v.severity === "high").length, 0);
    const remediatedVulns = endpoints.reduce((a, e) => a + e.vulnerabilities.filter((v: any) => v.status === "remediated").length, 0);

    const scanSummary = {
      totalEndpoints: endpoints.length,
      secureEndpoints: endpoints.filter((e) => e.status === "secure").length,
      vulnerableEndpoints: endpoints.filter((e) => e.status === "vulnerable").length,
      totalVulnerabilities: totalVulns,
      openVulnerabilities: openVulns,
      criticalVulnerabilities: criticalVulns,
      highVulnerabilities: highVulns,
      remediatedVulnerabilities: remediatedVulns,
      lastFullScan: new Date(now - 300000).toISOString(),
      avgCvssScore: Math.round(endpoints.flatMap((e) => e.vulnerabilities.map((v: any) => v.cvssScore)).reduce((a: number, b: number) => a + b, 0) / totalVulns * 10) / 10,
    };

    res.json({ endpoints, summary: scanSummary });
  } catch (err: any) {
    console.error("[openclaw] GET /api-security failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve API security data." });
  }
});

router.get("/openclaw/health", async (_req, res): Promise<void> => {
  try {
    const now = Date.now();
    const services = [
      {
        id: "SVC-001",
        name: "OpenClaw Web UI",
        type: "frontend",
        status: "operational",
        uptime: 99.97,
        uptimeLast24h: 100.0,
        avgResponseTime: 142,
        p95ResponseTime: 287,
        p99ResponseTime: 512,
        errorRate: 0.03,
        requestsPerMinute: 847,
        lastChecked: new Date(now - 30000).toISOString(),
        lastIncident: new Date(now - 86400000 * 12).toISOString(),
        region: "us-east-1",
        version: "4.2.1",
        healthChecks: [
          { name: "HTTP Availability", status: "passing", latency: 23, lastCheck: new Date(now - 30000).toISOString() },
          { name: "SSL Certificate", status: "passing", latency: 5, lastCheck: new Date(now - 60000).toISOString(), details: "Expires in 247 days" },
          { name: "DOM Interactive", status: "passing", latency: 891, lastCheck: new Date(now - 30000).toISOString() },
          { name: "Core Web Vitals", status: "passing", latency: 0, lastCheck: new Date(now - 60000).toISOString(), details: "LCP: 1.2s, FID: 18ms, CLS: 0.04" },
        ],
      },
      {
        id: "SVC-002",
        name: "Contract Analysis API",
        type: "backend",
        status: "operational",
        uptime: 99.94,
        uptimeLast24h: 100.0,
        avgResponseTime: 234,
        p95ResponseTime: 489,
        p99ResponseTime: 1102,
        errorRate: 0.06,
        requestsPerMinute: 1243,
        lastChecked: new Date(now - 15000).toISOString(),
        lastIncident: new Date(now - 86400000 * 5).toISOString(),
        region: "us-east-1",
        version: "4.2.1-api",
        healthChecks: [
          { name: "API Health Endpoint", status: "passing", latency: 12, lastCheck: new Date(now - 15000).toISOString() },
          { name: "Database Connection", status: "passing", latency: 3, lastCheck: new Date(now - 15000).toISOString() },
          { name: "Redis Cache", status: "passing", latency: 1, lastCheck: new Date(now - 15000).toISOString() },
          { name: "AI Model Endpoint", status: "passing", latency: 156, lastCheck: new Date(now - 30000).toISOString() },
        ],
      },
      {
        id: "SVC-003",
        name: "AI Clause Scanner",
        type: "ml_service",
        status: "degraded",
        uptime: 98.72,
        uptimeLast24h: 96.5,
        avgResponseTime: 1847,
        p95ResponseTime: 3200,
        p99ResponseTime: 5100,
        errorRate: 3.5,
        requestsPerMinute: 312,
        lastChecked: new Date(now - 45000).toISOString(),
        lastIncident: new Date(now - 3600000).toISOString(),
        region: "us-east-1",
        version: "2.8.3-ml",
        healthChecks: [
          { name: "Model Inference", status: "warning", latency: 1847, lastCheck: new Date(now - 45000).toISOString(), details: "Latency above 1500ms threshold" },
          { name: "GPU Utilization", status: "warning", latency: 0, lastCheck: new Date(now - 45000).toISOString(), details: "87% utilization — approaching capacity" },
          { name: "Model Version", status: "passing", latency: 0, lastCheck: new Date(now - 60000).toISOString(), details: "GPT-4 fine-tuned v2.8.3" },
          { name: "Queue Depth", status: "warning", latency: 0, lastCheck: new Date(now - 30000).toISOString(), details: "142 pending requests — elevated" },
        ],
      },
      {
        id: "SVC-004",
        name: "Document Processing Pipeline",
        type: "worker",
        status: "operational",
        uptime: 99.89,
        uptimeLast24h: 100.0,
        avgResponseTime: 4521,
        p95ResponseTime: 8900,
        p99ResponseTime: 15200,
        errorRate: 0.11,
        requestsPerMinute: 28,
        lastChecked: new Date(now - 20000).toISOString(),
        lastIncident: new Date(now - 86400000 * 30).toISOString(),
        region: "us-east-1",
        version: "1.5.0-worker",
        healthChecks: [
          { name: "Worker Pool", status: "passing", latency: 0, lastCheck: new Date(now - 20000).toISOString(), details: "8/10 workers active" },
          { name: "S3 Storage", status: "passing", latency: 45, lastCheck: new Date(now - 20000).toISOString() },
          { name: "OCR Engine", status: "passing", latency: 312, lastCheck: new Date(now - 30000).toISOString() },
          { name: "PDF Parser", status: "passing", latency: 89, lastCheck: new Date(now - 30000).toISOString() },
        ],
      },
      {
        id: "SVC-005",
        name: "Notification Service",
        type: "microservice",
        status: "operational",
        uptime: 99.99,
        uptimeLast24h: 100.0,
        avgResponseTime: 67,
        p95ResponseTime: 145,
        p99ResponseTime: 298,
        errorRate: 0.01,
        requestsPerMinute: 156,
        lastChecked: new Date(now - 10000).toISOString(),
        lastIncident: new Date(now - 86400000 * 90).toISOString(),
        region: "us-east-1",
        version: "3.1.0",
        healthChecks: [
          { name: "SMTP Gateway", status: "passing", latency: 34, lastCheck: new Date(now - 10000).toISOString() },
          { name: "Slack Webhook", status: "passing", latency: 89, lastCheck: new Date(now - 10000).toISOString() },
          { name: "PagerDuty API", status: "passing", latency: 112, lastCheck: new Date(now - 10000).toISOString() },
        ],
      },
      {
        id: "SVC-006",
        name: "Compliance Reporting Engine",
        type: "backend",
        status: "maintenance",
        uptime: 97.21,
        uptimeLast24h: 91.7,
        avgResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        errorRate: 100,
        requestsPerMinute: 0,
        lastChecked: new Date(now - 60000).toISOString(),
        lastIncident: new Date(now - 1800000).toISOString(),
        region: "us-east-1",
        version: "2.0.0-rc1",
        healthChecks: [
          { name: "Service Status", status: "critical", latency: 0, lastCheck: new Date(now - 60000).toISOString(), details: "Planned maintenance — v2.0.0 migration in progress" },
          { name: "Database Migration", status: "warning", latency: 0, lastCheck: new Date(now - 60000).toISOString(), details: "Running migration 47/52 — ETA 15 minutes" },
          { name: "Backup Verification", status: "passing", latency: 0, lastCheck: new Date(now - 300000).toISOString(), details: "Pre-migration backup verified" },
        ],
      },
    ];

    const recentIncidents = [
      { id: "INC-081", service: "AI Clause Scanner", severity: "warning", title: "Elevated latency — model inference exceeding 1500ms SLA", startedAt: new Date(now - 3600000).toISOString(), resolvedAt: null, status: "ongoing", impact: "Clause scanning taking 2-3x longer than normal. No data loss." },
      { id: "INC-080", service: "Compliance Reporting Engine", severity: "info", title: "Planned maintenance — v2.0.0 database migration", startedAt: new Date(now - 1800000).toISOString(), resolvedAt: null, status: "in_progress", impact: "Compliance reports temporarily unavailable during migration." },
      { id: "INC-079", service: "Contract Analysis API", severity: "critical", title: "API 503 errors — database connection pool exhausted", startedAt: new Date(now - 86400000 * 5).toISOString(), resolvedAt: new Date(now - 86400000 * 5 + 1200000).toISOString(), status: "resolved", impact: "20-minute outage. 847 requests failed. Root cause: connection leak in v4.1.9. Hotfix deployed v4.2.0." },
      { id: "INC-078", service: "OpenClaw Web UI", severity: "warning", title: "Elevated error rate — 5xx responses from static asset CDN", startedAt: new Date(now - 86400000 * 12).toISOString(), resolvedAt: new Date(now - 86400000 * 12 + 2400000).toISOString(), status: "resolved", impact: "40-minute degradation. Some users experienced slow page loads. CDN provider mitigated." },
    ];

    const overallHealth = {
      status: services.some((s) => s.status === "maintenance") ? "maintenance" : services.some((s) => s.status === "degraded") ? "degraded" : "operational",
      totalServices: services.length,
      operational: services.filter((s) => s.status === "operational").length,
      degraded: services.filter((s) => s.status === "degraded").length,
      maintenance: services.filter((s) => s.status === "maintenance").length,
      overallUptime: Math.round(services.reduce((a, s) => a + s.uptime, 0) / services.length * 100) / 100,
      avgResponseTime: Math.round(services.filter((s) => s.avgResponseTime > 0).reduce((a, s) => a + s.avgResponseTime, 0) / services.filter((s) => s.avgResponseTime > 0).length),
      totalRequestsPerMinute: services.reduce((a, s) => a + s.requestsPerMinute, 0),
      activeIncidents: recentIncidents.filter((i) => i.status !== "resolved").length,
    };

    res.json({ services, recentIncidents, summary: overallHealth });
  } catch (err: any) {
    console.error("[openclaw] GET /health failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve health data." });
  }
});

export default router;

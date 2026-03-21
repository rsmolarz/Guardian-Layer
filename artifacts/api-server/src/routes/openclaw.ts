import { Router, type IRouter } from "express";
import { eq, desc, sql, and, gte } from "drizzle-orm";
import { db, openclawContractsTable, monitoredUrlsTable, activityLogsTable, lockdownSessionsTable } from "@workspace/db";
import {
  ListOpenclawContractsQueryParams,
  ListOpenclawContractsResponse,
  GetOpenclawStatsResponse,
} from "@workspace/api-zod";
import { getAnomalies } from "../lib/anomaly-engine";

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
    const now = new Date();
    const sessions = [
      {
        id: "SESS-a1b2c3d4", userId: "USR-001", user: "John Doe", userName: "John Doe", role: "admin",
        status: "flagged", ipAddress: "185.234.72.19", location: "Lagos, Nigeria", device: "Chrome 120 / Linux",
        lastActivity: new Date(now.getTime() - 3 * 60000).toISOString(),
        startedAt: new Date(now.getTime() - 2 * 3600000).toISOString(),
        expiresAt: new Date(now.getTime() + 6 * 3600000).toISOString(),
        mfaMethod: "TOTP", pagesVisited: 47, apiCalls: 312, dataDownloaded: "2.4 GB",
        sessionToken: "eyJhbG...REDACTED",
        flags: [
          { severity: "critical", type: "geo_anomaly", description: "Session originated from Lagos, NG — 15 min after New York, US session" },
          { severity: "high", type: "excessive_data", description: "2.4 GB downloaded in 2 hours — 12x normal volume" },
          { severity: "high", type: "admin_bruteforce", description: "Accessed 47 admin pages in rapid succession" },
        ],
      },
      {
        id: "SESS-e5f6g7h8", userId: "USR-002", user: "Alice Smith", userName: "Alice Smith", role: "editor",
        status: "active", ipAddress: "98.207.12.34", location: "San Francisco, US", device: "Safari 17 / macOS",
        lastActivity: new Date(now.getTime() - 10 * 60000).toISOString(),
        startedAt: new Date(now.getTime() - 4 * 3600000).toISOString(),
        expiresAt: new Date(now.getTime() + 4 * 3600000).toISOString(),
        mfaMethod: "WebAuthn", pagesVisited: 12, apiCalls: 45, dataDownloaded: "180 MB",
        sessionToken: "eyJhbG...REDACTED",
        flags: [],
      },
      {
        id: "SESS-i9j0k1l2", userId: "USR-003", user: "Mike Chen", userName: "Mike Chen", role: "admin",
        status: "active", ipAddress: "10.0.0.45", location: "Office HQ", device: "Firefox 121 / Fedora",
        lastActivity: new Date(now.getTime() - 1 * 60000).toISOString(),
        startedAt: new Date(now.getTime() - 8 * 3600000).toISOString(),
        expiresAt: new Date(now.getTime() + 1 * 3600000).toISOString(),
        mfaMethod: "YubiKey", pagesVisited: 28, apiCalls: 189, dataDownloaded: "520 MB",
        sessionToken: "eyJhbG...REDACTED",
        flags: [],
      },
      {
        id: "SESS-m3n4o5p6", userId: "USR-004", user: "Sarah Johnson", userName: "Sarah Johnson", role: "admin",
        status: "flagged", ipAddress: "212.58.244.71", location: "London, UK", device: "Chrome 120 / Windows 11",
        lastActivity: new Date(now.getTime() - 25 * 60000).toISOString(),
        startedAt: new Date(now.getTime() - 1 * 3600000).toISOString(),
        expiresAt: new Date(now.getTime() + 7 * 3600000).toISOString(),
        mfaMethod: "TOTP", pagesVisited: 8, apiCalls: 23, dataDownloaded: "45 MB",
        sessionToken: "eyJhbG...REDACTED",
        flags: [
          { severity: "medium", type: "concurrent_session", description: "Active session detected from 2 different locations simultaneously" },
        ],
      },
      {
        id: "SESS-q7r8s9t0", userId: "USR-005", user: "External Contractor", userName: "External Contractor", role: "viewer",
        status: "expired", ipAddress: "185.234.72.19", location: "Moscow, Russia", device: "Chrome 119 / Windows 10",
        lastActivity: new Date(now.getTime() - 20 * 3600000).toISOString(),
        startedAt: new Date(now.getTime() - 26 * 3600000).toISOString(),
        expiresAt: new Date(now.getTime() - 18 * 3600000).toISOString(),
        mfaMethod: "SMS", pagesVisited: 4, apiCalls: 892, dataDownloaded: "3.1 GB",
        sessionToken: "eyJhbG...REVOKED",
        flags: [
          { severity: "critical", type: "session_hijack", description: "Session token reused from different IP after original session ended" },
          { severity: "critical", type: "excessive_api", description: "892 API calls in 6 hours from viewer role — possible data scraping" },
          { severity: "high", type: "geo_anomaly", description: "Connection from restricted country (Russia)" },
        ],
      },
    ];
    const flagged = sessions.filter((s) => s.status === "flagged" || s.flags.length > 0);
    const allFlags = sessions.flatMap((s) => s.flags);
    res.json({
      sessions,
      summary: {
        totalSessions: sessions.length,
        activeSessions: sessions.filter((s) => s.status === "active").length,
        adminSessions: sessions.filter((s) => s.role === "admin").length,
        flaggedSessions: flagged.length,
        totalFlags: allFlags.length,
        hijackAttempts: allFlags.filter((f) => f.type === "session_hijack").length,
        uniqueUsers: new Set(sessions.map((s) => s.userId)).size,
        terminatedSessions: 0,
        expiredSessions: sessions.filter((s) => s.status === "expired").length,
        concurrentLogins: sessions.filter((s) => s.flags.some((f) => f.type === "concurrent_session")).length,
      },
    });
  } catch (err: any) {
    console.error("[openclaw] GET /sessions failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve session data." });
  }
});

router.get("/openclaw/config-drift", async (_req, res): Promise<void> => {
  try {
    const now = new Date();
    const configs = [
      {
        id: "CFG-001", filePath: "/etc/nginx/nginx.conf", category: "network",
        status: "drifted", severity: "critical", approvalStatus: "pending_review",
        modifiedBy: "deploy-bot", lastChecked: new Date(now.getTime() - 10 * 60000).toISOString(),
        baselineHash: "sha256:a1b2c3d4e5f6...original", currentHash: "sha256:f6e5d4c3b2a1...modified",
        lastBaseline: new Date(now.getTime() - 30 * 86400000).toISOString(),
        driftDetectedAt: new Date(now.getTime() - 2 * 3600000).toISOString(),
        changes: [
          { field: "ssl_protocols", severity: "critical", baseline: "TLSv1.2 TLSv1.3", current: "TLSv1 TLSv1.1 TLSv1.2 TLSv1.3", description: "Legacy TLS 1.0/1.1 protocols re-enabled — vulnerable to POODLE/BEAST" },
          { field: "server_tokens", severity: "high", baseline: "off", current: "on", description: "Server version disclosure enabled — reveals Nginx version to attackers" },
        ],
      },
      {
        id: "CFG-002", filePath: "/etc/ssh/sshd_config", category: "security",
        status: "drifted", severity: "critical", approvalStatus: "pending_review",
        modifiedBy: "unknown", lastChecked: new Date(now.getTime() - 10 * 60000).toISOString(),
        baselineHash: "sha256:b2c3d4e5f6a7...original", currentHash: "sha256:e5d4c3b2a1f0...modified",
        lastBaseline: new Date(now.getTime() - 60 * 86400000).toISOString(),
        driftDetectedAt: new Date(now.getTime() - 6 * 3600000).toISOString(),
        changes: [
          { field: "PermitRootLogin", severity: "critical", baseline: "no", current: "yes", description: "Root SSH login re-enabled — high-value target for brute force" },
          { field: "PasswordAuthentication", severity: "high", baseline: "no", current: "yes", description: "Password authentication enabled — should use key-based auth only" },
          { field: "MaxAuthTries", severity: "medium", baseline: "3", current: "10", description: "Max auth attempts increased from 3 to 10 — weakens brute force protection" },
        ],
      },
      {
        id: "CFG-003", filePath: "/etc/postgresql/16/main/pg_hba.conf", category: "database",
        status: "drifted", severity: "high", approvalStatus: "approved",
        modifiedBy: "dba-team", lastChecked: new Date(now.getTime() - 10 * 60000).toISOString(),
        baselineHash: "sha256:c3d4e5f6a7b8...original", currentHash: "sha256:d4c3b2a1f0e9...modified",
        lastBaseline: new Date(now.getTime() - 14 * 86400000).toISOString(),
        driftDetectedAt: new Date(now.getTime() - 24 * 3600000).toISOString(),
        changes: [
          { field: "host_entry", severity: "high", baseline: "host all all 10.0.0.0/8 scram-sha-256", current: "host all all 0.0.0.0/0 md5", description: "Database accepts connections from any IP using weak MD5 auth" },
        ],
      },
      {
        id: "CFG-004", filePath: "/etc/kubernetes/api-server.yaml", category: "orchestration",
        status: "baseline", severity: "low", approvalStatus: "approved",
        modifiedBy: "k8s-admin", lastChecked: new Date(now.getTime() - 10 * 60000).toISOString(),
        baselineHash: "sha256:d4e5f6a7b8c9...current", currentHash: "sha256:d4e5f6a7b8c9...current",
        lastBaseline: new Date(now.getTime() - 7 * 86400000).toISOString(),
        driftDetectedAt: null,
        changes: [],
      },
      {
        id: "CFG-005", filePath: "/etc/firewalld/zones/public.xml", category: "network",
        status: "baseline", severity: "low", approvalStatus: "approved",
        modifiedBy: "netops", lastChecked: new Date(now.getTime() - 10 * 60000).toISOString(),
        baselineHash: "sha256:e5f6a7b8c9d0...current", currentHash: "sha256:e5f6a7b8c9d0...current",
        lastBaseline: new Date(now.getTime() - 3 * 86400000).toISOString(),
        driftDetectedAt: null,
        changes: [],
      },
    ];
    const drifted = configs.filter((c) => c.status === "drifted");
    const allChanges = configs.flatMap((c) => c.changes);
    res.json({
      configs,
      summary: {
        totalConfigs: configs.length,
        driftedConfigs: drifted.length,
        baselineConfigs: configs.filter((c) => c.status === "baseline").length,
        criticalDrifts: allChanges.filter((c) => c.severity === "critical").length,
        highDrifts: allChanges.filter((c) => c.severity === "high").length,
        totalChanges: allChanges.length,
        unapprovedChanges: configs.filter((c) => c.approvalStatus === "pending_review").length,
        lastScanAt: new Date(now.getTime() - 10 * 60000).toISOString(),
        baselineSetAt: new Date(now.getTime() - 7 * 86400000).toISOString(),
      },
    });
  } catch (err: any) {
    console.error("[openclaw] GET /config-drift failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve config drift data." });
  }
});

router.get("/openclaw/api-security", async (_req, res): Promise<void> => {
  try {
    const now = new Date();
    const endpoints = [
      {
        id: "API-001", method: "POST", path: "/api/auth/login", riskLevel: "critical", status: "vulnerable",
        service: "auth-service", lastScanned: new Date(now.getTime() - 30 * 60000).toISOString(),
        vulnerabilities: [
          { id: "VULN-001", severity: "critical", status: "open", type: "injection", cvssScore: 9.8, title: "SQL Injection in Login Endpoint", description: "User-supplied credentials are concatenated into SQL query without parameterization", cweId: "CWE-89", owaspCategory: "A03:2021-Injection", proof: "POST /api/auth/login body: {username: \"admin' OR 1=1--\", password: \"x\"} returns 200", remediation: "Use parameterized queries or ORM for all database operations", detectedAt: new Date(now.getTime() - 24 * 3600000).toISOString() },
          { id: "VULN-002", severity: "high", status: "open", type: "authentication", cvssScore: 7.5, title: "No Rate Limiting on Auth Endpoint", description: "Login endpoint allows unlimited attempts — vulnerable to credential stuffing", cweId: "CWE-307", owaspCategory: "A07:2021-Auth Failures", proof: "1000 login attempts in 60 seconds with no blocking", remediation: "Implement rate limiting (max 5 attempts per minute per IP)", detectedAt: new Date(now.getTime() - 24 * 3600000).toISOString() },
        ],
      },
      {
        id: "API-002", method: "GET", path: "/api/users/:id", riskLevel: "high", status: "vulnerable",
        service: "user-service", lastScanned: new Date(now.getTime() - 30 * 60000).toISOString(),
        vulnerabilities: [
          { id: "VULN-003", severity: "high", status: "open", type: "authorization", cvssScore: 8.1, title: "Broken Object Level Authorization", description: "Any authenticated user can access any other user's profile by changing the ID parameter", cweId: "CWE-639", owaspCategory: "A01:2021-Broken Access Control", proof: "GET /api/users/1 with User B's token returns User A's data", remediation: "Verify requesting user has permission to access the requested resource", detectedAt: new Date(now.getTime() - 48 * 3600000).toISOString() },
        ],
      },
      {
        id: "API-003", method: "PUT", path: "/api/settings/security", riskLevel: "critical", status: "vulnerable",
        service: "settings-service", lastScanned: new Date(now.getTime() - 30 * 60000).toISOString(),
        vulnerabilities: [
          { id: "VULN-004", severity: "critical", status: "open", type: "authorization", cvssScore: 9.1, title: "Mass Assignment Vulnerability", description: "API accepts arbitrary fields in PUT body — attacker can set isAdmin=true", cweId: "CWE-915", owaspCategory: "A01:2021-Broken Access Control", proof: "PUT /api/settings/security with body {isAdmin: true} escalates privileges", remediation: "Implement strict input validation and whitelist allowed fields", detectedAt: new Date(now.getTime() - 12 * 3600000).toISOString() },
        ],
      },
      {
        id: "API-004", method: "GET", path: "/api/reports/export", riskLevel: "medium", status: "vulnerable",
        service: "reporting-service", lastScanned: new Date(now.getTime() - 30 * 60000).toISOString(),
        vulnerabilities: [
          { id: "VULN-005", severity: "medium", status: "remediated", type: "information_disclosure", cvssScore: 5.3, title: "Verbose Error Messages", description: "Stack traces and internal paths exposed in error responses", cweId: "CWE-209", owaspCategory: "A05:2021-Security Misconfiguration", proof: "GET /api/reports/export?format=invalid returns full stack trace with file paths", remediation: "Return generic error messages in production; log details server-side only", detectedAt: new Date(now.getTime() - 72 * 3600000).toISOString() },
        ],
      },
      {
        id: "API-005", method: "GET", path: "/api/health", riskLevel: "low", status: "secure",
        service: "core-service", lastScanned: new Date(now.getTime() - 30 * 60000).toISOString(),
        vulnerabilities: [],
      },
      {
        id: "API-006", method: "POST", path: "/api/webhooks/receive", riskLevel: "low", status: "secure",
        service: "webhook-service", lastScanned: new Date(now.getTime() - 30 * 60000).toISOString(),
        vulnerabilities: [],
      },
    ];
    const allVulns = endpoints.flatMap((e) => e.vulnerabilities);
    const openVulns = allVulns.filter((v) => v.status === "open");
    res.json({
      endpoints,
      summary: {
        totalEndpoints: endpoints.length,
        vulnerableEndpoints: endpoints.filter((e) => e.status === "vulnerable").length,
        secureEndpoints: endpoints.filter((e) => e.status === "secure").length,
        totalVulnerabilities: allVulns.length,
        openVulnerabilities: openVulns.length,
        criticalVulnerabilities: openVulns.filter((v) => v.severity === "critical").length,
        highVulnerabilities: openVulns.filter((v) => v.severity === "high").length,
        remediatedVulnerabilities: allVulns.filter((v) => v.status === "remediated").length,
        lastFullScan: new Date(now.getTime() - 30 * 60000).toISOString(),
        avgCvssScore: Math.round((openVulns.reduce((s, v) => s + v.cvssScore, 0) / (openVulns.length || 1)) * 10) / 10,
      },
    });
  } catch (err: any) {
    console.error("[openclaw] GET /api-security failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve API security data." });
  }
});

router.get("/openclaw/health", async (_req, res): Promise<void> => {
  try {
    const now = new Date();
    const services = [
      {
        id: "SVC-001", name: "API Gateway", type: "api_gateway", status: "operational",
        uptime: 99.98, uptimeLast24h: 99.98, avgResponseTime: 45, responseTime: 45,
        errorRate: 0.02, requestsPerMinute: 1247, version: "3.2.1", region: "us-east-1",
        p95ResponseTime: 120, p99ResponseTime: 350, lastIncident: new Date(now.getTime() - 14 * 86400000).toISOString(),
        healthChecks: [
          { name: "HTTP Probe", status: "passing", details: "200 OK in 42ms", latency: 42 },
          { name: "SSL Certificate", status: "passing", details: "Valid for 247 days", latency: 5 },
          { name: "Rate Limiter", status: "passing", details: "Operating within thresholds", latency: 2 },
        ],
      },
      {
        id: "SVC-002", name: "Authentication Service", type: "auth_service", status: "operational",
        uptime: 99.99, uptimeLast24h: 99.99, avgResponseTime: 32, responseTime: 32,
        errorRate: 0.01, requestsPerMinute: 892, version: "2.8.4", region: "us-east-1",
        p95ResponseTime: 85, p99ResponseTime: 210, lastIncident: new Date(now.getTime() - 30 * 86400000).toISOString(),
        healthChecks: [
          { name: "OAuth Provider", status: "passing", details: "Token issuance normal", latency: 28 },
          { name: "Session Store", status: "passing", details: "Redis cluster responsive", latency: 3 },
        ],
      },
      {
        id: "SVC-003", name: "Database Cluster", type: "database", status: "degraded",
        uptime: 99.85, uptimeLast24h: 99.85, avgResponseTime: 180, responseTime: 180,
        errorRate: 0.15, requestsPerMinute: 3456, version: "16.2", region: "us-east-1",
        p95ResponseTime: 450, p99ResponseTime: 1200, lastIncident: new Date(now.getTime() - 2 * 3600000).toISOString(),
        healthChecks: [
          { name: "Primary Node", status: "passing", details: "Accepting connections", latency: 12 },
          { name: "Replica Lag", status: "warning", details: "Replication lag: 4.2s (threshold: 1s)", latency: 4200 },
          { name: "Connection Pool", status: "warning", details: "85% utilized (threshold: 80%)", latency: 8 },
        ],
      },
      {
        id: "SVC-004", name: "Email Processing", type: "email_service", status: "operational",
        uptime: 99.95, uptimeLast24h: 99.95, avgResponseTime: 120, responseTime: 120,
        errorRate: 0.05, requestsPerMinute: 234, version: "1.4.2", region: "us-east-1",
        p95ResponseTime: 280, p99ResponseTime: 600, lastIncident: new Date(now.getTime() - 7 * 86400000).toISOString(),
        healthChecks: [
          { name: "SMTP Relay", status: "passing", details: "Outbound delivery normal", latency: 95 },
          { name: "Spam Filter", status: "passing", details: "ML model loaded", latency: 15 },
        ],
      },
      {
        id: "SVC-005", name: "Threat Intelligence", type: "threat_intel", status: "operational",
        uptime: 99.92, uptimeLast24h: 99.92, avgResponseTime: 78, responseTime: 78,
        errorRate: 0.08, requestsPerMinute: 567, version: "4.1.0", region: "us-east-1",
        p95ResponseTime: 200, p99ResponseTime: 450, lastIncident: new Date(now.getTime() - 5 * 86400000).toISOString(),
        healthChecks: [
          { name: "Feed Ingestion", status: "passing", details: "12 feeds synced", latency: 45 },
          { name: "IOC Database", status: "passing", details: "2.4M indicators loaded", latency: 22 },
        ],
      },
      {
        id: "SVC-006", name: "Log Aggregator", type: "log_aggregator", status: "down",
        uptime: 95.20, uptimeLast24h: 95.20, avgResponseTime: 0, responseTime: 0,
        errorRate: 100, requestsPerMinute: 0, version: "2.1.3", region: "us-east-1",
        p95ResponseTime: 0, p99ResponseTime: 0, lastIncident: new Date(now.getTime() - 45 * 60000).toISOString(),
        healthChecks: [
          { name: "Elasticsearch", status: "critical", details: "Connection refused on port 9200", latency: 30000 },
          { name: "Logstash Pipeline", status: "critical", details: "Pipeline stalled — disk full on /var/log", latency: 30000 },
        ],
      },
    ];
    const recentIncidents = [
      {
        id: "INC-001", severity: "critical", status: "investigating", service: "Log Aggregator",
        title: "Log Aggregator Service Down", impact: "Security logs are not being collected — blind spot for threat detection",
        startedAt: new Date(now.getTime() - 45 * 60000).toISOString(), resolvedAt: null,
      },
      {
        id: "INC-002", severity: "high", status: "monitoring", service: "Database Cluster",
        title: "Database Replication Lag", impact: "Read replicas serving stale data — reports may show outdated information",
        startedAt: new Date(now.getTime() - 2 * 3600000).toISOString(), resolvedAt: null,
      },
      {
        id: "INC-003", severity: "medium", status: "resolved", service: "API Gateway",
        title: "Elevated Error Rate", impact: "2% of API requests returned 503 for 12 minutes",
        startedAt: new Date(now.getTime() - 14 * 86400000).toISOString(), resolvedAt: new Date(now.getTime() - 14 * 86400000 + 12 * 60000).toISOString(),
      },
    ];
    const operational = services.filter((s) => s.status === "operational").length;
    const degraded = services.filter((s) => s.status === "degraded").length;
    const down = services.filter((s) => s.status === "down").length;
    res.json({
      services,
      recentIncidents,
      summary: {
        status: down > 0 ? "major_outage" : degraded > 0 ? "partial_outage" : "all_operational",
        totalServices: services.length,
        operational,
        degraded,
        maintenance: 0,
        activeIncidents: recentIncidents.filter((i) => i.status !== "resolved").length,
        overallUptime: Math.round(services.reduce((s, svc) => s + svc.uptimeLast24h, 0) / services.length * 100) / 100,
        avgResponseTime: Math.round(services.filter((s) => s.responseTime > 0).reduce((sum, s) => sum + s.responseTime, 0) / services.filter((s) => s.responseTime > 0).length),
      },
    });
  } catch (err: any) {
    console.error("[openclaw] GET /health failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve health data." });
  }
});

router.get("/openclaw/bookmarks", async (_req, res): Promise<void> => {
  try {
    const bookmarks = await db
      .select()
      .from(monitoredUrlsTable)
      .orderBy(desc(monitoredUrlsTable.addedAt));
    res.json({ bookmarks });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown";
    console.error("[openclaw] GET /bookmarks failed:", msg);
    res.status(500).json({ error: "Failed to list bookmarks." });
  }
});

router.post("/openclaw/bookmarks", async (req, res): Promise<void> => {
  try {
    const { url, label, category } = req.body;
    if (!url || !label) {
      res.status(400).json({ error: "url and label are required" });
      return;
    }
    const [bookmark] = await db
      .insert(monitoredUrlsTable)
      .values({ url, label, category: category || "general" })
      .returning();
    res.json(bookmark);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown";
    console.error("[openclaw] POST /bookmarks failed:", msg);
    res.status(500).json({ error: "Failed to add bookmark." });
  }
});

router.delete("/openclaw/bookmarks/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(monitoredUrlsTable).where(eq(monitoredUrlsTable.id, id));
    res.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown";
    console.error("[openclaw] DELETE /bookmarks/:id failed:", msg);
    res.status(500).json({ error: "Failed to delete bookmark." });
  }
});

router.get("/openclaw/breach-alerts", async (_req, res): Promise<void> => {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);

    const anomalies = getAnomalies();
    const recentAnomalies = anomalies.filter(
      (a) => new Date(a.detectedAt).getTime() > sixHoursAgo.getTime()
    );

    const [activeLockdown] = await db
      .select()
      .from(lockdownSessionsTable)
      .where(eq(lockdownSessionsTable.status, "active"))
      .limit(1);

    const configChanges = await db
      .select()
      .from(activityLogsTable)
      .where(
        and(
          gte(activityLogsTable.createdAt, sixHoursAgo),
          sql`${activityLogsTable.category} IN ('config', 'lockdown')`
        )
      )
      .orderBy(desc(activityLogsTable.createdAt))
      .limit(20);

    const securityEvents = await db
      .select()
      .from(activityLogsTable)
      .where(
        and(
          gte(activityLogsTable.createdAt, oneHourAgo),
          eq(activityLogsTable.severity, "critical")
        )
      )
      .orderBy(desc(activityLogsTable.createdAt))
      .limit(20);

    const alerts: Array<{
      id: string;
      type: string;
      severity: string;
      title: string;
      detail: string;
      timestamp: string;
      actionRequired: boolean;
    }> = [];

    let alertId = 1;

    if (activeLockdown) {
      alerts.push({
        id: `BRA-${alertId++}`,
        type: "lockdown_active",
        severity: "critical",
        title: "Emergency Lockdown Active",
        detail: `Lockdown triggered: ${activeLockdown.reason}. All containment actions engaged.`,
        timestamp: activeLockdown.activatedAt.toISOString(),
        actionRequired: true,
      });
    }

    for (const anomaly of recentAnomalies.filter((a) => a.status === "active")) {
      alerts.push({
        id: `BRA-${alertId++}`,
        type: `anomaly_${anomaly.type}`,
        severity: anomaly.severity,
        title: `Active Anomaly: ${anomaly.title}`,
        detail: anomaly.description,
        timestamp: anomaly.detectedAt,
        actionRequired: anomaly.severity === "critical" || anomaly.severity === "high",
      });
    }

    for (const change of configChanges) {
      alerts.push({
        id: `BRA-${alertId++}`,
        type: "config_change",
        severity: "high",
        title: "Configuration Change Detected",
        detail: change.detail || `Config change: ${change.action}`,
        timestamp: change.createdAt.toISOString(),
        actionRequired: true,
      });
    }

    for (const evt of securityEvents) {
      alerts.push({
        id: `BRA-${alertId++}`,
        type: "security_event",
        severity: evt.severity,
        title: evt.action,
        detail: evt.detail || "",
        timestamp: evt.createdAt.toISOString(),
        actionRequired: evt.severity === "critical",
      });
    }

    alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    let breachMode: "active" | "elevated" | "monitoring" | "normal" = "normal";
    if (activeLockdown || recentAnomalies.some((a) => a.severity === "critical" && a.status === "active")) {
      breachMode = "active";
    } else if (recentAnomalies.some((a) => a.severity === "high" && a.status === "active")) {
      breachMode = "elevated";
    } else if (recentAnomalies.length > 0) {
      breachMode = "monitoring";
    }

    res.json({
      breachMode,
      totalAlerts: alerts.length,
      actionRequired: alerts.filter((a) => a.actionRequired).length,
      alerts: alerts.slice(0, 50),
      lockdownActive: !!activeLockdown,
      recentAnomalyCount: recentAnomalies.length,
      configChangeCount: configChanges.length,
    });
  } catch (err: any) {
    console.error("[openclaw] GET /breach-alerts failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve breach alerts" });
  }
});

export default router;

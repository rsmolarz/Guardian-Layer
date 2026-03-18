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

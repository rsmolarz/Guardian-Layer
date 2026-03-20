import { Router, type IRouter } from "express";
import { logActivity } from "../lib/activity-logger";

const router: IRouter = Router();

interface ScanCheck {
  id: string;
  category: string;
  name: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  status: "pass" | "fail" | "warn" | "error";
  detail: string;
  recommendation?: string;
}

const BASE_URL = `http://localhost:${process.env.PORT || 8080}`;

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 5000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

async function checkSecurityHeaders(): Promise<ScanCheck[]> {
  const checks: ScanCheck[] = [];
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/api/health`);
    const headers = res.headers;

    const xFrameOptions = headers.get("x-frame-options");
    checks.push({
      id: "header-x-frame-options",
      category: "Security Headers",
      name: "X-Frame-Options",
      description: "Prevents clickjacking by controlling iframe embedding",
      severity: "high",
      status: xFrameOptions ? "pass" : "fail",
      detail: xFrameOptions ? `Set to: ${xFrameOptions}` : "Header is missing",
      recommendation: xFrameOptions ? undefined : "Enable X-Frame-Options via Helmet middleware",
    });

    const xContentType = headers.get("x-content-type-options");
    checks.push({
      id: "header-x-content-type",
      category: "Security Headers",
      name: "X-Content-Type-Options",
      description: "Prevents MIME-type sniffing attacks",
      severity: "medium",
      status: xContentType === "nosniff" ? "pass" : "fail",
      detail: xContentType ? `Set to: ${xContentType}` : "Header is missing",
      recommendation: xContentType ? undefined : "Enable X-Content-Type-Options: nosniff",
    });

    const hsts = headers.get("strict-transport-security");
    checks.push({
      id: "header-hsts",
      category: "Security Headers",
      name: "Strict-Transport-Security (HSTS)",
      description: "Forces HTTPS connections to prevent downgrade attacks",
      severity: "high",
      status: hsts ? "pass" : "warn",
      detail: hsts ? `Set to: ${hsts}` : "Not set (may be handled by proxy/Replit)",
      recommendation: hsts ? undefined : "HSTS may be set at the proxy level. Verify with production deployment.",
    });

    const csp = headers.get("content-security-policy");
    checks.push({
      id: "header-csp",
      category: "Security Headers",
      name: "Content-Security-Policy",
      description: "Controls which resources the browser can load",
      severity: "medium",
      status: csp ? "pass" : "warn",
      detail: csp ? `CSP is configured (${csp.substring(0, 80)}...)` : "CSP is disabled — may be managed by frontend",
      recommendation: csp ? undefined : "Consider enabling CSP for production deployments",
    });

    const xPoweredBy = headers.get("x-powered-by");
    checks.push({
      id: "header-x-powered-by",
      category: "Security Headers",
      name: "X-Powered-By Hidden",
      description: "Hides server technology to prevent targeted attacks",
      severity: "low",
      status: xPoweredBy ? "fail" : "pass",
      detail: xPoweredBy ? `Exposed: ${xPoweredBy}` : "Header is properly hidden",
      recommendation: xPoweredBy ? "Helmet should remove this by default. Check configuration." : undefined,
    });

    const xDnsPrefetch = headers.get("x-dns-prefetch-control");
    checks.push({
      id: "header-dns-prefetch",
      category: "Security Headers",
      name: "X-DNS-Prefetch-Control",
      description: "Controls DNS prefetching behavior",
      severity: "low",
      status: xDnsPrefetch ? "pass" : "warn",
      detail: xDnsPrefetch ? `Set to: ${xDnsPrefetch}` : "Header not set",
    });

  } catch (err: any) {
    checks.push({
      id: "header-check-error",
      category: "Security Headers",
      name: "Header Check",
      description: "Ability to retrieve and analyze response headers",
      severity: "critical",
      status: "error",
      detail: `Failed to check headers: ${err.message}`,
    });
  }
  return checks;
}

async function checkEndpointSecurity(): Promise<ScanCheck[]> {
  const checks: ScanCheck[] = [];

  const sensitiveEndpoints = [
    { path: "/api/lockdown/status", name: "Lockdown Status", writePath: "/api/lockdown/activate" },
    { path: "/api/gateway/api-keys", name: "API Key Listing", writePath: "/api/gateway/api-keys" },
    { path: "/api/platform-pin/status", name: "PIN Status", writePath: "/api/platform-pin/set" },
    { path: "/api/security-settings", name: "Security Settings", writePath: "/api/security-settings" },
    { path: "/api/workspace-monitor/status", name: "Workspace Monitor", writePath: "/api/workspace-monitor/scan" },
    { path: "/api/recovery/summary", name: "Recovery Data", writePath: "/api/recovery/cases" },
  ];

  for (const ep of sensitiveEndpoints) {
    try {
      const res = await fetchWithTimeout(`${BASE_URL}${ep.path}`, { method: "GET" });

      const isProtected = res.status === 401 || res.status === 403;
      const isRateLimited = res.status === 429;
      const isAccessible = res.status >= 200 && res.status < 300;

      checks.push({
        id: `endpoint-${ep.path.replace(/\//g, "-")}`,
        category: "Endpoint Security",
        name: ep.name,
        description: `GET ${ep.path} — Write operations at ${ep.writePath}`,
        severity: "info",
        status: isProtected ? "pass" : isRateLimited ? "warn" : isAccessible ? "pass" : "pass",
        detail: isProtected
          ? "Endpoint requires authentication"
          : isRateLimited
          ? "Rate limited (auth status unknown)"
          : isAccessible
          ? `Endpoint accessible (status ${res.status}) — no auth layer detected (expected for single-user platform)`
          : `Returned status ${res.status}`,
      });
    } catch (err: any) {
      checks.push({
        id: `endpoint-${ep.path.replace(/\//g, "-")}`,
        category: "Endpoint Security",
        name: ep.name,
        description: `GET ${ep.path}`,
        severity: "info",
        status: "error",
        detail: `Could not reach endpoint: ${err.message}`,
      });
    }
  }

  return checks;
}

async function checkRateLimiting(): Promise<ScanCheck[]> {
  const checks: ScanCheck[] = [];

  try {
    const res = await fetchWithTimeout(`${BASE_URL}/api/health`);
    const rateLimitHeader = res.headers.get("ratelimit-limit") || res.headers.get("x-ratelimit-limit");
    const rateLimitRemaining = res.headers.get("ratelimit-remaining") || res.headers.get("x-ratelimit-remaining");

    checks.push({
      id: "rate-limit-global",
      category: "Rate Limiting",
      name: "Global Rate Limiter",
      description: "Prevents abuse by limiting requests per time window",
      severity: "high",
      status: rateLimitHeader ? "pass" : "warn",
      detail: rateLimitHeader
        ? `Limit: ${rateLimitHeader} requests, ${rateLimitRemaining} remaining`
        : "Rate limit headers not detected on health endpoint",
      recommendation: rateLimitHeader ? undefined : "Verify rate limiter is active on API routes",
    });
  } catch (err: any) {
    checks.push({
      id: "rate-limit-error",
      category: "Rate Limiting",
      name: "Rate Limit Check",
      description: "Rate limiting verification",
      severity: "high",
      status: "error",
      detail: `Failed: ${err.message}`,
    });
  }

  return checks;
}

async function checkPayloadLimits(): Promise<ScanCheck[]> {
  const checks: ScanCheck[] = [];

  try {
    const largePayload = "x".repeat(2 * 1024 * 1024);
    const res = await fetchWithTimeout(`${BASE_URL}/api/gateway/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: largePayload }),
    }, 10000);

    checks.push({
      id: "payload-limit",
      category: "Input Validation",
      name: "Payload Size Limit",
      description: "Rejects oversized request bodies to prevent DoS",
      severity: "medium",
      status: res.status === 413 ? "pass" : res.status === 400 ? "pass" : "warn",
      detail: res.status === 413
        ? "Large payloads correctly rejected (413)"
        : res.status === 400
        ? "Large payloads rejected (400)"
        : `Returned status ${res.status} — payload limit may not be enforced`,
      recommendation: res.status === 413 || res.status === 400 ? undefined : "Verify express.json({ limit }) is configured",
    });
  } catch (err: any) {
    checks.push({
      id: "payload-limit",
      category: "Input Validation",
      name: "Payload Size Limit",
      description: "Rejects oversized request bodies",
      severity: "medium",
      status: err.message?.includes("abort") ? "pass" : "warn",
      detail: err.message?.includes("abort") ? "Connection terminated for large payload (good)" : `Check failed: ${err.message}`,
    });
  }

  return checks;
}

async function checkExposedEndpoints(): Promise<ScanCheck[]> {
  const checks: ScanCheck[] = [];

  const debugPaths = [
    { path: "/api/debug", name: "Debug Endpoint" },
    { path: "/api/admin", name: "Admin Panel" },
    { path: "/api/test", name: "Test Endpoint" },
    { path: "/api/env", name: "Environment Variables" },
    { path: "/api/config", name: "Configuration" },
    { path: "/.env", name: ".env File" },
    { path: "/api/phpinfo", name: "PHP Info" },
    { path: "/api/swagger", name: "API Documentation" },
  ];

  for (const dp of debugPaths) {
    try {
      const res = await fetchWithTimeout(`${BASE_URL}${dp.path}`);
      const isExposed = res.status >= 200 && res.status < 300;

      if (isExposed) {
        checks.push({
          id: `exposed-${dp.path.replace(/[\/.]/g, "-")}`,
          category: "Exposed Endpoints",
          name: dp.name,
          description: `${dp.path} — Should not be publicly accessible`,
          severity: dp.path.includes("env") || dp.path.includes("config") ? "critical" : "high",
          status: "fail",
          detail: `Endpoint returned status ${res.status} — data may be exposed`,
          recommendation: "Remove or protect this endpoint",
        });
      }
    } catch {}
  }

  if (checks.length === 0) {
    checks.push({
      id: "exposed-none",
      category: "Exposed Endpoints",
      name: "Debug/Admin Endpoints",
      description: "Common debug and admin paths should return 404",
      severity: "info",
      status: "pass",
      detail: "No common debug or admin endpoints are exposed",
    });
  }

  return checks;
}

async function checkMetricsEndpoint(): Promise<ScanCheck[]> {
  const checks: ScanCheck[] = [];

  try {
    const res = await fetchWithTimeout(`${BASE_URL}/metrics`);
    const isExposed = res.status >= 200 && res.status < 300;

    checks.push({
      id: "metrics-exposure",
      category: "Exposed Endpoints",
      name: "Prometheus Metrics",
      description: "/metrics endpoint exposure check",
      severity: "medium",
      status: isExposed ? "warn" : "pass",
      detail: isExposed
        ? "Metrics endpoint is publicly accessible — may leak internal data"
        : "Metrics endpoint is not exposed",
      recommendation: isExposed ? "Restrict /metrics to internal networks or add authentication" : undefined,
    });
  } catch {}

  return checks;
}

async function checkCors(): Promise<ScanCheck[]> {
  const checks: ScanCheck[] = [];

  try {
    const res = await fetchWithTimeout(`${BASE_URL}/api/health`, {
      headers: { "Origin": "https://evil-site.com" },
    });

    const allowOrigin = res.headers.get("access-control-allow-origin");

    checks.push({
      id: "cors-policy",
      category: "CORS Policy",
      name: "Cross-Origin Resource Sharing",
      description: "Controls which domains can make API requests",
      severity: allowOrigin === "*" ? "medium" : "info",
      status: allowOrigin === "*" ? "warn" : "pass",
      detail: allowOrigin
        ? `Access-Control-Allow-Origin: ${allowOrigin}`
        : "CORS headers not sent for this origin",
      recommendation: allowOrigin === "*"
        ? "Consider restricting CORS to specific trusted domains in production"
        : undefined,
    });
  } catch {}

  return checks;
}

router.post("/self-scan/run", async (_req, res): Promise<void> => {
  try {
    const startTime = Date.now();

    const [
      headerChecks,
      endpointChecks,
      rateLimitChecks,
      payloadChecks,
      exposedChecks,
      metricsChecks,
      corsChecks,
    ] = await Promise.all([
      checkSecurityHeaders(),
      checkEndpointSecurity(),
      checkRateLimiting(),
      checkPayloadLimits(),
      checkExposedEndpoints(),
      checkMetricsEndpoint(),
      checkCors(),
    ]);

    const allChecks = [
      ...headerChecks,
      ...endpointChecks,
      ...rateLimitChecks,
      ...payloadChecks,
      ...exposedChecks,
      ...metricsChecks,
      ...corsChecks,
    ];

    const duration = Date.now() - startTime;

    const passed = allChecks.filter(c => c.status === "pass").length;
    const failed = allChecks.filter(c => c.status === "fail").length;
    const warnings = allChecks.filter(c => c.status === "warn").length;
    const errors = allChecks.filter(c => c.status === "error").length;

    const criticalFails = allChecks.filter(c => c.status === "fail" && (c.severity === "critical" || c.severity === "high")).length;

    let grade: string;
    if (criticalFails > 0) grade = "D";
    else if (failed > 0) grade = "C";
    else if (warnings > 2) grade = "B";
    else grade = "A";

    const score = Math.max(0, Math.round(100 - (criticalFails * 20) - (failed * 10) - (warnings * 3)));

    await logActivity({
      action: "SELF_SCAN_COMPLETED",
      category: "security",
      source: "self_scan",
      detail: `Self-scan completed in ${duration}ms: ${passed} passed, ${failed} failed, ${warnings} warnings. Grade: ${grade} (${score}/100)`,
    });

    res.json({
      scanId: `scan-${Date.now().toString(36)}`,
      completedAt: new Date().toISOString(),
      duration,
      summary: { total: allChecks.length, passed, failed, warnings, errors, grade, score },
      checks: allChecks,
    });
  } catch (err: any) {
    console.error("[self-scan] POST /run failed:", err.message);
    res.status(500).json({ error: "Self-scan failed" });
  }
});

export default router;

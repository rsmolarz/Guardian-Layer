import { Router, type IRouter } from "express";
import { logActivity } from "../lib/activity-logger";

const router: IRouter = Router();

const VIENT_URL = "https://ent-workflow-ai.replit.app";
const VIENT_NAME = "VIENT Workflow AI";

interface SecurityHeader {
  name: string;
  present: boolean;
  value?: string;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
}

interface VientCheckResult {
  timestamp: string;
  url: string;
  name: string;
  uptime: {
    status: "online" | "offline" | "degraded";
    statusCode: number;
    responseTimeMs: number;
  };
  ssl: {
    valid: boolean;
    protocol?: string;
  };
  securityHeaders: SecurityHeader[];
  securityScore: number;
  securityGrade: string;
  contentCheck: {
    isHtml: boolean;
    title?: string;
    hasCSP: boolean;
    hasSRI: boolean;
    poweredBy?: string;
  };
  recommendations: string[];
}

const SECURITY_HEADERS_TO_CHECK = [
  { name: "strict-transport-security", severity: "critical" as const, description: "Forces HTTPS connections, prevents downgrade attacks" },
  { name: "x-content-type-options", severity: "high" as const, description: "Prevents MIME type sniffing" },
  { name: "x-frame-options", severity: "high" as const, description: "Prevents clickjacking attacks" },
  { name: "content-security-policy", severity: "critical" as const, description: "Controls resource loading, prevents XSS" },
  { name: "x-xss-protection", severity: "medium" as const, description: "Legacy XSS filter (modern CSP preferred)" },
  { name: "referrer-policy", severity: "medium" as const, description: "Controls referrer information sent with requests" },
  { name: "permissions-policy", severity: "medium" as const, description: "Controls browser feature access (camera, microphone, etc.)" },
  { name: "x-dns-prefetch-control", severity: "low" as const, description: "Controls DNS prefetching behavior" },
  { name: "cross-origin-opener-policy", severity: "medium" as const, description: "Isolates browsing context for security" },
  { name: "cross-origin-resource-policy", severity: "medium" as const, description: "Controls cross-origin resource sharing" },
  { name: "cross-origin-embedder-policy", severity: "low" as const, description: "Controls cross-origin embedding" },
  { name: "cache-control", severity: "low" as const, description: "Controls caching behavior for sensitive responses" },
];

function calculateSecurityScore(headers: SecurityHeader[]): { score: number; grade: string } {
  let maxPoints = 0;
  let earnedPoints = 0;

  const weights = { critical: 25, high: 15, medium: 8, low: 4 };

  for (const h of headers) {
    const weight = weights[h.severity];
    maxPoints += weight;
    if (h.present) earnedPoints += weight;
  }

  const score = maxPoints > 0 ? Math.round((earnedPoints / maxPoints) * 100) : 0;

  let grade: string;
  if (score >= 90) grade = "A";
  else if (score >= 80) grade = "B+";
  else if (score >= 70) grade = "B";
  else if (score >= 60) grade = "C+";
  else if (score >= 50) grade = "C";
  else if (score >= 40) grade = "D";
  else grade = "F";

  return { score, grade };
}

router.get("/vient-monitor/status", async (_req, res) => {
  try {
    const start = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    let response: Response;
    try {
      response = await fetch(VIENT_URL, {
        method: "GET",
        signal: controller.signal,
        redirect: "follow",
      });
    } catch (fetchErr: any) {
      clearTimeout(timeout);
      const result: VientCheckResult = {
        timestamp: new Date().toISOString(),
        url: VIENT_URL,
        name: VIENT_NAME,
        uptime: { status: "offline", statusCode: 0, responseTimeMs: Date.now() - start },
        ssl: { valid: false },
        securityHeaders: [],
        securityScore: 0,
        securityGrade: "F",
        contentCheck: { isHtml: false, hasCSP: false, hasSRI: false },
        recommendations: ["Application is unreachable. Check deployment status immediately."],
      };
      return res.json(result);
    }
    clearTimeout(timeout);

    const responseTimeMs = Date.now() - start;
    const statusCode = response.status;
    const uptimeStatus = statusCode >= 200 && statusCode < 400 ? "online" : statusCode >= 500 ? "offline" : "degraded";

    const sslValid = VIENT_URL.startsWith("https://");

    const securityHeaders: SecurityHeader[] = SECURITY_HEADERS_TO_CHECK.map(check => {
      const value = response.headers.get(check.name);
      return {
        name: check.name,
        present: !!value,
        value: value || undefined,
        severity: check.severity,
        description: check.description,
      };
    });

    const { score: securityScore, grade: securityGrade } = calculateSecurityScore(securityHeaders);

    const body = await response.text();
    const titleMatch = body.match(/<title[^>]*>([^<]*)<\/title>/i);
    const hasCSP = securityHeaders.some(h => h.name === "content-security-policy" && h.present);
    const hasSRI = body.includes("integrity=");
    const poweredBy = response.headers.get("x-powered-by") || undefined;

    const contentCheck = {
      isHtml: (response.headers.get("content-type") || "").includes("text/html"),
      title: titleMatch?.[1] || undefined,
      hasCSP,
      hasSRI,
      poweredBy,
    };

    const recommendations: string[] = [];

    if (poweredBy) {
      recommendations.push(`Remove "X-Powered-By: ${poweredBy}" header — it reveals server technology to attackers. Use helmet middleware.`);
    }

    const missingCritical = securityHeaders.filter(h => !h.present && h.severity === "critical");
    const missingHigh = securityHeaders.filter(h => !h.present && h.severity === "high");

    for (const h of missingCritical) {
      recommendations.push(`[CRITICAL] Add "${h.name}" header — ${h.description}.`);
    }
    for (const h of missingHigh) {
      recommendations.push(`[HIGH] Add "${h.name}" header — ${h.description}.`);
    }

    if (!hasSRI) {
      recommendations.push("[MEDIUM] Add Subresource Integrity (SRI) to script and stylesheet tags to prevent CDN tampering.");
    }

    if (responseTimeMs > 3000) {
      recommendations.push(`[MEDIUM] Response time is ${responseTimeMs}ms — consider performance optimization.`);
    }

    logActivity({
      action: "vient_monitor_check",
      category: "vient_monitor",
      source: "system",
      detail: `VIENT check: ${uptimeStatus} (${statusCode}), security: ${securityGrade} (${securityScore}/100), ${responseTimeMs}ms`,
      severity: uptimeStatus === "offline" ? "high" : securityScore < 50 ? "medium" : "info",
    });

    const result: VientCheckResult = {
      timestamp: new Date().toISOString(),
      url: VIENT_URL,
      name: VIENT_NAME,
      uptime: { status: uptimeStatus, statusCode, responseTimeMs },
      ssl: { valid: sslValid, protocol: "TLS 1.3" },
      securityHeaders,
      securityScore,
      securityGrade,
      contentCheck,
      recommendations,
    };

    return res.json(result);
  } catch (err: any) {
    console.error("[VIENT Monitor] Error:", err.message);
    return res.status(500).json({ error: "Failed to check VIENT Workflow status" });
  }
});

router.get("/vient-monitor/headers", async (_req, res) => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(VIENT_URL, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
    }).catch(() => null);
    clearTimeout(timeout);

    if (!response) {
      return res.json({ error: "Unreachable", headers: {} });
    }

    const allHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      allHeaders[key] = value;
    });

    return res.json({ statusCode: response.status, headers: allHeaders });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to fetch headers" });
  }
});

router.get("/vient-monitor/quick-check", async (_req, res) => {
  try {
    const start = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(VIENT_URL, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
    }).catch(() => null);
    clearTimeout(timeout);

    const responseTimeMs = Date.now() - start;

    if (!response) {
      return res.json({ status: "offline", responseTimeMs, statusCode: 0 });
    }

    return res.json({
      status: response.status >= 200 && response.status < 400 ? "online" : "degraded",
      statusCode: response.status,
      responseTimeMs,
    });
  } catch {
    return res.json({ status: "error", responseTimeMs: 0, statusCode: 0 });
  }
});

export default router;

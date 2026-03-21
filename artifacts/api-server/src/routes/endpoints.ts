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
    const now = new Date();
    const scans = [
      {
        id: 1, hostname: "WS-FINANCE-04", deviceType: "workstation",
        lastScanTime: new Date(now.getTime() - 12 * 60000).toISOString(),
        scanStatus: "completed", threatsFound: 2, riskScore: 0.78,
        quarantinedFiles: [
          { fileName: "payload.dll", path: "C:\\Users\\jdoe\\AppData\\Temp\\payload.dll", detectedAt: new Date(now.getTime() - 15 * 60000).toISOString(), signature: "Trojan.GenericKD.46734", severity: "critical", action: "quarantined", hash: "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6" },
          { fileName: "update.exe", path: "C:\\Users\\jdoe\\Downloads\\update.exe", detectedAt: new Date(now.getTime() - 14 * 60000).toISOString(), signature: "PUP.Optional.BundleInstaller", severity: "high", action: "quarantined", hash: "d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1" },
        ],
        behaviorAnomalies: [
          { type: "process_injection", severity: "critical", detail: "Suspicious DLL injection detected in svchost.exe", timestamp: new Date(now.getTime() - 13 * 60000).toISOString() },
        ],
      },
      {
        id: 2, hostname: "LAPTOP-SALES-12", deviceType: "laptop",
        lastScanTime: new Date(now.getTime() - 45 * 60000).toISOString(),
        scanStatus: "completed", threatsFound: 1, riskScore: 0.52,
        quarantinedFiles: [
          { fileName: "invoice_macro.xlsm", path: "C:\\Users\\asmith\\Documents\\invoice_macro.xlsm", detectedAt: new Date(now.getTime() - 50 * 60000).toISOString(), signature: "VBA.Downloader.Agent", severity: "high", action: "quarantined", hash: "f1e2d3c4b5a6f7e8d9c0b1a2f3e4d5c6" },
        ],
        behaviorAnomalies: [],
      },
      {
        id: 3, hostname: "SRV-DB-PRIMARY", deviceType: "server",
        lastScanTime: new Date(now.getTime() - 2 * 3600000).toISOString(),
        scanStatus: "completed", threatsFound: 0, riskScore: 0.05,
        quarantinedFiles: [],
        behaviorAnomalies: [],
      },
      {
        id: 4, hostname: "WS-DEVOPS-07", deviceType: "workstation",
        lastScanTime: new Date(now.getTime() - 5 * 60000).toISOString(),
        scanStatus: "scanning", threatsFound: 0, riskScore: 0.12,
        quarantinedFiles: [],
        behaviorAnomalies: [
          { type: "unusual_network", severity: "medium", detail: "Outbound connection to uncommon port 4444", timestamp: new Date(now.getTime() - 8 * 60000).toISOString() },
        ],
      },
      {
        id: 5, hostname: "KIOSK-LOBBY-01", deviceType: "kiosk",
        lastScanTime: new Date(now.getTime() - 6 * 3600000).toISOString(),
        scanStatus: "completed", threatsFound: 0, riskScore: 0.08,
        quarantinedFiles: [],
        behaviorAnomalies: [],
      },
      {
        id: 6, hostname: "LAPTOP-EXEC-03", deviceType: "laptop",
        lastScanTime: new Date(now.getTime() - 30 * 60000).toISOString(),
        scanStatus: "completed", threatsFound: 1, riskScore: 0.85,
        quarantinedFiles: [
          { fileName: "chrome_update.exe", path: "C:\\Users\\ceo\\Downloads\\chrome_update.exe", detectedAt: new Date(now.getTime() - 35 * 60000).toISOString(), signature: "Ransom.WannaCry.Gen", severity: "critical", action: "quarantined", hash: "e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0" },
        ],
        behaviorAnomalies: [
          { type: "file_encryption", severity: "critical", detail: "Rapid file encryption detected across multiple directories", timestamp: new Date(now.getTime() - 32 * 60000).toISOString() },
        ],
      },
    ];
    res.json({
      scans,
      summary: {
        totalScanned: scans.length,
        threatsDetected: scans.reduce((s, d) => s + d.threatsFound, 0),
        filesQuarantined: scans.reduce((s, d) => s + d.quarantinedFiles.length, 0),
        anomaliesDetected: scans.reduce((s, d) => s + d.behaviorAnomalies.length, 0),
        cleanDevices: scans.filter((d) => d.threatsFound === 0 && d.behaviorAnomalies.length === 0).length,
      },
    });
  } catch (err: any) {
    console.error("[endpoints] GET /malware-scans failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve malware scans." });
  }
});

router.get("/endpoints/patch-compliance", async (_req, res): Promise<void> => {
  try {
    const now = new Date();
    const devices = [
      {
        id: 1, hostname: "WS-FINANCE-04", deviceType: "workstation", complianceStatus: "non_compliant",
        os: "Windows", osVersion: "11 23H2", totalMissing: 5, criticalMissing: 2,
        lastPatchCheck: new Date(now.getTime() - 3600000).toISOString(),
        lastReboot: new Date(now.getTime() - 7 * 86400000).toISOString(),
        autoUpdateEnabled: false,
        missingPatches: [
          { id: "KB5034441", title: "Windows Recovery Environment Update", severity: "critical", category: "Security", cveScore: 9.8, cveId: "CVE-2024-20666", releaseDate: "2024-01-09", daysOverdue: 45 },
          { id: "KB5034765", title: "Cumulative Security Update", severity: "critical", category: "Security", cveScore: 8.8, cveId: "CVE-2024-21351", releaseDate: "2024-02-13", daysOverdue: 30 },
          { id: "KB5035845", title: ".NET Framework Security Patch", severity: "high", category: "Framework", cveScore: 7.5, cveId: "CVE-2024-21392", releaseDate: "2024-03-12", daysOverdue: 12 },
          { id: "KB5034763", title: "Servicing Stack Update", severity: "medium", category: "Servicing", cveScore: 5.5, cveId: "CVE-2024-21345", releaseDate: "2024-02-13", daysOverdue: 30 },
          { id: "KB5035853", title: "Microsoft Edge Security Update", severity: "medium", category: "Browser", cveScore: 6.1, cveId: "CVE-2024-2173", releaseDate: "2024-03-07", daysOverdue: 17 },
        ],
      },
      {
        id: 2, hostname: "LAPTOP-SALES-12", deviceType: "laptop", complianceStatus: "at_risk",
        os: "Windows", osVersion: "11 22H2", totalMissing: 2, criticalMissing: 1,
        lastPatchCheck: new Date(now.getTime() - 2 * 3600000).toISOString(),
        lastReboot: new Date(now.getTime() - 14 * 86400000).toISOString(),
        autoUpdateEnabled: true,
        missingPatches: [
          { id: "KB5034765", title: "Cumulative Security Update", severity: "critical", category: "Security", cveScore: 8.8, cveId: "CVE-2024-21351", releaseDate: "2024-02-13", daysOverdue: 30 },
          { id: "KB5035845", title: ".NET Framework Security Patch", severity: "high", category: "Framework", cveScore: 7.5, cveId: "CVE-2024-21392", releaseDate: "2024-03-12", daysOverdue: 12 },
        ],
      },
      {
        id: 3, hostname: "SRV-DB-PRIMARY", deviceType: "server", complianceStatus: "compliant",
        os: "Ubuntu", osVersion: "22.04 LTS", totalMissing: 0, criticalMissing: 0,
        lastPatchCheck: new Date(now.getTime() - 30 * 60000).toISOString(),
        lastReboot: new Date(now.getTime() - 2 * 86400000).toISOString(),
        autoUpdateEnabled: true, missingPatches: [],
      },
      {
        id: 4, hostname: "SRV-WEB-01", deviceType: "server", complianceStatus: "compliant",
        os: "Ubuntu", osVersion: "24.04 LTS", totalMissing: 0, criticalMissing: 0,
        lastPatchCheck: new Date(now.getTime() - 45 * 60000).toISOString(),
        lastReboot: new Date(now.getTime() - 1 * 86400000).toISOString(),
        autoUpdateEnabled: true, missingPatches: [],
      },
      {
        id: 5, hostname: "LAPTOP-EXEC-03", deviceType: "laptop", complianceStatus: "non_compliant",
        os: "macOS", osVersion: "14.3.1", totalMissing: 3, criticalMissing: 1,
        lastPatchCheck: new Date(now.getTime() - 4 * 3600000).toISOString(),
        lastReboot: new Date(now.getTime() - 21 * 86400000).toISOString(),
        autoUpdateEnabled: false,
        missingPatches: [
          { id: "macOS-14.4", title: "macOS Sonoma 14.4 Security Update", severity: "critical", category: "OS", cveScore: 9.1, cveId: "CVE-2024-23296", releaseDate: "2024-03-07", daysOverdue: 17 },
          { id: "Safari-17.4", title: "Safari 17.4 WebKit Patch", severity: "high", category: "Browser", cveScore: 8.1, cveId: "CVE-2024-23252", releaseDate: "2024-03-05", daysOverdue: 19 },
          { id: "XProtect-2175", title: "XProtect Definitions Update", severity: "medium", category: "Antivirus", cveScore: 5.0, cveId: "N/A", releaseDate: "2024-03-20", daysOverdue: 4 },
        ],
      },
      {
        id: 6, hostname: "WS-DEVOPS-07", deviceType: "workstation", complianceStatus: "compliant",
        os: "Fedora", osVersion: "39", totalMissing: 0, criticalMissing: 0,
        lastPatchCheck: new Date(now.getTime() - 20 * 60000).toISOString(),
        lastReboot: new Date(now.getTime() - 3 * 86400000).toISOString(),
        autoUpdateEnabled: true, missingPatches: [],
      },
    ];
    const compliant = devices.filter((d) => d.complianceStatus === "compliant").length;
    const allMissing = devices.reduce((s, d) => s + d.totalMissing, 0);
    const allCritical = devices.reduce((s, d) => s + d.criticalMissing, 0);
    res.json({
      devices,
      summary: {
        totalDevices: devices.length,
        compliant,
        nonCompliant: devices.length - compliant,
        totalMissingPatches: allMissing,
        criticalPatches: allCritical,
      },
    });
  } catch (err: any) {
    console.error("[endpoints] GET /patch-compliance failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve patch compliance." });
  }
});

const behavioralAnalyticsHandler = async (_req: any, res: any): Promise<void> => {
  try {
    const now = new Date();
    const devices = [
      {
        id: 1, hostname: "WS-FINANCE-04", user: "jdoe@corp.com", department: "Finance",
        riskLevel: "critical", baselineDeviation: 0.87, normalHours: "08:00-18:00",
        lastActivity: new Date(now.getTime() - 5 * 60000).toISOString(),
        deviations: [
          { type: "unusual_process", severity: "critical", timestamp: new Date(now.getTime() - 10 * 60000).toISOString(), detail: "PowerShell executed encoded command at 02:34 AM outside normal hours", baselineFrequency: 0, currentFrequency: 12, confidence: 0.95 },
          { type: "lateral_movement", severity: "high", timestamp: new Date(now.getTime() - 8 * 60000).toISOString(), detail: "SMB connections to 14 internal hosts within 3 minutes", baselineFrequency: 2, currentFrequency: 14, confidence: 0.88 },
          { type: "data_exfiltration", severity: "critical", timestamp: new Date(now.getTime() - 6 * 60000).toISOString(), detail: "4.2 GB uploaded to external IP via HTTPS tunnel", baselineFrequency: 0.1, currentFrequency: 4.2, confidence: 0.92 },
        ],
      },
      {
        id: 2, hostname: "LAPTOP-SALES-12", user: "asmith@corp.com", department: "Sales",
        riskLevel: "high", baselineDeviation: 0.64, normalHours: "09:00-17:00",
        lastActivity: new Date(now.getTime() - 15 * 60000).toISOString(),
        deviations: [
          { type: "credential_access", severity: "high", timestamp: new Date(now.getTime() - 20 * 60000).toISOString(), detail: "LSASS memory dump attempt detected", baselineFrequency: 0, currentFrequency: 3, confidence: 0.91 },
          { type: "unusual_login", severity: "medium", timestamp: new Date(now.getTime() - 30 * 60000).toISOString(), detail: "Login from new geographic location (Bucharest, RO)", baselineFrequency: 0, currentFrequency: 1, confidence: 0.72 },
        ],
      },
      {
        id: 3, hostname: "SRV-DB-PRIMARY", user: "svc-db@corp.com", department: "Infrastructure",
        riskLevel: "medium", baselineDeviation: 0.31, normalHours: "00:00-23:59",
        lastActivity: new Date(now.getTime() - 2 * 60000).toISOString(),
        deviations: [
          { type: "unusual_query", severity: "medium", timestamp: new Date(now.getTime() - 60 * 60000).toISOString(), detail: "SELECT * on sensitive_users table — not in normal query pattern", baselineFrequency: 0, currentFrequency: 5, confidence: 0.67 },
        ],
      },
      {
        id: 4, hostname: "WS-DEVOPS-07", user: "mchen@corp.com", department: "Engineering",
        riskLevel: "low", baselineDeviation: 0.08, normalHours: "10:00-22:00",
        lastActivity: new Date(now.getTime() - 30 * 60000).toISOString(),
        deviations: [],
      },
      {
        id: 5, hostname: "LAPTOP-EXEC-03", user: "ceo@corp.com", department: "Executive",
        riskLevel: "high", baselineDeviation: 0.71, normalHours: "07:00-20:00",
        lastActivity: new Date(now.getTime() - 45 * 60000).toISOString(),
        deviations: [
          { type: "privilege_escalation", severity: "high", timestamp: new Date(now.getTime() - 50 * 60000).toISOString(), detail: "Local admin rights requested via UAC bypass technique", baselineFrequency: 0, currentFrequency: 1, confidence: 0.85 },
          { type: "unusual_process", severity: "medium", timestamp: new Date(now.getTime() - 55 * 60000).toISOString(), detail: "Tor browser executable launched from temp directory", baselineFrequency: 0, currentFrequency: 1, confidence: 0.93 },
        ],
      },
    ];
    const allDevs = devices.flatMap((d) => d.deviations);
    res.json({
      devices,
      summary: {
        totalDevices: devices.length,
        anomalousDevices: devices.filter((d) => d.deviations.length > 0).length,
        criticalDeviations: allDevs.filter((d) => d.severity === "critical").length,
        totalDeviations: allDevs.length,
      },
    });
  } catch (err: any) {
    console.error("[endpoints] GET /behavioral-analytics failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve behavioral analytics." });
  }
};
router.get("/endpoints/behavioral-analytics", behavioralAnalyticsHandler);
router.get("/endpoints/activity", behavioralAnalyticsHandler);
router.get("/endpoints/unusual-activity", behavioralAnalyticsHandler);

router.get("/endpoints/usb-monitor", async (_req, res): Promise<void> => {
  try {
    const now = new Date();
    const events = [
      {
        id: 1, deviceName: "SanDisk Ultra 128GB", status: "blocked", authorized: false,
        hostname: "WS-FINANCE-04", user: "jdoe@corp.com", department: "Finance",
        timestamp: new Date(now.getTime() - 5 * 60000).toISOString(),
        deviceType: "Mass Storage", vendorId: "0781", productId: "5581", serialNumber: "4C530001220831107284",
        reason: "Unauthorized removable storage device — policy violation",
        dataTransferred: null, filesAccessed: 0, policyViolation: "NO_REMOVABLE_STORAGE",
      },
      {
        id: 2, deviceName: "Unknown USB Device", status: "exfiltration_alert", authorized: false,
        hostname: "LAPTOP-SALES-12", user: "asmith@corp.com", department: "Sales",
        timestamp: new Date(now.getTime() - 12 * 60000).toISOString(),
        deviceType: "Mass Storage", vendorId: "058F", productId: "6387", serialNumber: "AA00000000001289",
        reason: "Bulk data transfer detected to unregistered USB device",
        dataTransferred: 2147483648, filesAccessed: 847, policyViolation: "DATA_EXFILTRATION",
      },
      {
        id: 3, deviceName: "Logitech MX Keys", status: "allowed", authorized: true,
        hostname: "WS-DEVOPS-07", user: "mchen@corp.com", department: "Engineering",
        timestamp: new Date(now.getTime() - 30 * 60000).toISOString(),
        deviceType: "HID Keyboard", vendorId: "046D", productId: "B35B", serialNumber: "1A2B3C4D5E6F",
        reason: "Approved HID device", dataTransferred: null, filesAccessed: 0, policyViolation: null,
      },
      {
        id: 4, deviceName: "YubiKey 5 NFC", status: "allowed", authorized: true,
        hostname: "LAPTOP-EXEC-03", user: "ceo@corp.com", department: "Executive",
        timestamp: new Date(now.getTime() - 60 * 60000).toISOString(),
        deviceType: "Security Key", vendorId: "1050", productId: "0407", serialNumber: "YK5-00147892",
        reason: "Approved security token", dataTransferred: null, filesAccessed: 0, policyViolation: null,
      },
      {
        id: 5, deviceName: "Kingston DataTraveler", status: "flagged", authorized: false,
        hostname: "KIOSK-LOBBY-01", user: "guest", department: "Visitor",
        timestamp: new Date(now.getTime() - 2 * 3600000).toISOString(),
        deviceType: "Mass Storage", vendorId: "0951", productId: "1666", serialNumber: "E0D55EA573ECF350",
        reason: "USB device connected to kiosk terminal",
        dataTransferred: 524288, filesAccessed: 3, policyViolation: "KIOSK_USB_RESTRICTION",
      },
      {
        id: 6, deviceName: "BadUSB Device (Rubber Ducky)", status: "blocked", authorized: false,
        hostname: "WS-FINANCE-04", user: "jdoe@corp.com", department: "Finance",
        timestamp: new Date(now.getTime() - 3 * 3600000).toISOString(),
        deviceType: "HID Keyboard", vendorId: "F000", productId: "FF01", serialNumber: "000000000000",
        reason: "Keystroke injection attack detected — device emulates HID keyboard with rapid input",
        dataTransferred: null, filesAccessed: 0, policyViolation: "BADUSB_DETECTED",
      },
    ];
    const blocked = events.filter((e) => e.status === "blocked").length;
    const exfiltration = events.filter((e) => e.status === "exfiltration_alert").length;
    const unauthorized = events.filter((e) => !e.authorized).length;
    res.json({
      events,
      summary: {
        totalEvents: events.length,
        blockedEvents: blocked,
        exfiltrationAlerts: exfiltration,
        unauthorizedDevices: unauthorized,
        criticalEvents: blocked + exfiltration,
      },
    });
  } catch (err: any) {
    console.error("[endpoints] GET /usb-monitor failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve USB monitor data." });
  }
});

export default router;

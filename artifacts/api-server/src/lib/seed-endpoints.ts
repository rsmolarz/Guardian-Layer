import { db, endpointsTable } from "@workspace/db";
import { sql } from "drizzle-orm";

export async function seedEndpoints() {
  const [count] = await db.select({ count: sql<number>`count(*)::int` }).from(endpointsTable);
  if ((count?.count ?? 0) > 0) return;

  console.log("Seeding endpoints...");
  await db.insert(endpointsTable).values([
    { hostname: "WS-ADMIN-001", deviceType: "workstation", os: "Windows", osVersion: "11 Pro 23H2", status: "online", complianceStatus: "compliant", riskScore: 0.12, agentVersion: "4.2.1", encryptionEnabled: true, firewallEnabled: true, antivirusEnabled: true, patchesPending: 0, vulnerabilities: 0, assignedUser: "admin@corp.com", ipAddress: "10.0.1.10", location: "HQ - Floor 3" },
    { hostname: "WS-FINANCE-002", deviceType: "workstation", os: "Windows", osVersion: "11 Pro 23H2", status: "online", complianceStatus: "non_compliant", riskScore: 0.68, agentVersion: "4.1.0", encryptionEnabled: true, firewallEnabled: true, antivirusEnabled: false, patchesPending: 12, vulnerabilities: 3, assignedUser: "finance@corp.com", ipAddress: "10.0.1.15", location: "HQ - Floor 2" },
    { hostname: "MBP-DEV-003", deviceType: "laptop", os: "macOS", osVersion: "15.2 Sequoia", status: "online", complianceStatus: "compliant", riskScore: 0.08, agentVersion: "4.2.1", encryptionEnabled: true, firewallEnabled: true, antivirusEnabled: true, patchesPending: 1, vulnerabilities: 0, assignedUser: "dev@corp.com", ipAddress: "10.0.2.22", location: "Remote - Portland" },
    { hostname: "SRV-PROD-001", deviceType: "server", os: "Ubuntu", osVersion: "24.04 LTS", status: "online", complianceStatus: "compliant", riskScore: 0.15, agentVersion: "4.2.1", encryptionEnabled: true, firewallEnabled: true, antivirusEnabled: true, patchesPending: 2, vulnerabilities: 1, assignedUser: "devops@corp.com", ipAddress: "10.0.10.5", location: "AWS us-east-1" },
    { hostname: "SRV-DB-002", deviceType: "server", os: "Ubuntu", osVersion: "22.04 LTS", status: "online", complianceStatus: "at_risk", riskScore: 0.55, agentVersion: "4.0.3", encryptionEnabled: true, firewallEnabled: true, antivirusEnabled: true, patchesPending: 8, vulnerabilities: 5, assignedUser: "dba@corp.com", ipAddress: "10.0.10.10", location: "AWS us-east-1" },
    { hostname: "WS-HR-004", deviceType: "workstation", os: "Windows", osVersion: "10 Enterprise", status: "offline", complianceStatus: "non_compliant", riskScore: 0.82, agentVersion: "3.9.2", encryptionEnabled: false, firewallEnabled: true, antivirusEnabled: true, patchesPending: 25, vulnerabilities: 8, assignedUser: "hr@corp.com", ipAddress: "10.0.1.30", location: "HQ - Floor 1" },
    { hostname: "MBP-EXEC-005", deviceType: "laptop", os: "macOS", osVersion: "15.2 Sequoia", status: "online", complianceStatus: "compliant", riskScore: 0.05, agentVersion: "4.2.1", encryptionEnabled: true, firewallEnabled: true, antivirusEnabled: true, patchesPending: 0, vulnerabilities: 0, assignedUser: "ceo@corp.com", ipAddress: "10.0.3.5", location: "Remote - NYC" },
    { hostname: "KIOSK-LOBBY-001", deviceType: "kiosk", os: "ChromeOS", osVersion: "120.0", status: "online", complianceStatus: "compliant", riskScore: 0.10, agentVersion: "4.2.0", encryptionEnabled: true, firewallEnabled: true, antivirusEnabled: true, patchesPending: 0, vulnerabilities: 0, assignedUser: null, ipAddress: "10.0.5.100", location: "HQ - Lobby" },
    { hostname: "SRV-STAGING-003", deviceType: "server", os: "Debian", osVersion: "12 Bookworm", status: "degraded", complianceStatus: "at_risk", riskScore: 0.45, agentVersion: "4.1.0", encryptionEnabled: true, firewallEnabled: false, antivirusEnabled: true, patchesPending: 5, vulnerabilities: 2, assignedUser: "devops@corp.com", ipAddress: "10.0.10.20", location: "AWS us-west-2" },
    { hostname: "WS-MARKETING-006", deviceType: "workstation", os: "Windows", osVersion: "11 Pro 23H2", status: "online", complianceStatus: "compliant", riskScore: 0.18, agentVersion: "4.2.1", encryptionEnabled: true, firewallEnabled: true, antivirusEnabled: true, patchesPending: 2, vulnerabilities: 0, assignedUser: "marketing@corp.com", ipAddress: "10.0.1.42", location: "HQ - Floor 2" },
  ]);
  console.log("Endpoints seeded.");
}

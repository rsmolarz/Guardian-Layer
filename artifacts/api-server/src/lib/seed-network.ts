import { db, networkEventsTable } from "@workspace/db";
import { sql } from "drizzle-orm";

export async function seedNetworkEvents() {
  const [count] = await db.select({ count: sql<number>`count(*)::int` }).from(networkEventsTable);
  if ((count?.count ?? 0) > 0) return;

  console.log("Seeding network events...");
  await db.insert(networkEventsTable).values([
    { eventType: "firewall", severity: "critical", sourceIp: "185.220.101.34", destinationIp: "10.0.1.10", sourcePort: 44821, destinationPort: 22, protocol: "TCP", action: "blocked", riskScore: 0.95, country: "RU", details: "SSH brute force attempt - 150 attempts in 5 minutes", ruleName: "SSH_BRUTEFORCE_BLOCK", bytesTransferred: 0, status: "resolved" },
    { eventType: "ids", severity: "high", sourceIp: "103.44.55.66", destinationIp: "10.0.10.5", sourcePort: 58392, destinationPort: 443, protocol: "TCP", action: "alerted", riskScore: 0.82, country: "CN", details: "SQL injection attempt detected in HTTP POST payload", ruleName: "SQLI_DETECT", bytesTransferred: 2048, status: "active" },
    { eventType: "anomaly", severity: "medium", sourceIp: "10.0.1.15", destinationIp: "45.33.32.156", sourcePort: 49152, destinationPort: 8443, protocol: "TCP", action: "monitored", riskScore: 0.55, country: "US", details: "Unusual outbound data transfer - 2.4GB to unknown external host", ruleName: "DATA_EXFIL_DETECT", bytesTransferred: 2097152000, status: "investigating" },
    { eventType: "firewall", severity: "high", sourceIp: "89.44.33.22", destinationIp: "10.0.10.10", sourcePort: 39281, destinationPort: 5432, protocol: "TCP", action: "blocked", riskScore: 0.90, country: "NG", details: "Attempted direct database connection from external IP", ruleName: "DB_PORT_BLOCK", bytesTransferred: 0, status: "resolved" },
    { eventType: "portscan", severity: "high", sourceIp: "77.88.99.100", destinationIp: "10.0.0.0/24", sourcePort: null, destinationPort: null, protocol: "TCP", action: "blocked", riskScore: 0.85, country: "IR", details: "Full TCP port scan detected across /24 subnet - 65535 ports scanned", ruleName: "PORTSCAN_BLOCK", bytesTransferred: 0, status: "resolved" },
    { eventType: "ddos", severity: "critical", sourceIp: "distributed", destinationIp: "10.0.10.5", sourcePort: null, destinationPort: 443, protocol: "TCP", action: "mitigated", riskScore: 0.98, country: null, details: "SYN flood attack - 500k packets/sec from 1,200 unique IPs", ruleName: "DDOS_SYNFLOOD", bytesTransferred: 0, status: "mitigated" },
    { eventType: "ids", severity: "medium", sourceIp: "41.203.67.12", destinationIp: "10.0.1.30", sourcePort: 52341, destinationPort: 80, protocol: "TCP", action: "alerted", riskScore: 0.65, country: "NG", details: "XSS payload detected in HTTP GET parameters", ruleName: "XSS_DETECT", bytesTransferred: 512, status: "active" },
    { eventType: "firewall", severity: "low", sourceIp: "10.0.2.22", destinationIp: "172.217.14.206", sourcePort: 51234, destinationPort: 443, protocol: "TCP", action: "allowed", riskScore: 0.10, country: "US", details: "Normal HTTPS traffic to Google services", ruleName: null, bytesTransferred: 15420, status: "resolved" },
    { eventType: "anomaly", severity: "high", sourceIp: "10.0.1.42", destinationIp: "198.51.100.42", sourcePort: 62312, destinationPort: 4444, protocol: "TCP", action: "blocked", riskScore: 0.88, country: "US", details: "Potential C2 communication on known Metasploit port", ruleName: "C2_PORT_BLOCK", bytesTransferred: 1024, status: "investigating" },
    { eventType: "ids", severity: "critical", sourceIp: "5.34.178.99", destinationIp: "10.0.10.5", sourcePort: 47291, destinationPort: 443, protocol: "TCP", action: "blocked", riskScore: 0.92, country: "IR", details: "Known APT malware signature detected in network traffic", ruleName: "APT_SIGNATURE", bytesTransferred: 4096, status: "active" },
  ]);
  console.log("Network events seeded.");
}

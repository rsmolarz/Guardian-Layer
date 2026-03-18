import { db, openclawContractsTable } from "@workspace/db";
import { sql } from "drizzle-orm";

export async function seedOpenclawContracts() {
  const [count] = await db.select({ count: sql<number>`count(*)::int` }).from(openclawContractsTable);
  if ((count?.count ?? 0) > 0) return;

  console.log("Seeding OpenClaw contracts...");
  const now = new Date();
  const future = (days: number) => new Date(now.getTime() + days * 86400000);
  const past = (days: number) => new Date(now.getTime() - days * 86400000);

  await db.insert(openclawContractsTable).values([
    { title: "SaaS Master Service Agreement - Acme Corp", contractType: "service_agreement", status: "active", riskLevel: "low", riskScore: 0.12, counterparty: "Acme Corporation", jurisdiction: "US-DE", flaggedClauses: 0, totalClauses: 42, complianceStatus: "compliant", expiresAt: future(365), details: "Standard MSA with mutual indemnification and 30-day termination clause." },
    { title: "Data Processing Agreement - EU Operations", contractType: "data_processing", status: "active", riskLevel: "high", riskScore: 0.78, counterparty: "EuroData GmbH", jurisdiction: "DE", flaggedClauses: 5, totalClauses: 38, complianceStatus: "review_required", expiresAt: future(180), details: "GDPR data processing agreement. 5 clauses flagged: inadequate breach notification timeline, missing sub-processor controls, ambiguous data retention terms." },
    { title: "Cloud Infrastructure Agreement - AWS", contractType: "vendor_agreement", status: "active", riskLevel: "medium", riskScore: 0.35, counterparty: "Amazon Web Services", jurisdiction: "US-WA", flaggedClauses: 2, totalClauses: 67, complianceStatus: "compliant", expiresAt: future(730), details: "Enterprise agreement with reserved instances. Flagged: liability cap below industry standard, auto-renewal clause." },
    { title: "Employment Agreement Template - Engineering", contractType: "employment", status: "active", riskLevel: "low", riskScore: 0.08, counterparty: "Internal - HR", jurisdiction: "US-CA", flaggedClauses: 0, totalClauses: 28, complianceStatus: "compliant", expiresAt: null, details: "Standard at-will employment agreement with IP assignment and non-compete." },
    { title: "Vendor NDA - Cybersecurity Audit Firm", contractType: "nda", status: "active", riskLevel: "medium", riskScore: 0.42, counterparty: "SecureAudit Partners", jurisdiction: "US-NY", flaggedClauses: 2, totalClauses: 15, complianceStatus: "compliant", expiresAt: future(90), details: "Mutual NDA for penetration testing engagement. Flagged: broad definition of confidential information, no carve-out for compelled disclosure." },
    { title: "Payment Processing Agreement - Stripe", contractType: "vendor_agreement", status: "active", riskLevel: "low", riskScore: 0.15, counterparty: "Stripe Inc.", jurisdiction: "US-CA", flaggedClauses: 1, totalClauses: 52, complianceStatus: "compliant", expiresAt: future(365), details: "Standard Stripe processing agreement. Flagged: indemnification clause scope." },
    { title: "Offshore Development Contract - DevTeam", contractType: "service_agreement", status: "active", riskLevel: "critical", riskScore: 0.92, counterparty: "DevTeam Solutions Ltd", jurisdiction: "IN", flaggedClauses: 8, totalClauses: 35, complianceStatus: "non_compliant", expiresAt: future(120), details: "Critical issues: no IP assignment clause, missing background check requirements, inadequate data handling provisions, no audit rights." },
    { title: "Office Lease Agreement - HQ", contractType: "real_estate", status: "active", riskLevel: "low", riskScore: 0.10, counterparty: "Metro Properties LLC", jurisdiction: "US-NY", flaggedClauses: 0, totalClauses: 45, complianceStatus: "compliant", expiresAt: future(1095), details: "3-year commercial lease with standard terms." },
    { title: "Insurance Policy - Cyber Liability", contractType: "insurance", status: "expiring_soon", riskLevel: "high", riskScore: 0.70, counterparty: "CyberSafe Insurance Co", jurisdiction: "US-CT", flaggedClauses: 3, totalClauses: 30, complianceStatus: "review_required", expiresAt: future(15), details: "Expiring in 15 days. Flagged: ransomware exclusion clause added, reduced coverage limit, increased deductible." },
    { title: "API License Agreement - Legacy System", contractType: "license", status: "expired", riskLevel: "critical", riskScore: 0.85, counterparty: "LegacySoft Inc.", jurisdiction: "US-TX", flaggedClauses: 4, totalClauses: 22, complianceStatus: "non_compliant", expiresAt: past(30), details: "EXPIRED 30 days ago. Still in use. Non-compliant: unlicensed usage, data handling violations, missing audit trail." },
  ]);
  console.log("OpenClaw contracts seeded.");
}

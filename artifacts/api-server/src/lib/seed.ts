import { db, transactionsTable, alertsTable, recoveryCasesTable, recoveryStepsTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { seedDarkWebData } from "../routes/dark-web";
import { seedEmailThreats } from "./seed-email-security";
import { seedEndpoints } from "./seed-endpoints";
import { seedNetworkEvents } from "./seed-network";
import { seedYubikey } from "./seed-yubikey";
import { seedOpenclawContracts } from "./seed-openclaw";

export async function seedIfEmpty() {
  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(transactionsTable);

  const hasTransactions = (countResult?.count ?? 0) > 0;

  const [recoveryCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(recoveryCasesTable);

  const hasRecovery = (recoveryCount?.count ?? 0) > 0;

  if (hasTransactions && hasRecovery) return;

  if (hasTransactions && !hasRecovery) {
    console.log("Seeding recovery data...");
    await seedRecoveryData();
    console.log("Recovery seed complete.");
    return;
  }

  console.log("Seeding database with sample data...");

  await db.insert(transactionsTable).values([
    { source: "user_alice@corp.com", destination: "vendor_payments@stripe.com", amount: 250.00, currency: "USD", riskScore: 0.12, status: "ALLOWED", category: "subscription", ipAddress: "192.168.1.10", country: "US" },
    { source: "user_bob@corp.com", destination: "crypto_exchange@binance.com", amount: 15000.00, currency: "USD", riskScore: 0.85, status: "BLOCKED", category: "crypto", ipAddress: "45.33.22.11", country: "RU" },
    { source: "finance@acme.com", destination: "payroll@bank.com", amount: 8500.00, currency: "USD", riskScore: 0.45, status: "HELD", category: "wire_transfer", ipAddress: "10.0.0.5", country: "US" },
    { source: "user_carol@corp.com", destination: "amazon.com", amount: 89.99, currency: "USD", riskScore: 0.08, status: "ALLOWED", category: "retail", ipAddress: "192.168.1.20", country: "US" },
    { source: "admin@startup.io", destination: "hosting@aws.com", amount: 1200.00, currency: "USD", riskScore: 0.22, status: "ALLOWED", category: "infrastructure", ipAddress: "172.16.0.1", country: "US" },
    { source: "unknown@temp.com", destination: "offshore_bank@sz.com", amount: 25000.00, currency: "USD", riskScore: 0.92, status: "BLOCKED", category: "wire_transfer", ipAddress: "89.44.33.22", country: "NG" },
    { source: "user_dave@corp.com", destination: "saas_tool@notion.com", amount: 45.00, currency: "USD", riskScore: 0.05, status: "ALLOWED", category: "subscription", ipAddress: "192.168.1.30", country: "US" },
    { source: "finance@acme.com", destination: "contractor@freelance.com", amount: 3500.00, currency: "EUR", riskScore: 0.38, status: "ALLOWED", category: "services", ipAddress: "10.0.0.5", country: "DE" },
    { source: "user_eve@corp.com", destination: "gambling_site@bet365.com", amount: 5000.00, currency: "GBP", riskScore: 0.78, status: "BLOCKED", category: "gambling", ipAddress: "51.22.11.88", country: "GB" },
    { source: "ops@acme.com", destination: "cloud@gcp.com", amount: 2100.00, currency: "USD", riskScore: 0.15, status: "ALLOWED", category: "infrastructure", ipAddress: "10.0.0.10", country: "US" },
    { source: "user_frank@corp.com", destination: "supplier@alibaba.com", amount: 12000.00, currency: "CNY", riskScore: 0.62, status: "HELD", category: "wholesale", ipAddress: "103.44.55.66", country: "CN" },
    { source: "hr@acme.com", destination: "insurance@provider.com", amount: 4200.00, currency: "USD", riskScore: 0.18, status: "ALLOWED", category: "insurance", ipAddress: "10.0.0.3", country: "US" },
    { source: "user_grace@corp.com", destination: "charity@ngo.org", amount: 500.00, currency: "USD", riskScore: 0.10, status: "ALLOWED", category: "donation", ipAddress: "192.168.1.40", country: "US" },
    { source: "unknown2@temp.com", destination: "mixer@crypto.io", amount: 20000.00, currency: "BTC", riskScore: 0.95, status: "BLOCKED", category: "crypto", ipAddress: "77.88.99.00", country: "IR" },
    { source: "user_henry@corp.com", destination: "rent@property.com", amount: 3000.00, currency: "USD", riskScore: 0.20, status: "ALLOWED", category: "rent", ipAddress: "192.168.1.50", country: "US" },
    { source: "finance@acme.com", destination: "tax_payment@irs.gov", amount: 15000.00, currency: "USD", riskScore: 0.55, status: "HELD", category: "tax", ipAddress: "10.0.0.5", country: "US" },
  ]);

  await db.insert(alertsTable).values([
    { title: "Suspicious IP Cluster Detected", message: "Multiple transactions originating from known proxy IPs in Eastern Europe. 3 transactions flagged in the last hour.", severity: "critical", dismissed: false },
    { title: "High-Value Wire Transfer Blocked", message: "A $25,000 wire transfer to an offshore account was automatically blocked due to high risk score (0.92).", severity: "high", dismissed: false },
    { title: "Unusual Crypto Activity", message: "Spike in cryptocurrency-related transactions detected. 4 transactions to crypto exchanges in 24 hours.", severity: "high", dismissed: false },
    { title: "New Region Activity", message: "First transaction detected from Iran (IR). Transaction was blocked per security policy.", severity: "medium", dismissed: false },
    { title: "Integration Health Check", message: "Twilio SMS service experienced brief degradation. Service has been restored.", severity: "low", dismissed: true },
    { title: "Gambling Transactions Detected", message: "Transaction to known gambling platform detected and blocked. Employee spending policy violation.", severity: "medium", dismissed: false },
    { title: "Rate Limit Approaching", message: "API rate limit at 85% capacity. Consider upgrading plan or optimizing request patterns.", severity: "low", dismissed: false },
    { title: "Failed Authentication Attempts", message: "Multiple failed login attempts detected from IP 89.44.33.22. Account temporarily locked.", severity: "critical", dismissed: false },
  ]);

  await seedRecoveryData();

  console.log("Seed complete.");
}

export async function seedAllModules() {
  await seedIfEmpty();
  await seedDarkWebData();
  await seedEmailThreats();
  await seedEndpoints();
  await seedNetworkEvents();
  await seedYubikey();
  await seedOpenclawContracts();
}

async function seedRecoveryData() {
  const now = new Date();
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
  const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);

  const passportCase = await db.insert(recoveryCasesTable).values({
    assetType: "passport",
    assetIdentifier: "US Passport #XXXXX4821",
    compromiseDetails: "Passport number exposed in data breach. Number found on dark web marketplace alongside personal details.",
    status: "in_progress",
    recoveryPercentage: 50,
    createdAt: twoDaysAgo,
    updatedAt: oneDayAgo,
  }).returning();

  const emailCase = await db.insert(recoveryCasesTable).values({
    assetType: "email",
    assetIdentifier: "user@company.com",
    compromiseDetails: "Email account accessed by unauthorized party. Suspicious forwarding rules and connected app authorizations detected.",
    status: "in_progress",
    recoveryPercentage: 67,
    createdAt: twoDaysAgo,
    updatedAt: threeHoursAgo,
  }).returning();

  const creditCardCase = await db.insert(recoveryCasesTable).values({
    assetType: "credit_card",
    assetIdentifier: "Visa ending in 4532, Mastercard ending in 7891",
    compromiseDetails: "Two credit cards used for fraudulent transactions totaling $3,847.22. Cards linked to compromised email account.",
    status: "pending",
    recoveryPercentage: 0,
    createdAt: oneDayAgo,
    updatedAt: oneDayAgo,
  }).returning();

  const ssnCase = await db.insert(recoveryCasesTable).values({
    assetType: "ssn",
    assetIdentifier: "SSN ending in XX-6789",
    compromiseDetails: "Social Security Number potentially exposed in the same breach. May be used for identity theft or tax fraud.",
    status: "in_progress",
    recoveryPercentage: 25,
    createdAt: twoDaysAgo,
    updatedAt: oneDayAgo,
  }).returning();

  await db.insert(recoveryStepsTable).values([
    { caseId: passportCase[0].id, stepOrder: 1, title: "Report compromise to State Department", description: "File DS-64 form to report a compromised passport. Contact the National Passport Information Center at 1-877-487-2778.", category: "reporting", status: "completed", startedAt: twoDaysAgo, completedAt: oneDayAgo },
    { caseId: passportCase[0].id, stepOrder: 2, title: "Request replacement passport", description: "Submit DS-11 application for a new passport with updated number. Include proof of identity theft report.", category: "replacement", status: "in_progress", startedAt: oneDayAgo },
    { caseId: passportCase[0].id, stepOrder: 3, title: "Update passport number with institutions", description: "Notify airlines, banks, and government agencies of the new passport number once received.", category: "notification", status: "not_started" },
    { caseId: passportCase[0].id, stepOrder: 4, title: "Verify new document received", description: "Confirm receipt of new passport and verify all information is correct. Destroy old passport if still in possession.", category: "verification", status: "not_started" },
  ]);

  await db.insert(recoveryStepsTable).values([
    { caseId: emailCase[0].id, stepOrder: 1, title: "Change password immediately", description: "Reset email password to a strong, unique password. Use at least 16 characters with mixed case, numbers, and symbols.", category: "access", status: "completed", startedAt: twoDaysAgo, completedAt: twoDaysAgo, verifiedAt: twoDaysAgo },
    { caseId: emailCase[0].id, stepOrder: 2, title: "Enable two-factor authentication", description: "Set up 2FA using an authenticator app (not SMS). Configure backup codes and store them securely.", category: "access", status: "completed", startedAt: twoDaysAgo, completedAt: oneDayAgo },
    { caseId: emailCase[0].id, stepOrder: 3, title: "Review and revoke connected apps", description: "Audit all third-party apps with access to the email account. Revoke any unrecognized or unnecessary permissions.", category: "audit", status: "completed", startedAt: oneDayAgo, completedAt: threeHoursAgo },
    { caseId: emailCase[0].id, stepOrder: 4, title: "Check and remove forwarding rules", description: "Review all email forwarding rules and filters. Remove any unauthorized forwarding addresses or suspicious rules.", category: "audit", status: "completed", startedAt: oneDayAgo, completedAt: threeHoursAgo },
    { caseId: emailCase[0].id, stepOrder: 5, title: "Verify recovery email and phone", description: "Ensure recovery email and phone number are correct and belong to you. Update if compromised.", category: "verification", status: "in_progress", startedAt: threeHoursAgo },
    { caseId: emailCase[0].id, stepOrder: 6, title: "Scan for unauthorized activity", description: "Review sent items, login history, and account activity for the past 30 days. Report any unauthorized actions.", category: "audit", status: "not_started" },
  ]);

  await db.insert(recoveryStepsTable).values([
    { caseId: creditCardCase[0].id, stepOrder: 1, title: "Report fraud to card issuers", description: "Contact Visa and Mastercard issuers immediately to report fraudulent charges. Request immediate card cancellation.", category: "reporting", status: "not_started" },
    { caseId: creditCardCase[0].id, stepOrder: 2, title: "Dispute unauthorized charges", description: "File formal disputes for all $3,847.22 in unauthorized charges. Document each transaction with dates and amounts.", category: "financial", status: "not_started" },
    { caseId: creditCardCase[0].id, stepOrder: 3, title: "Request replacement cards", description: "Request new cards with different numbers from each issuer. Ensure expedited shipping is selected.", category: "replacement", status: "not_started" },
    { caseId: creditCardCase[0].id, stepOrder: 4, title: "Update auto-pay subscriptions", description: "Identify all recurring payments linked to compromised cards. Update payment methods once new cards arrive.", category: "notification", status: "not_started" },
    { caseId: creditCardCase[0].id, stepOrder: 5, title: "Verify new cards are active", description: "Activate replacement cards and verify they work correctly. Confirm old card numbers are fully deactivated.", category: "verification", status: "not_started" },
  ]);

  await db.insert(recoveryStepsTable).values([
    { caseId: ssnCase[0].id, stepOrder: 1, title: "File FTC identity theft report", description: "Submit a report at IdentityTheft.gov. This creates a personal recovery plan and pre-fills forms for the next steps.", category: "reporting", status: "completed", startedAt: twoDaysAgo, completedAt: twoDaysAgo },
    { caseId: ssnCase[0].id, stepOrder: 2, title: "Request IRS Identity Protection PIN", description: "Apply for an IP PIN from the IRS to prevent tax-related identity theft. Visit irs.gov/ippin.", category: "protection", status: "in_progress", startedAt: oneDayAgo },
    { caseId: ssnCase[0].id, stepOrder: 3, title: "Contact Social Security Administration", description: "Report the compromise to SSA. In severe cases, request a new SSN (rarely granted). Place a fraud alert on your record.", category: "reporting", status: "not_started" },
    { caseId: ssnCase[0].id, stepOrder: 4, title: "Set up credit monitoring", description: "Place fraud alerts with all three credit bureaus (Equifax, Experian, TransUnion). Consider a credit freeze.", category: "monitoring", status: "not_started" },
    { caseId: ssnCase[0].id, stepOrder: 5, title: "Verify clean credit report", description: "Request free credit reports from all three bureaus. Review for unauthorized accounts or inquiries.", category: "verification", status: "not_started" },
  ]);
}

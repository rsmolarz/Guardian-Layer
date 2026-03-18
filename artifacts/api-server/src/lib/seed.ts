import { db, transactionsTable, alertsTable } from "@workspace/db";
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

  if ((countResult?.count ?? 0) > 0) return;

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

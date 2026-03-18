import { Router, type IRouter } from "express";
import { eq, desc, sql, and } from "drizzle-orm";
import { db, darkWebExposuresTable, recoveryActionsTable, alertsTable } from "@workspace/db";
import {
  ListDarkWebExposuresQueryParams,
  ListDarkWebExposuresResponse,
  GetDarkWebExposureParams,
  GetDarkWebExposureResponse,
  ListRecoveryActionsQueryParams,
  ListRecoveryActionsResponse,
  ToggleRecoveryActionParams,
  ToggleRecoveryActionResponse,
  GetDarkWebSummaryResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const SEVERITY_BY_DATA_TYPE: Record<string, string> = {
  SSN: "critical",
  "Financial Account": "critical",
  Credentials: "high",
  Email: "medium",
  "Phone Number": "medium",
};

function resolveAlertSeverity(dataType: string, exposureSeverity: string): string {
  return SEVERITY_BY_DATA_TYPE[dataType] ?? exposureSeverity;
}

async function createExposureAlert(exposure: {
  dataType: string;
  severity: string;
  sourceMarketplace: string;
  description: string;
}) {
  const alertSeverity = resolveAlertSeverity(exposure.dataType, exposure.severity);

  const title = alertSeverity === "critical"
    ? `CRITICAL: ${exposure.dataType} Found on Dark Web`
    : alertSeverity === "high"
    ? `${exposure.dataType} Exposed on Dark Web`
    : `${exposure.dataType} on Dark Web`;

  const truncatedDesc = exposure.description.length > 200
    ? exposure.description.substring(0, 197) + "..."
    : exposure.description;

  await db.insert(alertsTable).values({
    title,
    message: `${truncatedDesc} Source: ${exposure.sourceMarketplace}.`,
    severity: alertSeverity,
    dismissed: false,
  });
}

router.get("/dark-web/exposures", async (req, res): Promise<void> => {
  const query = ListDarkWebExposuresQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { severity, status } = query.data;
  const conditions = [];
  if (severity) conditions.push(eq(darkWebExposuresTable.severity, severity));
  if (status) conditions.push(eq(darkWebExposuresTable.status, status));

  let baseQuery = db.select().from(darkWebExposuresTable);
  if (conditions.length > 0) {
    baseQuery = baseQuery.where(and(...conditions)) as typeof baseQuery;
  }

  const exposures = await baseQuery.orderBy(desc(darkWebExposuresTable.discoveryDate));

  res.json(ListDarkWebExposuresResponse.parse({
    exposures,
    total: exposures.length,
  }));
});

router.get("/dark-web/exposures/:id", async (req, res): Promise<void> => {
  const params = GetDarkWebExposureParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [exposure] = await db.select().from(darkWebExposuresTable).where(eq(darkWebExposuresTable.id, params.data.id));
  if (!exposure) {
    res.status(404).json({ error: "Exposure not found" });
    return;
  }

  res.json(GetDarkWebExposureResponse.parse(exposure));
});

router.get("/dark-web/recovery-actions", async (req, res): Promise<void> => {
  const query = ListRecoveryActionsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { exposureId, category } = query.data;
  const conditions = [];
  if (exposureId) conditions.push(eq(recoveryActionsTable.exposureId, exposureId));
  if (category) conditions.push(eq(recoveryActionsTable.category, category));

  let baseQuery = db.select().from(recoveryActionsTable);
  if (conditions.length > 0) {
    baseQuery = baseQuery.where(and(...conditions)) as typeof baseQuery;
  }

  const actions = await baseQuery.orderBy(recoveryActionsTable.priority, recoveryActionsTable.id);
  const completedCount = actions.filter(a => a.completed).length;

  res.json(ListRecoveryActionsResponse.parse({
    actions,
    total: actions.length,
    completedCount,
  }));
});

router.post("/dark-web/recovery-actions/:id/toggle", async (req, res): Promise<void> => {
  const params = ToggleRecoveryActionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [action] = await db.select().from(recoveryActionsTable).where(eq(recoveryActionsTable.id, params.data.id));
  if (!action) {
    res.status(404).json({ error: "Recovery action not found" });
    return;
  }

  const [updated] = await db
    .update(recoveryActionsTable)
    .set({ completed: !action.completed })
    .where(eq(recoveryActionsTable.id, params.data.id))
    .returning();

  res.json(ToggleRecoveryActionResponse.parse(updated));
});

router.get("/dark-web/summary", async (req, res): Promise<void> => {
  const exposures = await db.select().from(darkWebExposuresTable);
  const actions = await db.select().from(recoveryActionsTable);

  const totalExposures = exposures.length;
  const activeExposures = exposures.filter(e => e.status === "active").length;
  const criticalExposures = exposures.filter(e => e.severity === "critical").length;

  const totalActions = actions.length;
  const completedActions = actions.filter(a => a.completed).length;
  const recoveryProgress = totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0;

  const typeMap = new Map<string, number>();
  for (const e of exposures) {
    typeMap.set(e.dataType, (typeMap.get(e.dataType) || 0) + 1);
  }
  const exposuresByType = Array.from(typeMap.entries()).map(([dataType, count]) => ({ dataType, count }));

  res.json(GetDarkWebSummaryResponse.parse({
    totalExposures,
    activeExposures,
    criticalExposures,
    recoveryProgress,
    exposuresByType,
  }));
});

export async function seedDarkWebData() {
  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(darkWebExposuresTable);

  if ((countResult?.count ?? 0) > 0) return;

  console.log("Seeding dark web exposure data...");

  const exposures = await db.insert(darkWebExposuresTable).values([
    {
      dataType: "SSN",
      sourceMarketplace: "DarkMarket Forum",
      severity: "critical",
      status: "active",
      discoveryDate: new Date("2026-03-15T08:30:00Z"),
      description: "Your Social Security Number was found listed for sale on DarkMarket Forum. The listing included full SSN, name, and date of birth. This data can be used for identity theft, fraudulent credit applications, and tax fraud.",
      recommendedActions: JSON.stringify(["Freeze credit at all three bureaus", "File identity theft report with FTC", "Set up fraud alerts", "Monitor credit reports"]),
    },
    {
      dataType: "Email",
      sourceMarketplace: "BreachDB Dump",
      severity: "high",
      status: "active",
      discoveryDate: new Date("2026-03-12T14:22:00Z"),
      description: "Your corporate email address was found in a data breach dump containing 2.3 million records from a compromised SaaS platform. The breach includes email addresses, hashed passwords, and account metadata.",
      recommendedActions: JSON.stringify(["Change password immediately", "Enable two-factor authentication", "Review account access logs"]),
    },
    {
      dataType: "Credentials",
      sourceMarketplace: "Telegram Channel - CyberLeaks",
      severity: "high",
      status: "monitoring",
      discoveryDate: new Date("2026-03-10T19:45:00Z"),
      description: "Login credentials matching your email domain were found being shared on a Telegram channel known for distributing stolen credentials. The credentials appear to be from a third-party service breach.",
      recommendedActions: JSON.stringify(["Change passwords on all accounts", "Enable MFA everywhere", "Review for unauthorized access"]),
    },
    {
      dataType: "Financial Account",
      sourceMarketplace: "Underground Carding Forum",
      severity: "critical",
      status: "active",
      discoveryDate: new Date("2026-03-08T11:15:00Z"),
      description: "Partial credit card details and banking information linked to your identity were found on an underground carding forum. The listing includes last 4 digits, expiry date, and billing address.",
      recommendedActions: JSON.stringify(["Contact your bank immediately", "Request new card numbers", "Set up transaction alerts", "Review recent statements"]),
    },
    {
      dataType: "Email",
      sourceMarketplace: "Pastebin Archive",
      severity: "medium",
      status: "resolved",
      discoveryDate: new Date("2026-02-28T06:30:00Z"),
      description: "Your personal email address appeared in a Pastebin paste containing a list of emails from a minor forum breach. No passwords were included in this specific dump.",
      recommendedActions: JSON.stringify(["Monitor for spam", "Update email security settings"]),
    },
    {
      dataType: "Phone Number",
      sourceMarketplace: "Data Broker List",
      severity: "medium",
      status: "active",
      discoveryDate: new Date("2026-03-01T16:00:00Z"),
      description: "Your phone number was found on a data broker list being sold on a dark web marketplace. This data is often used for SIM swapping attacks and targeted phishing campaigns.",
      recommendedActions: JSON.stringify(["Contact your carrier for SIM lock", "Enable carrier PIN", "Be alert for phishing calls"]),
    },
  ]).returning();

  const recoveryActions = [
    { exposureId: exposures[0].id, title: "Freeze Equifax Credit Report", description: "Place a security freeze on your Equifax credit report to prevent new accounts from being opened.", category: "credit_protection", priority: 1 },
    { exposureId: exposures[0].id, title: "Freeze Experian Credit Report", description: "Place a security freeze on your Experian credit report to prevent unauthorized credit inquiries.", category: "credit_protection", priority: 1 },
    { exposureId: exposures[0].id, title: "Freeze TransUnion Credit Report", description: "Place a security freeze on your TransUnion credit report to block new credit applications.", category: "credit_protection", priority: 1 },
    { exposureId: exposures[0].id, title: "File FTC Identity Theft Report", description: "File an official identity theft report at IdentityTheft.gov to create a recovery plan.", category: "legal_reporting", priority: 2 },
    { exposureId: exposures[0].id, title: "File Police Report", description: "File a police report for identity theft to support fraud dispute claims.", category: "legal_reporting", priority: 3 },
    { exposureId: exposures[0].id, title: "Set Up Fraud Alerts", description: "Place fraud alerts with all three credit bureaus to require identity verification for new accounts.", category: "credit_protection", priority: 2 },
    { exposureId: exposures[1].id, title: "Change Email Password", description: "Immediately change your email password to a strong, unique password.", category: "account_security", priority: 1 },
    { exposureId: exposures[1].id, title: "Enable Two-Factor Authentication", description: "Enable 2FA on your email account using an authenticator app.", category: "account_security", priority: 1 },
    { exposureId: exposures[1].id, title: "Review Connected Apps", description: "Review and revoke access for any suspicious connected applications.", category: "account_security", priority: 2 },
    { exposureId: exposures[2].id, title: "Change All Service Passwords", description: "Update passwords on all services using your compromised email.", category: "account_security", priority: 1 },
    { exposureId: exposures[2].id, title: "Enable MFA on Critical Accounts", description: "Enable multi-factor authentication on all financial and critical accounts.", category: "account_security", priority: 1 },
    { exposureId: exposures[3].id, title: "Contact Bank Fraud Department", description: "Call your bank's fraud department to report the exposure and request enhanced monitoring.", category: "credit_protection", priority: 1 },
    { exposureId: exposures[3].id, title: "Request New Card Numbers", description: "Request replacement cards with new numbers for all compromised accounts.", category: "credit_protection", priority: 1 },
    { exposureId: exposures[3].id, title: "Review Recent Statements", description: "Review the past 90 days of statements for unauthorized transactions.", category: "credit_protection", priority: 2 },
    { exposureId: exposures[3].id, title: "File Fraud Report with FTC", description: "Report the financial data exposure to the Federal Trade Commission.", category: "legal_reporting", priority: 2 },
    { exposureId: exposures[5].id, title: "Contact Carrier for SIM Lock", description: "Call your mobile carrier to set up a SIM lock and port-out protection.", category: "account_security", priority: 1 },
    { exposureId: exposures[5].id, title: "Enable Carrier PIN", description: "Set up an account PIN with your mobile carrier to prevent unauthorized changes.", category: "account_security", priority: 1 },
  ];

  await db.insert(recoveryActionsTable).values(recoveryActions);

  for (const exposure of exposures) {
    await createExposureAlert(exposure);
  }

  console.log("Dark web seed data complete.");
}

export default router;

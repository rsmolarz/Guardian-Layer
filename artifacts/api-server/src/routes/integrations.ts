import { Router, type IRouter } from "express";
import { ListIntegrationsResponse, GetGoogleWorkspaceStatusResponse, SyncStripeTransactionsResponse, GetStripeStatusResponse, ConfigureIntegrationBody, ConfigureIntegrationResponse } from "@workspace/api-zod";
import { checkGoogleConnection } from "../lib/google-clients";
import { getStripeClient, isStripeConfigured } from "../lib/stripe-client";
import { syncStripeTransactions } from "../lib/stripe-sync";

const router: IRouter = Router();

const GOOGLE_SERVICES = [
  {
    connectorName: "google-mail",
    service: "Gmail",
    permissions: [
      "gmail.send",
      "gmail.labels",
      "gmail.addons.current.message.readonly",
      "gmail.addons.current.message.metadata",
    ],
  },
  {
    connectorName: "google-drive",
    service: "Google Drive",
    permissions: [
      "drive.file",
      "drive.apps",
      "drive.apps.readonly",
      "drive.photos.readonly",
    ],
  },
  {
    connectorName: "google-calendar",
    service: "Google Calendar",
    permissions: [
      "calendar.events",
      "calendar.events.readonly",
      "calendar.calendarlist",
      "calendar.freebusy",
    ],
  },
  {
    connectorName: "google-docs",
    service: "Google Docs",
    permissions: [
      "documents",
      "documents.readonly",
      "docs",
    ],
  },
  {
    connectorName: "google-sheet",
    service: "Google Sheets",
    permissions: [
      "spreadsheets",
      "spreadsheets.readonly",
      "drive.file",
    ],
  },
];

function getIntegrations() {
  return [
    {
      id: "stripe",
      name: "Stripe Payments",
      provider: "Stripe",
      status: "online" as const,
      category: "payments" as const,
      description: "Payment processing and fraud detection for card transactions.",
      lastChecked: new Date(),
    },
    {
      id: "plaid",
      name: "Plaid Banking",
      provider: "Plaid",
      status: "online" as const,
      category: "banking" as const,
      description: "Bank account verification and transaction data aggregation.",
      lastChecked: new Date(),
    },
    {
      id: "cloudflare",
      name: "Cloudflare Security",
      provider: "Cloudflare",
      status: "online" as const,
      category: "security" as const,
      description: "DDoS protection, WAF rules, and bot management.",
      lastChecked: new Date(),
    },
    {
      id: "gmail",
      name: "Gmail Notifications",
      provider: "Google",
      status: "online" as const,
      category: "notifications" as const,
      description: "Email-based security alerts and compliance notifications.",
      lastChecked: new Date(),
    },
    {
      id: "twilio",
      name: "Twilio SMS",
      provider: "Twilio",
      status: "online" as const,
      category: "sms" as const,
      description: "SMS-based two-factor authentication and alert delivery.",
      lastChecked: new Date(),
    },
    {
      id: "google-workspace",
      name: "Google Workspace Protection",
      provider: "Google",
      status: "online" as const,
      category: "security" as const,
      description: "Monitoring Gmail, Drive, Calendar, Docs, and Sheets for suspicious activity, unauthorized access, and data exfiltration.",
      lastChecked: new Date(),
    },
    {
      id: "google-workspace-admin",
      name: "Google Workspace Admin",
      provider: "Google",
      status: "pending" as const,
      category: "security" as const,
      description: "Enterprise admin controls: login auditing, device management, DLP policies, and security investigation tool.",
      lastChecked: new Date(),
    },
    {
      id: "avg",
      name: "AVG Threat Intelligence",
      provider: "AVG (Avast)",
      status: "pending" as const,
      category: "security" as const,
      description: "Antivirus scanning, malware detection, and endpoint threat intelligence feed.",
      lastChecked: new Date(),
    },
    {
      id: "incognito",
      name: "Incognito Data Removal",
      provider: "Surfshark",
      status: "pending" as const,
      category: "privacy" as const,
      description: "Automated data broker monitoring and personal data removal requests.",
      lastChecked: new Date(),
    },
    {
      id: "deleteme",
      name: "DeleteMe Privacy",
      provider: "Abine",
      status: "pending" as const,
      category: "privacy" as const,
      description: "Enterprise personal data removal from 750+ data brokers and people-search sites.",
      lastChecked: new Date(),
    },
    {
      id: "identityforce",
      name: "IdentityForce Protection",
      provider: "TransUnion",
      status: "pending" as const,
      category: "identity_protection" as const,
      description: "Identity theft monitoring, credit alerts, and dark web surveillance.",
      lastChecked: new Date(),
    },
  ];
}

const configuredIntegrations = new Map<string, { apiKey: string; webhookUrl?: string; environment?: string }>();

router.get("/integrations", async (_req, res): Promise<void> => {
  const integrations = getIntegrations().map((int) => {
    if (int.status === "pending" && configuredIntegrations.has(int.id)) {
      return { ...int, status: "online" as const };
    }
    return int;
  });
  res.json(ListIntegrationsResponse.parse({ integrations }));
});

router.post("/integrations/:id/configure", async (req, res): Promise<void> => {
  const id = req.params.id;
  const parsed = ConfigureIntegrationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const allIntegrations = getIntegrations();
  const integration = allIntegrations.find((i) => i.id === id);
  if (!integration) {
    res.status(404).json({ error: "Integration not found" });
    return;
  }

  configuredIntegrations.set(id, {
    apiKey: parsed.data.apiKey,
    webhookUrl: parsed.data.webhookUrl ?? undefined,
    environment: parsed.data.environment ?? undefined,
  });

  res.json(ConfigureIntegrationResponse.parse({
    id,
    name: integration.name,
    status: "online",
    message: `${integration.name} has been configured and is now online.`,
  }));
});

router.get("/integrations/google-workspace/status", async (_req, res): Promise<void> => {
  const results = await Promise.all(
    GOOGLE_SERVICES.map(async (svc) => {
      const check = await checkGoogleConnection(svc.connectorName);
      return {
        service: svc.service,
        connected: check.connected,
        error: check.error || null,
        lastChecked: new Date(),
        permissions: svc.permissions,
      };
    })
  );

  const connectedCount = results.filter((r) => r.connected).length;

  res.json(
    GetGoogleWorkspaceStatusResponse.parse({
      services: results,
      connectedCount,
      totalCount: results.length,
    })
  );
});

router.get("/integrations/stripe/status", async (_req, res): Promise<void> => {
  if (!isStripeConfigured()) {
    res.json(GetStripeStatusResponse.parse({
      connected: false,
      mode: "test",
      accountName: null,
      error: "Stripe API key not configured",
    }));
    return;
  }

  try {
    const stripe = getStripeClient();
    const apiKey = process.env.STRIPE_TEST_API_KEY || "";
    const isLive = apiKey.includes("_live_");
    const mode = isLive ? "live" as const : "test" as const;

    await stripe.charges.list({ limit: 1 });

    let accountName: string | null = null;
    try {
      const account = await stripe.accounts.retrieve();
      accountName = account.settings?.dashboard?.display_name || account.business_profile?.name || null;
    } catch {
    }

    res.json(GetStripeStatusResponse.parse({
      connected: true,
      mode,
      accountName,
      error: null,
    }));
  } catch (err: any) {
    res.json(GetStripeStatusResponse.parse({
      connected: false,
      mode: "test",
      accountName: null,
      error: err.message,
    }));
  }
});

router.post("/integrations/stripe/sync", async (_req, res): Promise<void> => {
  try {
    const result = await syncStripeTransactions();
    const permissionErrors = result.errors.filter(e => e.includes("permission"));
    const realErrors = result.errors.filter(e => !e.includes("permission"));
    
    let message: string;
    if (result.synced > 0) {
      message = `Successfully synced ${result.synced} transaction${result.synced !== 1 ? "s" : ""} from Stripe`;
      if (permissionErrors.length > 0) message += ` (some sources skipped due to permissions)`;
    } else if (realErrors.length > 0) {
      message = `Sync error: ${realErrors[0]}`;
    } else if (permissionErrors.length > 0) {
      message = `No charges found. Note: ${permissionErrors.length} source${permissionErrors.length !== 1 ? "s" : ""} skipped due to key permissions`;
    } else {
      message = "No transactions found in Stripe";
    }

    res.json(SyncStripeTransactionsResponse.parse({
      ...result,
      message,
    }));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

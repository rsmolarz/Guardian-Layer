import { Router, type IRouter } from "express";
import { ListIntegrationsResponse, GetGoogleWorkspaceStatusResponse } from "@workspace/api-zod";
import { checkGoogleConnection } from "../lib/google-clients";

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

router.get("/integrations", async (_req, res): Promise<void> => {
  res.json(ListIntegrationsResponse.parse({ integrations: getIntegrations() }));
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

export default router;

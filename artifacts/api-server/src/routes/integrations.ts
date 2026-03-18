import { Router, type IRouter } from "express";
import { ListIntegrationsResponse } from "@workspace/api-zod";

const router: IRouter = Router();

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

export default router;

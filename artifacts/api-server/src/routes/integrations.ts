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
      lastChecked: new Date(),
    },
    {
      id: "plaid",
      name: "Plaid Banking",
      provider: "Plaid",
      status: "online" as const,
      lastChecked: new Date(),
    },
    {
      id: "cloudflare",
      name: "Cloudflare Security",
      provider: "Cloudflare",
      status: "online" as const,
      lastChecked: new Date(),
    },
    {
      id: "gmail",
      name: "Gmail Notifications",
      provider: "Google",
      status: "online" as const,
      lastChecked: new Date(),
    },
    {
      id: "twilio",
      name: "Twilio SMS",
      provider: "Twilio",
      status: "online" as const,
      lastChecked: new Date(),
    },
  ];
}

router.get("/integrations", async (_req, res): Promise<void> => {
  res.json(ListIntegrationsResponse.parse({ integrations: getIntegrations() }));
});

export default router;

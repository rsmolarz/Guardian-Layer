import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (!stripeClient) {
    const apiKey = process.env.SLACK_TEST_API_KEY;
    if (!apiKey) {
      throw new Error("Stripe API key not configured (SLACK_TEST_API_KEY)");
    }
    stripeClient = new Stripe(apiKey);
  }
  return stripeClient;
}

export function isStripeConfigured(): boolean {
  return !!process.env.SLACK_TEST_API_KEY;
}

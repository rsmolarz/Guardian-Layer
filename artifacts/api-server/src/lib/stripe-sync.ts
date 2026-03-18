import { getStripeClient, isStripeConfigured } from "./stripe-client";
import { db, transactionsTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const COUNTRY_MAP: Record<string, string> = {
  US: "US", GB: "GB", DE: "DE", FR: "FR", CA: "CA", AU: "AU", JP: "JP",
  IN: "IN", BR: "BR", CN: "CN", RU: "RU", NG: "NG", IR: "IR", KP: "KP",
  ZA: "ZA", MX: "MX", IT: "IT", ES: "ES", NL: "NL", SE: "SE", CH: "CH",
};

function categorizeCharge(description: string | null, metadata: Record<string, string>): string {
  const desc = (description || "").toLowerCase();
  const metaStr = JSON.stringify(metadata || {}).toLowerCase();
  const combined = desc + " " + metaStr;

  if (combined.includes("crypto") || combined.includes("bitcoin") || combined.includes("ethereum")) return "crypto";
  if (combined.includes("gambling") || combined.includes("casino") || combined.includes("bet")) return "gambling";
  if (combined.includes("wire") || combined.includes("transfer")) return "wire_transfer";
  if (combined.includes("subscription") || combined.includes("recurring")) return "subscription";
  if (combined.includes("invoice")) return "invoice";
  if (combined.includes("refund")) return "refund";
  if (combined.includes("donation") || combined.includes("charity")) return "donation";
  return "payment";
}

function predictRisk(txn: { amount: number; category: string; country: string | null }): { score: number; factors: string[] } {
  const factors: string[] = [];
  let score = 0.1;

  if (txn.amount > 10000) {
    score += 0.3;
    factors.push("High transaction amount");
  } else if (txn.amount > 5000) {
    score += 0.15;
    factors.push("Elevated transaction amount");
  }

  const riskyCountries = ["NG", "RU", "CN", "IR", "KP"];
  if (txn.country && riskyCountries.includes(txn.country.toUpperCase())) {
    score += 0.25;
    factors.push("Transaction from high-risk region");
  }

  const riskyCategories = ["crypto", "gambling", "wire_transfer"];
  if (riskyCategories.includes(txn.category.toLowerCase())) {
    score += 0.2;
    factors.push("High-risk transaction category");
  }

  score += Math.random() * 0.1;
  score = Math.min(score, 1);
  score = Math.round(score * 100) / 100;

  if (factors.length === 0) {
    factors.push("No significant risk factors detected");
  }

  return { score, factors };
}

function getStatus(riskScore: number): string {
  if (riskScore > 0.7) return "BLOCKED";
  if (riskScore > 0.4) return "HELD";
  return "ALLOWED";
}

export async function syncStripeTransactions(): Promise<{
  synced: number;
  skipped: number;
  errors: string[];
}> {
  if (!isStripeConfigured()) {
    return { synced: 0, skipped: 0, errors: ["Stripe API key not configured"] };
  }

  const stripe = getStripeClient();
  const errors: string[] = [];
  let synced = 0;
  let skipped = 0;

  try {
    const charges = await stripe.charges.list({ limit: 100 });

    for (const charge of charges.data) {
      try {
        const amountInDollars = charge.amount / 100;
        const currency = (charge.currency || "usd").toUpperCase();
        const country = charge.billing_details?.address?.country || charge.card?.country || null;
        const category = categorizeCharge(charge.description, (charge.metadata || {}) as Record<string, string>);

        const source = charge.billing_details?.email
          || charge.billing_details?.name
          || charge.customer?.toString()
          || `stripe_customer_${charge.id.slice(-8)}`;

        const destination = charge.description
          || `Stripe charge ${charge.id.slice(-8)}`;

        const { score } = predictRisk({ amount: amountInDollars, category, country });
        const status = getStatus(score);

        await db.insert(transactionsTable).values({
          source,
          destination,
          amount: amountInDollars,
          currency,
          riskScore: score,
          status,
          category,
          ipAddress: null,
          country: country ? (COUNTRY_MAP[country] || country) : null,
          createdAt: new Date(charge.created * 1000),
        });

        synced++;
      } catch (err: any) {
        errors.push(`Charge ${charge.id}: ${err.message}`);
        skipped++;
      }
    }

    try {
      const paymentIntents = await stripe.paymentIntents.list({ limit: 100 });

      for (const pi of paymentIntents.data) {
        if (pi.status !== "succeeded") {
          skipped++;
          continue;
        }

        const hasCharge = pi.latest_charge != null;
        if (hasCharge) {
          skipped++;
          continue;
        }

        try {
          const amountInDollars = pi.amount / 100;
          const currency = (pi.currency || "usd").toUpperCase();
          const category = categorizeCharge(pi.description, (pi.metadata || {}) as Record<string, string>);

          const source = pi.customer?.toString() || `stripe_pi_${pi.id.slice(-8)}`;
          const destination = pi.description || `Payment Intent ${pi.id.slice(-8)}`;

          const { score } = predictRisk({ amount: amountInDollars, category, country: null });
          const status = getStatus(score);

          await db.insert(transactionsTable).values({
            source,
            destination,
            amount: amountInDollars,
            currency,
            riskScore: score,
            status,
            category,
            ipAddress: null,
            country: null,
            createdAt: new Date(pi.created * 1000),
          });

          synced++;
        } catch (err: any) {
          errors.push(`PaymentIntent ${pi.id}: ${err.message}`);
          skipped++;
        }
      }
    } catch (err: any) {
      if (err.message?.includes("permission")) {
        errors.push("Payment Intents: insufficient permissions (rak_payment_intent_read required) — skipped");
      } else {
        errors.push(`Payment Intents API error: ${err.message}`);
      }
    }
  } catch (err: any) {
    errors.push(`Stripe API error: ${err.message}`);
  }

  return { synced, skipped, errors };
}

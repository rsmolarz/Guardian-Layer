import { Router, type IRouter } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { db, transactionsTable } from "@workspace/db";
import {
  ListTransactionsQueryParams,
  ListTransactionsResponse,
  ScanTransactionBody,
  ScanTransactionResponse,
  GetTransactionParams,
  GetTransactionResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function predictRisk(txn: { amount: number; category?: string; country?: string }): { score: number; factors: string[] } {
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
  if (txn.category && riskyCategories.includes(txn.category.toLowerCase())) {
    score += 0.2;
    factors.push("High-risk transaction category");
  }

  score += Math.random() * 0.15;
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

async function withRetry<T>(fn: () => Promise<T>, retries = 2, delayMs = 200): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const isRetryable =
        err.code === "ECONNREFUSED" ||
        err.code === "ECONNRESET" ||
        err.code === "ETIMEDOUT" ||
        err.code === "57P01" ||
        err.code === "57P03" ||
        err.code === "08006" ||
        err.code === "08001" ||
        err.code === "08004" ||
        err.message?.includes("connection") ||
        err.message?.includes("pool") ||
        err.message?.includes("timeout");

      if (isRetryable && attempt < retries) {
        await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Unreachable");
}

router.get("/transactions", async (req, res): Promise<void> => {
  const query = ListTransactionsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { status, limit = 50, offset = 0 } = query.data;

  try {
    const [transactions, [countResult]] = await withRetry(async () => {
      let baseQuery = db.select().from(transactionsTable);

      if (status) {
        baseQuery = baseQuery.where(eq(transactionsTable.status, status)) as typeof baseQuery;
      }

      const txns = await baseQuery
        .orderBy(desc(transactionsTable.createdAt))
        .limit(limit)
        .offset(offset);

      const count = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(transactionsTable);

      return [txns, count] as const;
    });

    res.json(ListTransactionsResponse.parse({
      transactions,
      total: countResult?.count ?? 0,
    }));
  } catch (err: any) {
    console.error("[transactions] GET /transactions failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve transactions. Please try again." });
  }
});

router.post("/transactions/scan", async (req, res): Promise<void> => {
  const parsed = ScanTransactionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { score, factors } = predictRisk(parsed.data);
  const status = getStatus(score);

  try {
    const [transaction] = await withRetry(() =>
      db.insert(transactionsTable).values({
        source: parsed.data.source,
        destination: parsed.data.destination,
        amount: parsed.data.amount,
        currency: parsed.data.currency,
        riskScore: score,
        status,
        category: parsed.data.category || "general",
        ipAddress: parsed.data.ipAddress || null,
        country: parsed.data.country || null,
      }).returning()
    );

    res.json(ScanTransactionResponse.parse({
      transaction,
      riskFactors: factors,
    }));
  } catch (err: any) {
    console.error("[transactions] POST /transactions/scan failed:", err.message);
    res.status(500).json({ error: "Failed to process transaction scan. Please try again." });
  }
});

router.get("/transactions/:id", async (req, res): Promise<void> => {
  const params = GetTransactionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  try {
    const [transaction] = await withRetry(() =>
      db.select().from(transactionsTable).where(eq(transactionsTable.id, params.data.id))
    );

    if (!transaction) {
      res.status(404).json({ error: "Transaction not found" });
      return;
    }

    res.json(GetTransactionResponse.parse(transaction));
  } catch (err: any) {
    console.error("[transactions] GET /transactions/:id failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve transaction. Please try again." });
  }
});

export default router;

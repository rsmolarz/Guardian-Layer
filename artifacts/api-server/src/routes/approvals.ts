import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, transactionsTable } from "@workspace/db";
import {
  ApproveTransactionParams,
  ApproveTransactionResponse,
  RejectTransactionParams,
  RejectTransactionResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/approvals/:id/approve", async (req, res): Promise<void> => {
  const params = ApproveTransactionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [transaction] = await db
    .select()
    .from(transactionsTable)
    .where(eq(transactionsTable.id, params.data.id));

  if (!transaction) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }

  if (transaction.status !== "HELD") {
    res.status(400).json({ error: "Only HELD transactions can be approved" });
    return;
  }

  await db
    .update(transactionsTable)
    .set({ status: "APPROVED" })
    .where(eq(transactionsTable.id, params.data.id));

  res.json(ApproveTransactionResponse.parse({
    id: params.data.id,
    status: "APPROVED",
    approvedAt: new Date(),
  }));
});

router.post("/approvals/:id/reject", async (req, res): Promise<void> => {
  const params = RejectTransactionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [transaction] = await db
    .select()
    .from(transactionsTable)
    .where(eq(transactionsTable.id, params.data.id));

  if (!transaction) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }

  if (transaction.status !== "HELD") {
    res.status(400).json({ error: "Only HELD transactions can be rejected" });
    return;
  }

  await db
    .update(transactionsTable)
    .set({ status: "REJECTED" })
    .where(eq(transactionsTable.id, params.data.id));

  res.json(RejectTransactionResponse.parse({
    id: params.data.id,
    status: "REJECTED",
    approvedAt: new Date(),
  }));
});

export default router;

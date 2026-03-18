import { Router, type IRouter } from "express";
import { eq, desc, asc, sql, isNotNull, or } from "drizzle-orm";
import { db, recoveryCasesTable, recoveryStepsTable } from "@workspace/db";
import {
  ListRecoveryCasesResponse,
  GetRecoverySummaryResponse,
  GetRecoveryCaseParams,
  GetRecoveryCaseResponse,
  UpdateRecoveryCaseStatusParams,
  UpdateRecoveryCaseStatusBody,
  UpdateRecoveryCaseStatusResponse,
  UpdateRecoveryStepStatusParams,
  UpdateRecoveryStepStatusBody,
  UpdateRecoveryStepStatusResponse,
  VerifyRecoveryCaseParams,
  VerifyRecoveryCaseResponse,
  GetRecoveryTimelineResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/recovery/cases", async (_req, res): Promise<void> => {
  const cases = await db
    .select()
    .from(recoveryCasesTable)
    .orderBy(desc(recoveryCasesTable.createdAt));

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(recoveryCasesTable);

  res.json(
    ListRecoveryCasesResponse.parse({
      cases,
      total: countResult?.count ?? 0,
    }),
  );
});

router.get("/recovery/summary", async (_req, res): Promise<void> => {
  const cases = await db.select().from(recoveryCasesTable);
  const totalAffected = cases.length;
  const totalRecovered = cases.filter((c) => c.status === "recovered").length;
  const inProgress = cases.filter((c) => c.status === "in_progress").length;
  const overallPercentage =
    totalAffected > 0
      ? Math.round(
          cases.reduce((sum, c) => sum + c.recoveryPercentage, 0) /
            totalAffected,
        )
      : 0;

  res.json(
    GetRecoverySummaryResponse.parse({
      totalAffected,
      totalRecovered,
      inProgress,
      overallPercentage,
    }),
  );
});

router.get("/recovery/cases/:id", async (req, res): Promise<void> => {
  const params = GetRecoveryCaseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [recoveryCase] = await db
    .select()
    .from(recoveryCasesTable)
    .where(eq(recoveryCasesTable.id, params.data.id));

  if (!recoveryCase) {
    res.status(404).json({ error: "Recovery case not found" });
    return;
  }

  const steps = await db
    .select()
    .from(recoveryStepsTable)
    .where(eq(recoveryStepsTable.caseId, params.data.id))
    .orderBy(asc(recoveryStepsTable.stepOrder));

  res.json(
    GetRecoveryCaseResponse.parse({
      case: recoveryCase,
      steps,
    }),
  );
});

router.patch("/recovery/cases/:id/status", async (req, res): Promise<void> => {
  const params = UpdateRecoveryCaseStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateRecoveryCaseStatusBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(recoveryCasesTable)
    .where(eq(recoveryCasesTable.id, params.data.id));

  if (!existing) {
    res.status(404).json({ error: "Recovery case not found" });
    return;
  }

  const [updated] = await db
    .update(recoveryCasesTable)
    .set({ status: body.data.status, updatedAt: new Date() })
    .where(eq(recoveryCasesTable.id, params.data.id))
    .returning();

  res.json(UpdateRecoveryCaseStatusResponse.parse(updated));
});

router.patch(
  "/recovery/steps/:id/status",
  async (req, res): Promise<void> => {
    const params = UpdateRecoveryStepStatusParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const body = UpdateRecoveryStepStatusBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }

    const [existing] = await db
      .select()
      .from(recoveryStepsTable)
      .where(eq(recoveryStepsTable.id, params.data.id));

    if (!existing) {
      res.status(404).json({ error: "Recovery step not found" });
      return;
    }

    const now = new Date();
    const updateData: Record<string, unknown> = {
      status: body.data.status,
    };

    if (body.data.notes !== undefined) {
      updateData.notes = body.data.notes;
    }

    if (body.data.status === "in_progress" && !existing.startedAt) {
      updateData.startedAt = now;
    }
    if (body.data.status === "completed") {
      updateData.completedAt = now;
      if (!existing.startedAt) updateData.startedAt = now;
    }
    if (body.data.status === "verified") {
      updateData.verifiedAt = now;
      if (!existing.completedAt) updateData.completedAt = now;
      if (!existing.startedAt) updateData.startedAt = now;
    }

    const [updated] = await db
      .update(recoveryStepsTable)
      .set(updateData)
      .where(eq(recoveryStepsTable.id, params.data.id))
      .returning();

    await recalculateCasePercentage(existing.caseId);

    res.json(UpdateRecoveryStepStatusResponse.parse(updated));
  },
);

router.post(
  "/recovery/cases/:id/verify",
  async (req, res): Promise<void> => {
    const params = VerifyRecoveryCaseParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const [existing] = await db
      .select()
      .from(recoveryCasesTable)
      .where(eq(recoveryCasesTable.id, params.data.id));

    if (!existing) {
      res.status(404).json({ error: "Recovery case not found" });
      return;
    }

    const steps = await db
      .select()
      .from(recoveryStepsTable)
      .where(eq(recoveryStepsTable.caseId, params.data.id));

    const allCompleted = steps.every(
      (s) => s.status === "completed" || s.status === "verified",
    );

    if (!allCompleted) {
      res.status(422).json({
        error:
          "All recovery steps must be completed before verifying the case.",
      });
      return;
    }

    const now = new Date();
    await db
      .update(recoveryStepsTable)
      .set({
        status: "verified",
        verifiedAt: now,
        completedAt: sql`COALESCE(completed_at, ${now})`,
        startedAt: sql`COALESCE(started_at, ${now})`,
      })
      .where(eq(recoveryStepsTable.caseId, params.data.id));

    const [updated] = await db
      .update(recoveryCasesTable)
      .set({
        status: "recovered",
        recoveryPercentage: 100,
        updatedAt: now,
      })
      .where(eq(recoveryCasesTable.id, params.data.id))
      .returning();

    res.json(VerifyRecoveryCaseResponse.parse(updated));
  },
);

router.get("/recovery/timeline", async (_req, res): Promise<void> => {
  const steps = await db
    .select({
      id: recoveryStepsTable.id,
      caseId: recoveryStepsTable.caseId,
      stepTitle: recoveryStepsTable.title,
      status: recoveryStepsTable.status,
      startedAt: recoveryStepsTable.startedAt,
      completedAt: recoveryStepsTable.completedAt,
      verifiedAt: recoveryStepsTable.verifiedAt,
    })
    .from(recoveryStepsTable)
    .where(
      or(
        isNotNull(recoveryStepsTable.startedAt),
        isNotNull(recoveryStepsTable.completedAt),
        isNotNull(recoveryStepsTable.verifiedAt),
      ),
    )
    .orderBy(desc(recoveryStepsTable.startedAt));

  const cases = await db.select().from(recoveryCasesTable);
  const caseMap = new Map(cases.map((c) => [c.id, c.assetType]));

  const entries: Array<{
    id: number;
    caseId: number;
    assetType: string;
    stepTitle: string;
    action: string;
    timestamp: Date;
  }> = [];

  for (const step of steps) {
    const assetType = caseMap.get(step.caseId) ?? "unknown";

    if (step.verifiedAt) {
      entries.push({
        id: step.id * 100 + 3,
        caseId: step.caseId,
        assetType,
        stepTitle: step.stepTitle,
        action: "verified",
        timestamp: step.verifiedAt,
      });
    }
    if (step.completedAt) {
      entries.push({
        id: step.id * 100 + 2,
        caseId: step.caseId,
        assetType,
        stepTitle: step.stepTitle,
        action: "completed",
        timestamp: step.completedAt,
      });
    }
    if (step.startedAt) {
      entries.push({
        id: step.id * 100 + 1,
        caseId: step.caseId,
        assetType,
        stepTitle: step.stepTitle,
        action: "started",
        timestamp: step.startedAt,
      });
    }
  }

  entries.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  res.json(GetRecoveryTimelineResponse.parse({ entries }));
});

async function recalculateCasePercentage(caseId: number) {
  const steps = await db
    .select()
    .from(recoveryStepsTable)
    .where(eq(recoveryStepsTable.caseId, caseId));

  if (steps.length === 0) return;

  const completedOrVerified = steps.filter(
    (s) => s.status === "completed" || s.status === "verified",
  ).length;
  const percentage = Math.round((completedOrVerified / steps.length) * 100);

  let status = "pending";
  if (percentage === 100) {
    status = steps.every((s) => s.status === "verified")
      ? "recovered"
      : "verified";
  } else if (percentage > 0 || steps.some((s) => s.status === "in_progress")) {
    status = "in_progress";
  }

  await db
    .update(recoveryCasesTable)
    .set({ recoveryPercentage: percentage, status, updatedAt: new Date() })
    .where(eq(recoveryCasesTable.id, caseId));
}

export default router;

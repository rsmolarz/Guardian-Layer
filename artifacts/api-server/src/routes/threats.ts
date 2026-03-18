import { Router, type IRouter } from "express";
import { eq, desc, sql, and, type SQL } from "drizzle-orm";
import { db, threatsTable, neutralizationStepsTable, activityLogsTable } from "@workspace/db";
import {
  ListThreatsQueryParams,
  ListThreatsResponse,
  GetThreatDetailParams,
  GetThreatDetailResponse,
  GetThreatSummaryResponse,
  UpdateThreatStatusParams,
  UpdateThreatStatusBody,
  UpdateThreatStatusResponse,
  ExecuteIsolationActionParams,
  ExecuteIsolationActionBody,
  ExecuteIsolationActionResponse,
  CompleteNeutralizationStepParams,
  CompleteNeutralizationStepResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/threats", async (req, res): Promise<void> => {
  const query = ListThreatsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { status, severity } = query.data;
  let conditions: SQL[] = [];

  if (status) {
    conditions.push(eq(threatsTable.status, status));
  }
  if (severity) {
    conditions.push(eq(threatsTable.severity, severity));
  }

  let baseQuery = db.select().from(threatsTable);
  if (conditions.length > 0) {
    baseQuery = baseQuery.where(and(...conditions)) as typeof baseQuery;
  }

  const threats = await baseQuery.orderBy(desc(threatsTable.detectedAt));

  let countQuery = db.select({ count: sql<number>`count(*)::int` }).from(threatsTable);
  if (conditions.length > 0) {
    countQuery = countQuery.where(and(...conditions)) as typeof countQuery;
  }
  const [countResult] = await countQuery;

  res.json(ListThreatsResponse.parse({
    threats,
    total: countResult?.count ?? 0,
  }));
});

router.get("/threats/summary", async (_req, res): Promise<void> => {
  const allThreats = await db.select().from(threatsTable);

  const totalActive = allThreats.filter(t => t.status !== "neutralized").length;
  const threatsContained = allThreats.filter(t => t.status === "contained").length;
  const threatsNeutralized = allThreats.filter(t => t.status === "neutralized").length;

  const containedThreats = allThreats.filter(t => t.containedAt && t.detectedAt);
  let avgContainmentMinutes = 0;
  if (containedThreats.length > 0) {
    const totalMinutes = containedThreats.reduce((sum, t) => {
      const diff = (new Date(t.containedAt!).getTime() - new Date(t.detectedAt).getTime()) / 60000;
      return sum + diff;
    }, 0);
    avgContainmentMinutes = Math.round(totalMinutes / containedThreats.length);
  }

  res.json(GetThreatSummaryResponse.parse({
    totalActive,
    threatsContained,
    threatsNeutralized,
    avgContainmentMinutes,
  }));
});

router.get("/threats/:id", async (req, res): Promise<void> => {
  const params = GetThreatDetailParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [threat] = await db
    .select()
    .from(threatsTable)
    .where(eq(threatsTable.id, params.data.id));

  if (!threat) {
    res.status(404).json({ error: "Threat not found" });
    return;
  }

  const steps = await db
    .select()
    .from(neutralizationStepsTable)
    .where(eq(neutralizationStepsTable.threatId, threat.id))
    .orderBy(neutralizationStepsTable.stepOrder);

  const timeline: Array<{ timestamp: Date; action: string; detail: string; type: string }> = [];

  timeline.push({
    timestamp: threat.detectedAt,
    action: "Threat Detected",
    detail: `${threat.type} identified via ${threat.detectionSource}`,
    type: "detection",
  });

  for (const step of steps) {
    if (step.startedAt) {
      timeline.push({
        timestamp: step.startedAt,
        action: `Step Started: ${step.title}`,
        detail: step.description,
        type: "isolation",
      });
    }
    if (step.completedAt) {
      timeline.push({
        timestamp: step.completedAt,
        action: `Step Completed: ${step.title}`,
        detail: `${step.category} action completed successfully`,
        type: "step_complete",
      });
    }
  }

  if (threat.containedAt) {
    timeline.push({
      timestamp: threat.containedAt,
      action: "Threat Contained",
      detail: "All isolation actions completed. Threat is contained.",
      type: "containment",
    });
  }

  if (threat.neutralizedAt) {
    timeline.push({
      timestamp: threat.neutralizedAt,
      action: "Threat Neutralized",
      detail: "All neutralization steps completed. Threat fully resolved.",
      type: "neutralization",
    });
  }

  timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  res.json(GetThreatDetailResponse.parse({
    threat,
    steps,
    timeline,
  }));
});

router.post("/threats/:id/status", async (req, res): Promise<void> => {
  const params = UpdateThreatStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateThreatStatusBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const now = new Date();
  const updates: Partial<typeof threatsTable.$inferInsert> = { status: body.data.status };

  if (body.data.status === "contained") updates.containedAt = now;
  if (body.data.status === "neutralized") updates.neutralizedAt = now;

  const [updated] = await db
    .update(threatsTable)
    .set(updates)
    .where(eq(threatsTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Threat not found" });
    return;
  }

  await db.insert(activityLogsTable).values({
    action: `Threat status updated to ${body.data.status}`,
    category: "alert",
    source: "threat_neutralization",
    detail: `Threat #${updated.id} (${updated.type}) status changed to ${body.data.status}`,
    severity: body.data.status === "neutralized" ? "info" : "warning",
  });

  res.json(UpdateThreatStatusResponse.parse(updated));
});

router.post("/threats/:id/isolate", async (req, res): Promise<void> => {
  const params = ExecuteIsolationActionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = ExecuteIsolationActionBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [threat] = await db
    .select()
    .from(threatsTable)
    .where(eq(threatsTable.id, params.data.id));

  if (!threat) {
    res.status(404).json({ error: "Threat not found" });
    return;
  }

  const actionMessages: Record<string, string> = {
    freeze_credit: "Credit freeze initiated across all 3 bureaus (Equifax, Experian, TransUnion)",
    lock_cards: "All associated credit and debit cards have been locked",
    secure_email: "Email account secured — password reset forced, 2FA enabled",
    invalidate_credentials: "All stored credentials invalidated and rotation initiated",
    flag_passport: "Passport flagged for potential identity fraud with authorities",
  };

  if (threat.status === "detected") {
    await db
      .update(threatsTable)
      .set({ status: "isolating" })
      .where(eq(threatsTable.id, threat.id));
  }

  await db.insert(activityLogsTable).values({
    action: `Isolation action: ${body.data.action}`,
    category: "alert",
    source: "threat_neutralization",
    detail: actionMessages[body.data.action] || `Executed ${body.data.action} on threat #${threat.id}`,
    severity: "warning",
  });

  res.json(ExecuteIsolationActionResponse.parse({
    success: true,
    action: body.data.action,
    message: actionMessages[body.data.action] || "Action executed successfully",
    executedAt: new Date(),
  }));
});

router.post("/threats/:threatId/steps/:stepId/complete", async (req, res): Promise<void> => {
  const params = CompleteNeutralizationStepParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [step] = await db
    .select()
    .from(neutralizationStepsTable)
    .where(
      and(
        eq(neutralizationStepsTable.id, params.data.stepId),
        eq(neutralizationStepsTable.threatId, params.data.threatId),
      )
    );

  if (!step) {
    res.status(404).json({ error: "Step not found" });
    return;
  }

  const now = new Date();
  const [updated] = await db
    .update(neutralizationStepsTable)
    .set({
      status: "completed",
      startedAt: step.startedAt || now,
      completedAt: now,
    })
    .where(eq(neutralizationStepsTable.id, step.id))
    .returning();

  const allSteps = await db
    .select()
    .from(neutralizationStepsTable)
    .where(eq(neutralizationStepsTable.threatId, params.data.threatId));

  const allCompleted = allSteps.every(s => s.id === step.id || s.status === "completed");

  if (allCompleted) {
    const [currentThreat] = await db
      .select()
      .from(threatsTable)
      .where(eq(threatsTable.id, params.data.threatId));

    const threatUpdates: Partial<typeof threatsTable.$inferInsert> = {
      status: "neutralized",
      neutralizedAt: now,
    };
    if (!currentThreat?.containedAt) {
      threatUpdates.containedAt = now;
    }

    await db
      .update(threatsTable)
      .set(threatUpdates)
      .where(eq(threatsTable.id, params.data.threatId));
  }

  await db.insert(activityLogsTable).values({
    action: `Neutralization step completed: ${step.title}`,
    category: "alert",
    source: "threat_neutralization",
    detail: `Step ${step.stepOrder} of threat #${params.data.threatId} marked complete`,
    severity: "info",
  });

  res.json(CompleteNeutralizationStepResponse.parse(updated));
});

export default router;

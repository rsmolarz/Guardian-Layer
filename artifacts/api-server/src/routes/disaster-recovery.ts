import { Router, type IRouter } from "express";
import { eq, desc, sql } from "drizzle-orm";
import {
  db,
  drProceduresTable,
  drProcedureStepsTable,
  drTestResultsTable,
  drBusinessImpactTable,
  drFailoverConfigTable,
  drCommunicationPlanTable,
  drComplianceChecklistTable,
} from "@workspace/db";
import {
  GetDrDashboardResponse,
  ListDrProceduresResponse,
  GetDrProcedureParams,
  GetDrProcedureResponse,
  ListDrTestResultsResponse,
  CreateDrTestResultBody,
  ListDrBusinessImpactResponse,
  ListDrFailoverResponse,
  ListDrCommunicationPlanResponse,
  ListDrComplianceResponse,
  UpdateDrComplianceStatusParams,
  UpdateDrComplianceStatusBody,
  UpdateDrComplianceStatusResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/disaster-recovery/dashboard", async (_req, res): Promise<void> => {
  const procedures = await db.select().from(drProceduresTable);
  const testResults = await db.select().from(drTestResultsTable).orderBy(desc(drTestResultsTable.testDate));
  const failover = await db.select().from(drFailoverConfigTable);
  const compliance = await db.select().from(drComplianceChecklistTable);

  const avgRto = procedures.length > 0
    ? Math.round(procedures.reduce((sum, p) => sum + p.rtoMinutes, 0) / procedures.length)
    : 0;
  const avgRpo = procedures.length > 0
    ? Math.round(procedures.reduce((sum, p) => sum + p.rpoMinutes, 0) / procedures.length)
    : 0;

  const avgEstRecovery = procedures.length > 0
    ? Math.round(procedures.reduce((sum, p) => sum + p.estimatedRecoveryMinutes, 0) / procedures.length)
    : 0;

  const compliantCount = compliance.filter((c) => c.status === "compliant").length;
  const compliancePercentage = compliance.length > 0
    ? Math.round((compliantCount / compliance.length) * 100)
    : 0;

  const testedProcedures = procedures.filter((p) => p.lastTestedAt).length;
  const passedTests = testResults.filter((t) => t.outcome === "pass").length;
  const failedTests = testResults.filter((t) => t.outcome === "fail").length;
  const healthyFailover = failover.filter((f) => f.primaryStatus === "healthy").length;

  let readinessScore = 0;
  if (procedures.length > 0) {
    const testedRatio = testedProcedures / procedures.length;
    const passRatio = testResults.length > 0 ? passedTests / testResults.length : 0;
    const failoverRatio = failover.length > 0 ? healthyFailover / failover.length : 0;
    const complianceRatio = compliancePercentage / 100;

    readinessScore = Math.round((testedRatio * 25 + passRatio * 25 + failoverRatio * 25 + complianceRatio * 25));
  }

  const componentHealth = failover.map((f) => ({
    component: f.component,
    status: f.primaryStatus,
    lastChecked: f.lastHealthCheckAt,
  }));

  const lastTest = testResults.length > 0 ? testResults[0] : null;
  let lastDrTest = null;
  if (lastTest) {
    const proc = procedures.find((p) => p.id === lastTest.procedureId);
    lastDrTest = {
      procedureTitle: proc?.title ?? "Unknown",
      testDate: lastTest.testDate,
      outcome: lastTest.outcome,
    };
  }

  const criticalGaps = testResults.filter((t) => t.gapsFound && t.remediationStatus === "pending").length;

  res.json(
    GetDrDashboardResponse.parse({
      readinessScore,
      rtoStatus: {
        targetMinutes: avgRto,
        currentMinutes: avgEstRecovery,
        onTarget: avgEstRecovery <= avgRto,
      },
      rpoStatus: {
        targetMinutes: avgRpo,
        currentMinutes: Math.round(avgRpo * 0.7),
        onTarget: Math.round(avgRpo * 0.7) <= avgRpo,
      },
      componentHealth,
      lastDrTest,
      totalProcedures: procedures.length,
      totalTestsRun: testResults.length,
      compliancePercentage,
      criticalGaps,
    }),
  );
});

router.get("/disaster-recovery/procedures", async (_req, res): Promise<void> => {
  const procedures = await db.select().from(drProceduresTable).orderBy(desc(drProceduresTable.createdAt));

  res.json(
    ListDrProceduresResponse.parse({
      procedures,
      total: procedures.length,
    }),
  );
});

router.get("/disaster-recovery/procedures/:id", async (req, res): Promise<void> => {
  const params = GetDrProcedureParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [procedure] = await db
    .select()
    .from(drProceduresTable)
    .where(eq(drProceduresTable.id, params.data.id));

  if (!procedure) {
    res.status(404).json({ error: "DR procedure not found" });
    return;
  }

  const steps = await db
    .select()
    .from(drProcedureStepsTable)
    .where(eq(drProcedureStepsTable.procedureId, params.data.id))
    .orderBy(drProcedureStepsTable.stepOrder);

  res.json(
    GetDrProcedureResponse.parse({
      procedure,
      steps,
    }),
  );
});

router.get("/disaster-recovery/test-results", async (_req, res): Promise<void> => {
  const results = await db.select().from(drTestResultsTable).orderBy(desc(drTestResultsTable.testDate));

  res.json(
    ListDrTestResultsResponse.parse({
      results,
      total: results.length,
    }),
  );
});

router.post("/disaster-recovery/test-results", async (req, res): Promise<void> => {
  const rawBody = {
    ...req.body,
    testDate: req.body.testDate ? new Date(req.body.testDate) : undefined,
  };
  const body = CreateDrTestResultBody.safeParse(rawBody);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [procedure] = await db
    .select()
    .from(drProceduresTable)
    .where(eq(drProceduresTable.id, body.data.procedureId));

  if (!procedure) {
    res.status(404).json({ error: "DR procedure not found" });
    return;
  }

  const [result] = await db
    .insert(drTestResultsTable)
    .values({
      procedureId: body.data.procedureId,
      testDate: body.data.testDate as Date,
      outcome: body.data.outcome,
      actualRecoveryMinutes: body.data.actualRecoveryMinutes,
      notes: body.data.notes,
      gapsFound: body.data.gapsFound,
      conductedBy: body.data.conductedBy,
    })
    .returning();

  await db
    .update(drProceduresTable)
    .set({
      lastTestedAt: body.data.testDate as Date,
      lastTestResult: body.data.outcome,
      updatedAt: new Date(),
    })
    .where(eq(drProceduresTable.id, body.data.procedureId));

  res.status(201).json(result);
});

router.get("/disaster-recovery/business-impact", async (_req, res): Promise<void> => {
  const items = await db.select().from(drBusinessImpactTable);

  res.json(
    ListDrBusinessImpactResponse.parse({
      items,
      total: items.length,
    }),
  );
});

router.get("/disaster-recovery/failover", async (_req, res): Promise<void> => {
  const configs = await db.select().from(drFailoverConfigTable);

  res.json(
    ListDrFailoverResponse.parse({
      configs,
      total: configs.length,
    }),
  );
});

router.get("/disaster-recovery/communication-plan", async (_req, res): Promise<void> => {
  const entries = await db.select().from(drCommunicationPlanTable);

  res.json(
    ListDrCommunicationPlanResponse.parse({
      entries,
      total: entries.length,
    }),
  );
});

router.get("/disaster-recovery/compliance", async (_req, res): Promise<void> => {
  const items = await db.select().from(drComplianceChecklistTable);

  const frameworkMap = new Map<string, { total: number; compliant: number }>();
  for (const item of items) {
    const entry = frameworkMap.get(item.framework) ?? { total: 0, compliant: 0 };
    entry.total++;
    if (item.status === "compliant") entry.compliant++;
    frameworkMap.set(item.framework, entry);
  }

  const byFramework = Array.from(frameworkMap.entries()).map(([framework, data]) => ({
    framework,
    total: data.total,
    compliant: data.compliant,
    percentage: data.total > 0 ? Math.round((data.compliant / data.total) * 100) : 0,
  }));

  res.json(
    ListDrComplianceResponse.parse({
      items,
      total: items.length,
      byFramework,
    }),
  );
});

router.patch("/disaster-recovery/compliance/:id/status", async (req, res): Promise<void> => {
  const params = UpdateDrComplianceStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateDrComplianceStatusBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(drComplianceChecklistTable)
    .where(eq(drComplianceChecklistTable.id, params.data.id));

  if (!existing) {
    res.status(404).json({ error: "Compliance item not found" });
    return;
  }

  const updateData: Record<string, unknown> = {
    status: body.data.status,
    lastReviewedAt: new Date(),
  };
  if (body.data.evidence !== undefined) {
    updateData.evidence = body.data.evidence;
  }

  const [updated] = await db
    .update(drComplianceChecklistTable)
    .set(updateData)
    .where(eq(drComplianceChecklistTable.id, params.data.id))
    .returning();

  res.json(UpdateDrComplianceStatusResponse.parse(updated));
});

export default router;

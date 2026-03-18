import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db, lockdownSessionsTable, lockdownActionsTable, activityLogsTable } from "@workspace/db";
import {
  GetLockdownStatusResponse,
  ActivateLockdownBody,
  ActivateLockdownResponse,
  LiftLockdownResponse,
  ToggleLockdownActionParams,
  ToggleLockdownActionResponse,
  GetLockdownHistoryResponse,
} from "@workspace/api-zod";
import { logActivity } from "../lib/activity-logger";

const router = Router();

const CONTAINMENT_ACTIONS = [
  { actionType: "freeze_credit", label: "Freeze Credit", description: "All credit bureau accounts frozen — Equifax, Experian, TransUnion" },
  { actionType: "lock_cards", label: "Lock Financial Cards", description: "All credit and debit cards locked — transactions blocked" },
  { actionType: "secure_email", label: "Secure Email Accounts", description: "All email passwords reset and 2FA enforced" },
  { actionType: "invalidate_credentials", label: "Invalidate Credentials", description: "All stored credentials invalidated and rotation initiated" },
  { actionType: "isolate_endpoints", label: "Isolate Endpoints", description: "All endpoints isolated from the network" },
];

async function getActiveSession() {
  const [session] = await db
    .select()
    .from(lockdownSessionsTable)
    .where(eq(lockdownSessionsTable.status, "active"))
    .limit(1);
  return session || null;
}

async function getSessionWithActions(sessionId: number) {
  const [session] = await db
    .select()
    .from(lockdownSessionsTable)
    .where(eq(lockdownSessionsTable.id, sessionId));

  if (!session) return null;

  const actions = await db
    .select()
    .from(lockdownActionsTable)
    .where(eq(lockdownActionsTable.sessionId, sessionId));

  return { ...session, actions };
}

router.get("/lockdown/status", async (_req, res): Promise<void> => {
  const session = await getActiveSession();

  if (!session) {
    res.json(GetLockdownStatusResponse.parse({ isActive: false, session: null }));
    return;
  }

  const actions = await db
    .select()
    .from(lockdownActionsTable)
    .where(eq(lockdownActionsTable.sessionId, session.id));

  res.json(GetLockdownStatusResponse.parse({
    isActive: true,
    session: { ...session, actions },
  }));
});

router.post("/lockdown/activate", async (req, res): Promise<void> => {
  const body = ActivateLockdownBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const existing = await getActiveSession();
  if (existing) {
    res.status(409).json({ error: "Lockdown is already active" });
    return;
  }

  const now = new Date();

  const [session] = await db
    .insert(lockdownSessionsTable)
    .values({
      status: "active",
      reason: body.data.reason,
      activatedAt: now,
    })
    .returning();

  const actionValues = CONTAINMENT_ACTIONS.map((a) => ({
    sessionId: session.id,
    actionType: a.actionType,
    label: a.label,
    description: a.description,
    status: "active" as const,
    activatedAt: now,
  }));

  await db.insert(lockdownActionsTable).values(actionValues);

  await logActivity({
    action: "LOCKDOWN_ACTIVATED",
    category: "lockdown",
    source: "emergency_lockdown",
    detail: `Emergency lockdown activated: ${body.data.reason}`,
    severity: "critical",
  });

  for (const a of CONTAINMENT_ACTIONS) {
    await logActivity({
      action: `LOCKDOWN_ACTION_${a.actionType.toUpperCase()}`,
      category: "lockdown",
      source: "emergency_lockdown",
      detail: `Containment action activated: ${a.label} — ${a.description}`,
      severity: "warning",
    });
  }

  const result = await getSessionWithActions(session.id);
  res.json(ActivateLockdownResponse.parse(result));
});

router.post("/lockdown/lift", async (_req, res): Promise<void> => {
  const session = await getActiveSession();
  if (!session) {
    res.status(404).json({ error: "No active lockdown to lift" });
    return;
  }

  const now = new Date();
  const durationMs = now.getTime() - session.activatedAt.getTime();
  const durationMinutes = Math.floor(durationMs / 60000);
  const durationHours = Math.floor(durationMinutes / 60);
  const remainingMinutes = durationMinutes % 60;
  const durationStr = durationHours > 0
    ? `${durationHours}h ${remainingMinutes}m`
    : `${durationMinutes}m`;

  const actions = await db
    .select()
    .from(lockdownActionsTable)
    .where(eq(lockdownActionsTable.sessionId, session.id));

  const activeActions = actions.filter((a) => a.status === "active");
  const liftedActions = actions.filter((a) => a.status === "lifted");

  await db
    .update(lockdownActionsTable)
    .set({ status: "lifted", liftedAt: now })
    .where(eq(lockdownActionsTable.sessionId, session.id));

  const summaryLines = [
    `Lockdown Duration: ${durationStr}`,
    `Reason: ${session.reason}`,
    `Total Containment Actions: ${actions.length}`,
    `Actions Still Active at Lift: ${activeActions.length}`,
    `Actions Previously Lifted: ${liftedActions.length}`,
    "",
    "Action Summary:",
    ...actions.map((a) => `  - ${a.label}: ${a.status === "lifted" ? `Lifted at ${a.liftedAt?.toISOString()}` : "Active until lockdown lift"}`),
  ];
  const summary = summaryLines.join("\n");

  await db
    .update(lockdownSessionsTable)
    .set({
      status: "lifted",
      deactivatedAt: now,
      summaryReport: summary,
    })
    .where(eq(lockdownSessionsTable.id, session.id));

  await logActivity({
    action: "LOCKDOWN_LIFTED",
    category: "lockdown",
    source: "emergency_lockdown",
    detail: `Emergency lockdown lifted after ${durationStr}. ${activeActions.length} actions were still active.`,
    severity: "critical",
  });

  const updatedSession = await getSessionWithActions(session.id);

  res.json(LiftLockdownResponse.parse({
    success: true,
    session: updatedSession,
    summary,
    duration: durationStr,
  }));
});

router.post("/lockdown/actions/:actionId/toggle", async (req, res): Promise<void> => {
  const params = ToggleLockdownActionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const activeSession = await getActiveSession();
  if (!activeSession) {
    res.status(404).json({ error: "No active lockdown session" });
    return;
  }

  const [action] = await db
    .select()
    .from(lockdownActionsTable)
    .where(eq(lockdownActionsTable.id, params.data.actionId));

  if (!action) {
    res.status(404).json({ error: "Action not found" });
    return;
  }

  if (action.sessionId !== activeSession.id) {
    res.status(400).json({ error: "Action does not belong to the active lockdown session" });
    return;
  }

  const now = new Date();
  const newStatus = action.status === "active" ? "lifted" : "active";

  const [updated] = await db
    .update(lockdownActionsTable)
    .set({
      status: newStatus,
      liftedAt: newStatus === "lifted" ? now : null,
    })
    .where(eq(lockdownActionsTable.id, action.id))
    .returning();

  await logActivity({
    action: newStatus === "lifted" ? "LOCKDOWN_ACTION_LIFTED" : "LOCKDOWN_ACTION_REACTIVATED",
    category: "lockdown",
    source: "emergency_lockdown",
    detail: `Containment action ${newStatus === "lifted" ? "lifted" : "reactivated"}: ${action.label}`,
    severity: "warning",
  });

  res.json(ToggleLockdownActionResponse.parse(updated));
});

router.get("/lockdown/history", async (_req, res): Promise<void> => {
  const logs = await db
    .select()
    .from(activityLogsTable)
    .where(eq(activityLogsTable.category, "lockdown"))
    .orderBy(desc(activityLogsTable.createdAt))
    .limit(50);

  res.json(GetLockdownHistoryResponse.parse({ logs }));
});

export default router;

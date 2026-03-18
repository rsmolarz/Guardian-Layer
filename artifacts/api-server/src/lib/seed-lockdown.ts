import { db, lockdownSessionsTable, lockdownActionsTable, activityLogsTable } from "@workspace/db";
import { sql } from "drizzle-orm";

export async function seedLockdown() {
  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(lockdownSessionsTable);

  if ((countResult?.count ?? 0) > 0) return;

  console.log("Seeding lockdown demo data...");

  const now = new Date();
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600000);

  const [session] = await db
    .insert(lockdownSessionsTable)
    .values({
      status: "active",
      reason: "Critical breach detected — SSN exposure on dark web marketplace combined with multiple unauthorized credit card transactions. Coordinated containment required.",
      activatedAt: hoursAgo(2),
    })
    .returning();

  const actions = [
    { actionType: "freeze_credit", label: "Freeze Credit", description: "All credit bureau accounts frozen — Equifax, Experian, TransUnion", status: "active" as const },
    { actionType: "lock_cards", label: "Lock Financial Cards", description: "All credit and debit cards locked — transactions blocked", status: "active" as const },
    { actionType: "secure_email", label: "Secure Email Accounts", description: "All email passwords reset and 2FA enforced", status: "lifted" as const },
    { actionType: "invalidate_credentials", label: "Invalidate Credentials", description: "All stored credentials invalidated and rotation initiated", status: "active" as const },
    { actionType: "isolate_endpoints", label: "Isolate Endpoints", description: "All endpoints isolated from the network", status: "active" as const },
  ];

  for (const action of actions) {
    await db.insert(lockdownActionsTable).values({
      sessionId: session.id,
      actionType: action.actionType,
      label: action.label,
      description: action.description,
      status: action.status,
      activatedAt: hoursAgo(2),
      liftedAt: action.status === "lifted" ? hoursAgo(1) : null,
    });
  }

  await db.insert(activityLogsTable).values([
    {
      action: "LOCKDOWN_ACTIVATED",
      category: "lockdown",
      source: "emergency_lockdown",
      detail: "Emergency lockdown activated: Critical breach detected — SSN exposure on dark web marketplace combined with multiple unauthorized credit card transactions.",
      severity: "critical",
      createdAt: hoursAgo(2),
    },
    {
      action: "LOCKDOWN_ACTION_FREEZE_CREDIT",
      category: "lockdown",
      source: "emergency_lockdown",
      detail: "Containment action activated: Freeze Credit — All credit bureau accounts frozen",
      severity: "warning",
      createdAt: hoursAgo(2),
    },
    {
      action: "LOCKDOWN_ACTION_LOCK_CARDS",
      category: "lockdown",
      source: "emergency_lockdown",
      detail: "Containment action activated: Lock Financial Cards — All credit and debit cards locked",
      severity: "warning",
      createdAt: hoursAgo(2),
    },
    {
      action: "LOCKDOWN_ACTION_SECURE_EMAIL",
      category: "lockdown",
      source: "emergency_lockdown",
      detail: "Containment action activated: Secure Email Accounts — All email passwords reset and 2FA enforced",
      severity: "warning",
      createdAt: hoursAgo(2),
    },
    {
      action: "LOCKDOWN_ACTION_INVALIDATE_CREDENTIALS",
      category: "lockdown",
      source: "emergency_lockdown",
      detail: "Containment action activated: Invalidate Credentials — All stored credentials invalidated",
      severity: "warning",
      createdAt: hoursAgo(2),
    },
    {
      action: "LOCKDOWN_ACTION_ISOLATE_ENDPOINTS",
      category: "lockdown",
      source: "emergency_lockdown",
      detail: "Containment action activated: Isolate Endpoints — All endpoints isolated from the network",
      severity: "warning",
      createdAt: hoursAgo(2),
    },
    {
      action: "LOCKDOWN_ACTION_LIFTED",
      category: "lockdown",
      source: "emergency_lockdown",
      detail: "Containment action lifted: Secure Email Accounts — Email accounts verified secure, 2FA confirmed active",
      severity: "warning",
      createdAt: hoursAgo(1),
    },
  ]);
}

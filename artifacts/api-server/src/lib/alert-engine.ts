import { db, alertsTable, alertPreferencesTable } from "@workspace/db";
import { desc, eq, and, gte, sql } from "drizzle-orm";
import { publishEvent } from "./event-bus";

const SEVERITY_LEVELS: Record<string, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
};

function meetsMinSeverity(alertSeverity: string, minSeverity: string): boolean {
  return (SEVERITY_LEVELS[alertSeverity] ?? 0) >= (SEVERITY_LEVELS[minSeverity] ?? 0);
}

interface CreateAlertInput {
  title: string;
  message: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  category?: string;
  source?: string;
  metadata?: Record<string, any>;
}

export async function createAlert(input: CreateAlertInput) {
  const [alert] = await db.insert(alertsTable).values({
    title: input.title,
    message: input.message,
    severity: input.severity,
    category: input.category || "general",
    source: input.source || "system",
    metadata: input.metadata || {},
    dismissed: false,
    emailSent: false,
    pushSent: false,
  }).returning();

  publishEvent("alert_created", {
    alertId: alert.id,
    severity: alert.severity,
    title: alert.title,
    category: alert.category,
  }, "alert-engine");

  await routeAlert(alert);

  return alert;
}

async function routeAlert(alert: any) {
  const prefs = await getAlertPreferences();

  for (const pref of prefs) {
    if (!pref.enabled) continue;
    if (!meetsMinSeverity(alert.severity, pref.minSeverity || "medium")) continue;

    if (pref.channel === "email") {
      await sendEmailAlert(alert);
    }
  }
}

async function sendEmailAlert(alert: any) {
  try {
    const { google } = await import("googleapis");

    const accessToken = process.env.GOOGLE_MAIL_ACCESS_TOKEN;
    if (!accessToken) {
      console.log("[alert-engine] No Gmail access token, skipping email alert");
      return;
    }

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });

    const gmail = google.gmail({ version: "v1", auth });

    const severityColors: Record<string, string> = {
      critical: "#dc2626",
      high: "#ea580c",
      medium: "#d97706",
      low: "#2563eb",
      info: "#6b7280",
    };
    const color = severityColors[alert.severity] || "#6b7280";

    const subject = `[GuardianLayer ${alert.severity.toUpperCase()}] ${alert.title}`;
    const htmlBody = `
      <div style="font-family: 'Courier New', monospace; background: #0a0a0f; color: #e2e8f0; padding: 30px; border-radius: 8px;">
        <div style="border-left: 4px solid ${color}; padding-left: 16px; margin-bottom: 20px;">
          <h2 style="color: ${color}; margin: 0 0 8px 0;">${alert.severity.toUpperCase()} ALERT</h2>
          <h3 style="color: #06b6d4; margin: 0;">${alert.title}</h3>
        </div>
        <p style="color: #94a3b8; line-height: 1.6;">${alert.message}</p>
        <div style="margin-top: 20px; padding: 12px; background: #1e1e2e; border-radius: 4px; border: 1px solid #333;">
          <span style="color: #64748b;">Category:</span> <span style="color: #06b6d4;">${alert.category || "general"}</span><br/>
          <span style="color: #64748b;">Source:</span> <span style="color: #06b6d4;">${alert.source || "system"}</span><br/>
          <span style="color: #64748b;">Time:</span> <span style="color: #06b6d4;">${new Date(alert.createdAt).toISOString()}</span>
        </div>
        <p style="color: #475569; font-size: 12px; margin-top: 20px;">— GuardianLayer Enterprise Security Platform</p>
      </div>
    `;

    const raw = Buffer.from(
      `Content-Type: text/html; charset="UTF-8"\nMIME-Version: 1.0\nSubject: ${subject}\nTo: me\n\n${htmlBody}`
    ).toString("base64url");

    await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw },
    });

    await db.update(alertsTable)
      .set({ emailSent: true })
      .where(eq(alertsTable.id, alert.id));

    console.log(`[alert-engine] Email sent for alert ${alert.id}: ${alert.title}`);
  } catch (err: any) {
    console.error("[alert-engine] Email send failed:", err.message);
  }
}

export async function getAlerts(options: {
  severity?: string;
  category?: string;
  dismissed?: boolean;
  limit?: number;
  offset?: number;
} = {}) {
  const { severity, category, dismissed, limit = 50, offset = 0 } = options;

  const conditions = [];
  if (severity) conditions.push(eq(alertsTable.severity, severity));
  if (category) conditions.push(eq(alertsTable.category, category));
  if (dismissed !== undefined) conditions.push(eq(alertsTable.dismissed, dismissed));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const alerts = await db.select().from(alertsTable)
    .where(where)
    .orderBy(desc(alertsTable.createdAt))
    .limit(Math.max(1, Math.min(limit, 200)))
    .offset(Math.max(0, offset));

  const [countResult] = await db.select({ count: sql<number>`count(*)::int` })
    .from(alertsTable)
    .where(where);

  const [undismissedCount] = await db.select({ count: sql<number>`count(*)::int` })
    .from(alertsTable)
    .where(eq(alertsTable.dismissed, false));

  return {
    alerts,
    total: countResult?.count ?? 0,
    undismissed: undismissedCount?.count ?? 0,
  };
}

export async function getRecentAlerts(minutes: number = 5) {
  const since = new Date(Date.now() - minutes * 60 * 1000);
  return db.select().from(alertsTable)
    .where(and(
      gte(alertsTable.createdAt, since),
      eq(alertsTable.dismissed, false)
    ))
    .orderBy(desc(alertsTable.createdAt));
}

export async function dismissAlert(id: number) {
  const [updated] = await db.update(alertsTable)
    .set({ dismissed: true })
    .where(eq(alertsTable.id, id))
    .returning();
  return updated;
}

export async function dismissAllAlerts() {
  await db.update(alertsTable)
    .set({ dismissed: true })
    .where(eq(alertsTable.dismissed, false));
}

export async function markAlertRead(id: number) {
  const [updated] = await db.update(alertsTable)
    .set({ readAt: new Date() })
    .where(eq(alertsTable.id, id))
    .returning();
  return updated;
}

export async function getAlertPreferences() {
  const prefs = await db.select().from(alertPreferencesTable);
  if (prefs.length === 0) {
    const defaults = [
      { channel: "inapp", enabled: true, minSeverity: "low" },
      { channel: "push", enabled: true, minSeverity: "medium" },
      { channel: "email", enabled: true, minSeverity: "high" },
      { channel: "sound", enabled: true, minSeverity: "critical" },
    ];
    const inserted = await db.insert(alertPreferencesTable).values(defaults).returning();
    return inserted;
  }
  return prefs;
}

export async function updateAlertPreference(channel: string, updates: { enabled?: boolean; minSeverity?: string }) {
  const existing = await db.select().from(alertPreferencesTable)
    .where(eq(alertPreferencesTable.channel, channel));

  if (existing.length === 0) {
    const [created] = await db.insert(alertPreferencesTable).values({
      channel,
      enabled: updates.enabled ?? true,
      minSeverity: updates.minSeverity ?? "medium",
    }).returning();
    return created;
  }

  const [updated] = await db.update(alertPreferencesTable)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(alertPreferencesTable.channel, channel))
    .returning();
  return updated;
}

export async function getAlertStats() {
  const [total] = await db.select({ count: sql<number>`count(*)::int` }).from(alertsTable);
  const [undismissed] = await db.select({ count: sql<number>`count(*)::int` })
    .from(alertsTable).where(eq(alertsTable.dismissed, false));
  const [critical] = await db.select({ count: sql<number>`count(*)::int` })
    .from(alertsTable).where(and(eq(alertsTable.severity, "critical"), eq(alertsTable.dismissed, false)));
  const [lastHour] = await db.select({ count: sql<number>`count(*)::int` })
    .from(alertsTable).where(gte(alertsTable.createdAt, new Date(Date.now() - 3600000)));

  return {
    total: total?.count ?? 0,
    undismissed: undismissed?.count ?? 0,
    critical: critical?.count ?? 0,
    lastHour: lastHour?.count ?? 0,
  };
}

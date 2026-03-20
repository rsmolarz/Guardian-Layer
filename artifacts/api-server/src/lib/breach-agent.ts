import { db } from "@workspace/db";
import {
  monitoredDomainsTable,
  domainEmailsTable,
  domainBreachResultsTable,
} from "@workspace/db/schema";
import { eq, desc, isNull, lte, or } from "drizzle-orm";
import { logActivity } from "./activity-logger";

interface AgentConfig {
  enabled: boolean;
  intervalHours: number;
  maxEmailsPerCycle: number;
}

interface AgentStatus {
  config: AgentConfig;
  running: boolean;
  lastRunAt: string | null;
  lastRunResults: RunResult | null;
  nextRunAt: string | null;
  totalScansCompleted: number;
  newBreachesFound: number;
}

interface RunResult {
  startedAt: string;
  completedAt: string;
  emailsScanned: number;
  newBreachesFound: number;
  errors: number;
  results: EmailScanResult[];
}

interface EmailScanResult {
  email: string;
  domain: string;
  previousBreachCount: number;
  currentBreachCount: number;
  newBreaches: string[];
  verdict: string;
  error?: string;
}

let agentConfig: AgentConfig = {
  enabled: false,
  intervalHours: 24,
  maxEmailsPerCycle: 50,
};

let agentTimer: ReturnType<typeof setInterval> | null = null;
let isRunning = false;
let lastRunAt: Date | null = null;
let lastRunResults: RunResult | null = null;
let totalScansCompleted = 0;
let totalNewBreachesFound = 0;

async function scanEmail(
  emailRow: { id: number; email: string; breachCount: number },
  domainName: string,
  hibpKey: string
): Promise<EmailScanResult> {
  const result: EmailScanResult = {
    email: emailRow.email,
    domain: domainName,
    previousBreachCount: emailRow.breachCount,
    currentBreachCount: 0,
    newBreaches: [],
    verdict: "clean",
  };

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    const r = await fetch(
      `https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(emailRow.email)}?truncateResponse=false`,
      {
        headers: { "hibp-api-key": hibpKey, "user-agent": "GuardianLayer-Enterprise" },
        signal: controller.signal,
      }
    );
    clearTimeout(timer);

    if (r.status === 429) {
      result.error = "Rate limited";
      result.currentBreachCount = emailRow.breachCount;
      return result;
    }

    if (!r.ok && r.status !== 404) {
      result.error = `HIBP returned ${r.status}`;
      result.currentBreachCount = emailRow.breachCount;
      return result;
    }

    const existingBreaches = await db
      .select()
      .from(domainBreachResultsTable)
      .where(eq(domainBreachResultsTable.emailId, emailRow.id));
    const existingBreachNames = new Set(existingBreaches.map((b) => b.breachName));

    let breaches: any[] = [];

    if (r.status === 404) {
      result.verdict = "clean";
    } else {
      breaches = (await r.json()) as any[];
      result.currentBreachCount = breaches.length;
      result.verdict =
        breaches.length > 5
          ? "critical"
          : breaches.length > 0
          ? "exposed"
          : "clean";

      for (const b of breaches) {
        if (!existingBreachNames.has(b.Name)) {
          result.newBreaches.push(b.Name);

          await db.insert(domainBreachResultsTable).values({
            emailId: emailRow.id,
            breachName: b.Name,
            breachTitle: b.Title || null,
            breachDomain: b.Domain || null,
            breachDate: b.BreachDate || null,
            pwnCount: b.PwnCount || 0,
            dataClasses: b.DataClasses ? JSON.stringify(b.DataClasses) : null,
            isVerified: b.IsVerified ?? true,
          });
        }
      }
    }

    await db
      .update(domainEmailsTable)
      .set({
        lastCheckedAt: new Date(),
        breachCount: breaches.length,
        verdict: result.verdict,
      })
      .where(eq(domainEmailsTable.id, emailRow.id));
  } catch (err: any) {
    result.error = err.message;
    result.currentBreachCount = emailRow.breachCount;
  }

  return result;
}

async function runAgentCycle(): Promise<void> {
  if (isRunning) {
    console.log("[breach-agent] Cycle already running, skipping");
    return;
  }

  const hibpKey = process.env.HIBP_API_KEY;
  if (!hibpKey) {
    console.log("[breach-agent] No HIBP_API_KEY configured, skipping cycle");
    return;
  }

  isRunning = true;
  const startedAt = new Date();
  console.log("[breach-agent] Starting automated breach scan cycle");

  const runResult: RunResult = {
    startedAt: startedAt.toISOString(),
    completedAt: "",
    emailsScanned: 0,
    newBreachesFound: 0,
    errors: 0,
    results: [],
  };

  try {
    const domains = await db.select().from(monitoredDomainsTable);
    const allEmails: Array<{ id: number; email: string; breachCount: number; domainName: string; domainId: number }> = [];

    for (const domain of domains) {
      const emails = await db
        .select()
        .from(domainEmailsTable)
        .where(eq(domainEmailsTable.domainId, domain.id));

      for (const email of emails) {
        allEmails.push({
          id: email.id,
          email: email.email,
          breachCount: email.breachCount,
          domainName: domain.domain,
          domainId: domain.id,
        });
      }
    }

    if (allEmails.length === 0) {
      console.log("[breach-agent] No emails to scan");
      runResult.completedAt = new Date().toISOString();
      lastRunResults = runResult;
      lastRunAt = new Date();
      isRunning = false;
      return;
    }

    const stalestFirst = allEmails.sort((a, b) => {
      return 0;
    });

    const toScan = stalestFirst.slice(0, agentConfig.maxEmailsPerCycle);

    for (let i = 0; i < toScan.length; i++) {
      if (i > 0) await new Promise((resolve) => setTimeout(resolve, 1600));

      const email = toScan[i];
      const result = await scanEmail(
        { id: email.id, email: email.email, breachCount: email.breachCount },
        email.domainName,
        hibpKey
      );

      runResult.results.push(result);
      runResult.emailsScanned++;

      if (result.error) runResult.errors++;
      if (result.newBreaches.length > 0) {
        runResult.newBreachesFound += result.newBreaches.length;
        totalNewBreachesFound += result.newBreaches.length;
      }

      await db
        .update(monitoredDomainsTable)
        .set({ lastScanAt: new Date() })
        .where(eq(monitoredDomainsTable.id, email.domainId));
    }

    runResult.completedAt = new Date().toISOString();
    lastRunResults = runResult;
    lastRunAt = new Date();
    totalScansCompleted++;

    const summary = `Automated scan: ${runResult.emailsScanned} emails checked, ${runResult.newBreachesFound} new breaches found, ${runResult.errors} errors`;
    console.log(`[breach-agent] ${summary}`);

    await logActivity({
      action: "BREACH_AGENT_SCAN",
      category: "monitoring",
      source: "breach_agent",
      detail: summary,
      severity: runResult.newBreachesFound > 0 ? "warning" : "info",
    });

    if (runResult.newBreachesFound > 0) {
      const newBreachEmails = runResult.results
        .filter((r) => r.newBreaches.length > 0)
        .map((r) => `${r.email} (${r.newBreaches.join(", ")})`)
        .join("; ");

      await logActivity({
        action: "NEW_BREACHES_DETECTED",
        category: "security",
        source: "breach_agent",
        detail: `New breaches detected: ${newBreachEmails}`,
        severity: "critical",
      });
    }
  } catch (err: any) {
    console.error("[breach-agent] Cycle failed:", err.message);
    runResult.completedAt = new Date().toISOString();
    lastRunResults = runResult;
  } finally {
    isRunning = false;
  }
}

export function startBreachAgent(): void {
  if (!agentConfig.enabled) {
    console.log("[breach-agent] Agent is disabled");
    return;
  }

  stopBreachAgent();

  const intervalMs = agentConfig.intervalHours * 60 * 60 * 1000;
  agentTimer = setInterval(() => {
    runAgentCycle().catch((err) =>
      console.error("[breach-agent] Unhandled error:", err)
    );
  }, intervalMs);

  console.log(
    `[breach-agent] Started — scanning every ${agentConfig.intervalHours}h, max ${agentConfig.maxEmailsPerCycle} emails/cycle`
  );

  setTimeout(() => {
    if (agentConfig.enabled) {
      runAgentCycle().catch((err) =>
        console.error("[breach-agent] Initial scan failed:", err)
      );
    }
  }, 10000);
}

export function stopBreachAgent(): void {
  if (agentTimer) {
    clearInterval(agentTimer);
    agentTimer = null;
  }
  console.log("[breach-agent] Stopped");
}

export function getAgentStatus(): AgentStatus {
  const nextRunAt =
    agentConfig.enabled && lastRunAt
      ? new Date(
          lastRunAt.getTime() + agentConfig.intervalHours * 60 * 60 * 1000
        ).toISOString()
      : null;

  return {
    config: { ...agentConfig },
    running: isRunning,
    lastRunAt: lastRunAt?.toISOString() || null,
    lastRunResults: lastRunResults,
    nextRunAt,
    totalScansCompleted,
    newBreachesFound: totalNewBreachesFound,
  };
}

export function updateAgentConfig(updates: Partial<AgentConfig>): AgentConfig {
  const wasEnabled = agentConfig.enabled;

  if (updates.intervalHours !== undefined) {
    agentConfig.intervalHours = Math.max(1, Math.min(168, updates.intervalHours));
  }
  if (updates.maxEmailsPerCycle !== undefined) {
    agentConfig.maxEmailsPerCycle = Math.max(1, Math.min(200, updates.maxEmailsPerCycle));
  }
  if (updates.enabled !== undefined) {
    agentConfig.enabled = updates.enabled;
  }

  if (agentConfig.enabled && !wasEnabled) {
    startBreachAgent();
  } else if (!agentConfig.enabled && wasEnabled) {
    stopBreachAgent();
  } else if (agentConfig.enabled && wasEnabled) {
    stopBreachAgent();
    startBreachAgent();
  }

  return { ...agentConfig };
}

export function triggerManualScan(): { started: boolean; message: string } {
  if (isRunning) {
    return { started: false, message: "A scan is already in progress" };
  }

  runAgentCycle().catch((err) =>
    console.error("[breach-agent] Manual scan failed:", err)
  );

  return { started: true, message: "Manual scan started" };
}

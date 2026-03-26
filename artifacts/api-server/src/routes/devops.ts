import { Router } from "express";
import { db } from "@workspace/db";
import {
  devopsAppsTable, deploymentRecordsTable, backupPoliciesTable,
  backupRecordsTable, agentDefinitionsTable, incidentLogsTable,
  notificationChannelsTable,
} from "@workspace/db/schema";
import { eq, desc, and } from "drizzle-orm";

const router = Router();

router.get("/devops/apps", async (_req, res) => {
  try {
    const apps = await db.select().from(devopsAppsTable).orderBy(devopsAppsTable.name);
    const statusCounts = {
      running: apps.filter((a) => a.status === "running").length,
      stopped: apps.filter((a) => a.status === "stopped").length,
      deploying: apps.filter((a) => a.status === "deploying").length,
      failed: apps.filter((a) => a.status === "failed").length,
      paused: apps.filter((a) => a.status === "paused").length,
    };
    res.json({ apps, stats: { total: apps.length, ...statusCounts } });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/devops/apps", async (req, res) => {
  try {
    const { name, repoUrl, environment, vpsHost, vpsPort, containerName, imageName, exposedPort, currentVersion, status } = req.body;
    const [app] = await db.insert(devopsAppsTable).values({
      name, repoUrl: repoUrl || "", environment: environment || "production",
      vpsHost: vpsHost || "", vpsPort: vpsPort || 22,
      containerName: containerName || name.toLowerCase().replace(/\s+/g, "-"),
      imageName: imageName || "", exposedPort: exposedPort || 3000,
      currentVersion, status: status || "stopped",
    }).returning();
    res.status(201).json({ app });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.put("/devops/apps/:id", async (req, res) => {
  try {
    const allowed: Record<string, any> = {};
    const fields = ["name", "repoUrl", "environment", "vpsHost", "vpsPort", "containerName", "imageName", "exposedPort", "currentVersion", "status", "riskScore"] as const;
    for (const f of fields) { if (req.body[f] !== undefined) allowed[f] = req.body[f]; }
    allowed.updatedAt = new Date();
    const [app] = await db.update(devopsAppsTable)
      .set(allowed)
      .where(eq(devopsAppsTable.id, Number(req.params.id)))
      .returning();
    if (!app) return res.status(404).json({ error: "App not found" });
    res.json({ app });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.delete("/devops/apps/:id", async (req, res) => {
  try {
    await db.delete(devopsAppsTable).where(eq(devopsAppsTable.id, Number(req.params.id)));
    res.json({ deleted: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/devops/apps/bulk", async (req, res) => {
  try {
    const { apps } = req.body;
    if (!Array.isArray(apps)) return res.status(400).json({ error: "apps array required" });
    const rows = apps.map((a: any) => ({
      name: a.name,
      repoUrl: a.repoUrl || "",
      environment: a.environment || "production",
      vpsHost: a.vpsHost || "",
      vpsPort: a.vpsPort || 22,
      containerName: a.containerName || a.name.toLowerCase().replace(/\s+/g, "-"),
      imageName: a.imageName || "",
      exposedPort: a.exposedPort || 3000,
      currentVersion: a.currentVersion || null,
      status: a.status || "stopped",
      riskScore: a.riskScore || 0,
    }));
    const inserted = await db.insert(devopsAppsTable).values(rows).returning();
    res.json({ inserted: inserted.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/devops/apps/:id/deploy", async (req, res) => {
  try {
    const appId = Number(req.params.id);
    const [app] = await db.select().from(devopsAppsTable).where(eq(devopsAppsTable.id, appId));
    if (!app) return res.status(404).json({ error: "App not found" });

    const { version = "latest", imageTag, triggeredBy = "api" } = req.body;
    const finalImageTag = imageTag || `${app.imageName}:${version}`;

    const [record] = await db.insert(deploymentRecordsTable).values({
      appId, version, imageTag: finalImageTag, status: "pending", triggeredBy,
    }).returning();

    await db.update(devopsAppsTable)
      .set({ status: "deploying", updatedAt: new Date() })
      .where(eq(devopsAppsTable.id, appId));

    await logIncident(appId, "info", "deploy", `Deployment triggered for ${app.name} v${version} (${finalImageTag})`);

    res.json({ deploymentId: record.id, message: "Deployment queued", imageTag: finalImageTag });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/devops/apps/:id/deployments", async (req, res) => {
  try {
    const deployments = await db.select().from(deploymentRecordsTable)
      .where(eq(deploymentRecordsTable.appId, Number(req.params.id)))
      .orderBy(desc(deploymentRecordsTable.deployedAt))
      .limit(20);
    res.json({ deployments });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/devops/apps/:id/deploy/:deployId/complete", async (req, res) => {
  try {
    const { status, log } = req.body;
    const [record] = await db.update(deploymentRecordsTable)
      .set({ status, completedAt: new Date(), log })
      .where(eq(deploymentRecordsTable.id, Number(req.params.deployId)))
      .returning();

    if (record) {
      const appStatus = status === "success" ? "running" : "failed";
      const updates: any = { status: appStatus, updatedAt: new Date() };
      if (status === "success") updates.currentVersion = record.version;
      await db.update(devopsAppsTable).set(updates).where(eq(devopsAppsTable.id, record.appId));

      const [app] = await db.select().from(devopsAppsTable).where(eq(devopsAppsTable.id, record.appId));
      await logIncident(record.appId, status === "success" ? "info" : "error", "deploy",
        `Deployment ${status} for ${app?.name || record.appId} v${record.version}`);
    }
    res.json({ record });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/devops/apps/:id/rollback", async (req, res) => {
  try {
    const appId = Number(req.params.id);
    const [lastGood] = await db.select().from(deploymentRecordsTable)
      .where(and(eq(deploymentRecordsTable.appId, appId), eq(deploymentRecordsTable.status, "success")))
      .orderBy(desc(deploymentRecordsTable.deployedAt))
      .limit(1);

    if (!lastGood) return res.status(404).json({ error: "No successful deployment to roll back to" });

    const [record] = await db.insert(deploymentRecordsTable).values({
      appId, version: lastGood.version, imageTag: lastGood.imageTag,
      status: "pending", triggeredBy: "manual_rollback", rollbackOf: lastGood.id,
    }).returning();

    await logIncident(appId, "warning", "deploy", `Rollback triggered to version ${lastGood.version}`);
    res.json({ rollbackDeploymentId: record.id, rollingBackTo: lastGood.version });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/devops/agents", async (_req, res) => {
  try {
    const agents = await db.select().from(agentDefinitionsTable).orderBy(agentDefinitionsTable.name);
    res.json({ agents });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/devops/agents", async (req, res) => {
  try {
    const { name, description, trigger, schedule, enabled, configJson } = req.body;
    const [agent] = await db.insert(agentDefinitionsTable).values({
      name, description, trigger: trigger || "cron", schedule, enabled: enabled ?? true, configJson,
    }).returning();
    res.json({ agent });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/devops/agents/bulk", async (req, res) => {
  try {
    const { agents } = req.body;
    if (!Array.isArray(agents)) return res.status(400).json({ error: "agents array required" });
    const rows = agents.map((a: any) => ({
      name: a.name,
      description: a.description || null,
      trigger: a.trigger || "cron",
      schedule: a.schedule || null,
      enabled: a.enabled ?? true,
      configJson: a.configJson || null,
    }));
    const inserted = await db.insert(agentDefinitionsTable).values(rows).returning();
    res.json({ inserted: inserted.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.put("/devops/agents/:id", async (req, res) => {
  try {
    const allowed: Record<string, any> = {};
    const fields = ["name", "description", "trigger", "schedule", "enabled", "configJson"] as const;
    for (const f of fields) { if (req.body[f] !== undefined) allowed[f] = req.body[f]; }
    const [agent] = await db.update(agentDefinitionsTable)
      .set(allowed)
      .where(eq(agentDefinitionsTable.id, Number(req.params.id)))
      .returning();
    res.json({ agent });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/devops/agents/:id/run", async (req, res) => {
  try {
    const agentId = Number(req.params.id);
    const [agent] = await db.select().from(agentDefinitionsTable).where(eq(agentDefinitionsTable.id, agentId));
    if (!agent) return res.status(404).json({ error: "Agent not found" });

    await db.update(agentDefinitionsTable)
      .set({ lastRunAt: new Date(), lastStatus: "running" })
      .where(eq(agentDefinitionsTable.id, agentId));

    await logIncident(null, "info", "agent", `Agent "${agent.name}" triggered manually`);

    setTimeout(async () => {
      await db.update(agentDefinitionsTable)
        .set({ lastStatus: "completed" })
        .where(eq(agentDefinitionsTable.id, agentId));
      await logIncident(null, "info", "agent", `Agent "${agent.name}" completed`);
    }, 3000);

    res.json({ message: `Agent "${agent.name}" triggered`, agentId });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/devops/backup-policies", async (_req, res) => {
  try {
    const policies = await db.select().from(backupPoliciesTable).orderBy(backupPoliciesTable.id);
    res.json({ policies });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/devops/backup-policies", async (req, res) => {
  try {
    const [policy] = await db.insert(backupPoliciesTable).values(req.body).returning();
    res.json({ policy });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/devops/apps/:id/backup", async (req, res) => {
  try {
    const appId = Number(req.params.id);
    const [app] = await db.select().from(devopsAppsTable).where(eq(devopsAppsTable.id, appId));
    if (!app) return res.status(404).json({ error: "App not found" });

    const [record] = await db.insert(backupRecordsTable).values({
      appId, backupType: "full", status: "pending",
    }).returning();

    await logIncident(appId, "info", "backup", `Backup triggered for ${app.name}`);
    res.json({ backupId: record.id, message: "Backup queued" });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/devops/apps/:id/backups", async (req, res) => {
  try {
    const backups = await db.select().from(backupRecordsTable)
      .where(eq(backupRecordsTable.appId, Number(req.params.id)))
      .orderBy(desc(backupRecordsTable.startedAt))
      .limit(20);
    res.json({ backups });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/devops/incidents", async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 50;
    const incidents = await db.select().from(incidentLogsTable)
      .orderBy(desc(incidentLogsTable.timestamp))
      .limit(limit);
    res.json({ incidents });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/devops/notifications", async (_req, res) => {
  try {
    const channels = await db.select().from(notificationChannelsTable).orderBy(notificationChannelsTable.name);
    res.json({ channels });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/devops/notifications", async (req, res) => {
  try {
    const { name, type, enabled, configJson } = req.body;
    const [channel] = await db.insert(notificationChannelsTable).values({
      name, type: type || "webhook", enabled: enabled ?? true, configJson,
    }).returning();
    res.json({ channel });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.put("/devops/notifications/:id", async (req, res) => {
  try {
    const allowed: Record<string, any> = {};
    const fields = ["name", "type", "enabled", "configJson"] as const;
    for (const f of fields) { if (req.body[f] !== undefined) allowed[f] = req.body[f]; }
    const [channel] = await db.update(notificationChannelsTable)
      .set(allowed)
      .where(eq(notificationChannelsTable.id, Number(req.params.id)))
      .returning();
    res.json({ channel });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/devops/stats", async (_req, res) => {
  try {
    const apps = await db.select().from(devopsAppsTable);
    const deployments = await db.select().from(deploymentRecordsTable)
      .orderBy(desc(deploymentRecordsTable.deployedAt)).limit(100);
    const incidents = await db.select().from(incidentLogsTable)
      .orderBy(desc(incidentLogsTable.timestamp)).limit(100);
    const agents = await db.select().from(agentDefinitionsTable);

    const recentDeploys = deployments.filter((d) => {
      const age = Date.now() - new Date(d.deployedAt).getTime();
      return age < 7 * 24 * 60 * 60 * 1000;
    });

    res.json({
      apps: { total: apps.length, running: apps.filter((a) => a.status === "running").length, failed: apps.filter((a) => a.status === "failed").length },
      deployments: { total: deployments.length, recentWeek: recentDeploys.length, successRate: deployments.length > 0 ? Math.round((deployments.filter((d) => d.status === "success").length / deployments.length) * 100) : 0 },
      incidents: { total: incidents.length, unresolved: incidents.filter((i) => !i.resolved).length, critical: incidents.filter((i) => i.level === "critical").length },
      agents: { total: agents.length, enabled: agents.filter((a) => a.enabled).length },
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

async function logIncident(appId: number | null, level: string, category: string, message: string) {
  try {
    await db.insert(incidentLogsTable).values({
      appId, level: level as any, category, message,
    });
  } catch (e) { /* ignore */ }
}

export default router;

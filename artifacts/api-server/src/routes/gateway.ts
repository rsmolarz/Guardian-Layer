import { Router, type IRouter } from "express";
import { desc, eq, sql, gte } from "drizzle-orm";
import { db, systemEventsTable } from "@workspace/db";
import { publishEvent, getEventBusStats, getRecentEvents } from "../lib/event-bus";
import { logActivity } from "../lib/activity-logger";

const router: IRouter = Router();

router.get("/gateway/status", async (_req, res): Promise<void> => {
  try {
    const busStats = getEventBusStats();
    const recent = getRecentEvents(10);
    const [dbCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(systemEventsTable);

    res.json({
      status: "operational",
      uptime: process.uptime(),
      eventBus: busStats,
      totalPersistedEvents: dbCount?.count ?? 0,
      recentEvents: recent,
    });
  } catch (err: any) {
    console.error("[gateway] GET /status failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve gateway status" });
  }
});

router.get("/gateway/events", async (req, res): Promise<void> => {
  try {
    const limit = Math.max(1, Math.min(parseInt(req.query.limit as string) || 50, 200));
    const offset = Math.max(0, parseInt(req.query.offset as string) || 0);
    const typeFilter = req.query.type as string | undefined;

    const conditions = typeFilter ? eq(systemEventsTable.eventType, typeFilter) : undefined;

    const events = await db
      .select()
      .from(systemEventsTable)
      .where(conditions)
      .orderBy(desc(systemEventsTable.createdAt))
      .limit(limit)
      .offset(offset);

    const [total] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(systemEventsTable)
      .where(conditions);

    const distinctTypes = await db
      .selectDistinct({ eventType: systemEventsTable.eventType })
      .from(systemEventsTable);

    res.json({
      events,
      total: total?.count ?? 0,
      limit,
      offset,
      availableTypes: distinctTypes.map((t) => t.eventType),
    });
  } catch (err: any) {
    console.error("[gateway] GET /events failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve events" });
  }
});

router.post("/gateway/event", async (req, res): Promise<void> => {
  try {
    const { type, payload, source } = req.body;
    if (!type || typeof type !== "string" || !source || typeof source !== "string") {
      res.status(400).json({ error: "Missing or invalid required fields: type (string), source (string)" });
      return;
    }
    if (type.length > 100 || source.length > 100) {
      res.status(400).json({ error: "type and source must be under 100 characters" });
      return;
    }
    const payloadStr = JSON.stringify(payload || {});
    if (payloadStr.length > 10000) {
      res.status(400).json({ error: "Payload too large (max 10KB)" });
      return;
    }

    await publishEvent(type, payload || {}, source);
    res.json({ success: true, type, source });
  } catch (err: any) {
    console.error("[gateway] POST /event failed:", err.message);
    res.status(500).json({ error: "Failed to publish event" });
  }
});

router.post("/gateway/task", async (req, res): Promise<void> => {
  try {
    const { taskName, taskId, assignee, priority, payload } = req.body;
    if (!taskName) {
      res.status(400).json({ error: "Missing required field: taskName" });
      return;
    }

    const id = taskId || `task_${Date.now()}`;
    await publishEvent("task_requested", {
      taskId: id,
      taskName,
      assignee: assignee || "unassigned",
      priority: priority || "normal",
      ...payload,
    }, "api_gateway");

    await logActivity({
      action: "TASK_SUBMITTED",
      category: "gateway",
      source: "api_gateway",
      detail: `Task "${taskName}" submitted (ID: ${id}, priority: ${priority || "normal"})`,
      severity: "info",
    });

    res.json({ success: true, taskId: id, taskName });
  } catch (err: any) {
    console.error("[gateway] POST /task failed:", err.message);
    res.status(500).json({ error: "Failed to submit task" });
  }
});

router.post("/gateway/agent/register", async (req, res): Promise<void> => {
  try {
    const { agentId, agentName, capabilities } = req.body;
    if (!agentId || !agentName) {
      res.status(400).json({ error: "Missing required fields: agentId, agentName" });
      return;
    }

    await publishEvent("agent_online", {
      agentId,
      agentName,
      capabilities: capabilities || [],
      registeredAt: new Date().toISOString(),
    }, "api_gateway");

    res.json({ success: true, agentId, agentName });
  } catch (err: any) {
    console.error("[gateway] POST /agent/register failed:", err.message);
    res.status(500).json({ error: "Failed to register agent" });
  }
});

router.post("/gateway/deploy", async (req, res): Promise<void> => {
  try {
    const { environment, version, service } = req.body;

    await publishEvent("deployment_started", {
      environment: environment || "production",
      version: version || "latest",
      service: service || "main",
      initiatedAt: new Date().toISOString(),
    }, "api_gateway");

    await logActivity({
      action: "DEPLOYMENT_INITIATED",
      category: "gateway",
      source: "api_gateway",
      detail: `Deployment started: ${service || "main"} v${version || "latest"} to ${environment || "production"}`,
      severity: "warning",
    });

    res.json({ success: true, environment: environment || "production", version: version || "latest" });
  } catch (err: any) {
    console.error("[gateway] POST /deploy failed:", err.message);
    res.status(500).json({ error: "Failed to initiate deployment" });
  }
});

router.post("/gateway/backup", async (req, res): Promise<void> => {
  try {
    const { targets, initiatedBy } = req.body;

    await publishEvent("backup_started", {
      targets: targets || ["database", "config"],
      initiatedBy: initiatedBy || "api_gateway",
      startedAt: new Date().toISOString(),
    }, "api_gateway");

    res.json({ success: true, targets: targets || ["database", "config"] });
  } catch (err: any) {
    console.error("[gateway] POST /backup failed:", err.message);
    res.status(500).json({ error: "Failed to trigger backup" });
  }
});

router.get("/gateway/routes", async (_req, res): Promise<void> => {
  res.json({
    routes: [
      { method: "GET", path: "/api/gateway/status", description: "Gateway health + event bus stats + recent events", auth: "session/bearer" },
      { method: "GET", path: "/api/gateway/events", description: "Paginated event stream with optional type filter", auth: "session/bearer", params: "?limit=50&offset=0&type=task_completed" },
      { method: "POST", path: "/api/gateway/event", description: "Publish arbitrary events to the event bus", auth: "session/bearer", body: "{ type, payload, source }" },
      { method: "POST", path: "/api/gateway/task", description: "Submit tasks via the event bus", auth: "session/bearer", body: "{ taskName, taskId?, assignee?, priority?, payload? }" },
      { method: "POST", path: "/api/gateway/agent/register", description: "Register agent via event bus", auth: "session/bearer", body: "{ agentId, agentName, capabilities? }" },
      { method: "POST", path: "/api/gateway/deploy", description: "Trigger deployment events", auth: "session/bearer", body: "{ environment?, version?, service? }" },
      { method: "POST", path: "/api/gateway/backup", description: "Trigger backup with event lifecycle", auth: "session/bearer", body: "{ targets?, initiatedBy? }" },
      { method: "GET", path: "/api/gateway/routes", description: "List all gateway API routes (this endpoint)", auth: "none" },
    ],
    eventTypes: [
      "task_requested", "task_started", "task_progress", "task_completed", "task_failed",
      "agent_online", "agent_offline",
      "deployment_started", "deployment_finished",
      "backup_started", "backup_completed", "backup_failed",
    ],
  });
});

export default router;

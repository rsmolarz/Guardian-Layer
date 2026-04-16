import { Router, type IRouter } from "express";
import { desc, eq, sql, gte, and } from "drizzle-orm";
import crypto from "crypto";
import { db, systemEventsTable, apiKeysTable, platformPinTable } from "@workspace/db";
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
      { method: "GET", path: "/api/gateway/status", description: "Gateway health + event bus stats + recent events", auth: "session/bearer/api-key" },
      { method: "GET", path: "/api/gateway/events", description: "Paginated event stream with optional type filter", auth: "session/bearer/api-key", params: "?limit=50&offset=0&type=task_completed" },
      { method: "POST", path: "/api/gateway/event", description: "Publish arbitrary events to the event bus", auth: "session/bearer/api-key", body: "{ type, payload, source }" },
      { method: "POST", path: "/api/gateway/task", description: "Submit tasks via the event bus", auth: "session/bearer/api-key", body: "{ taskName, taskId?, assignee?, priority?, payload? }" },
      { method: "POST", path: "/api/gateway/agent/register", description: "Register agent via event bus", auth: "session/bearer/api-key", body: "{ agentId, agentName, capabilities? }" },
      { method: "POST", path: "/api/gateway/deploy", description: "Trigger deployment events", auth: "session/bearer/api-key", body: "{ environment?, version?, service? }" },
      { method: "POST", path: "/api/gateway/backup", description: "Trigger backup with event lifecycle", auth: "session/bearer/api-key", body: "{ targets?, initiatedBy? }" },
      { method: "GET", path: "/api/gateway/routes", description: "List all gateway API routes (this endpoint)", auth: "none" },
      { method: "GET", path: "/api/gateway/api-keys", description: "List all API keys (masked)", auth: "session" },
      { method: "POST", path: "/api/gateway/api-keys", description: "Create a new API key", auth: "session", body: "{ name, scopes?, expiresInDays? }" },
      { method: "DELETE", path: "/api/gateway/api-keys/:id", description: "Revoke an API key", auth: "session" },
    ],
    eventTypes: [
      "task_requested", "task_started", "task_progress", "task_completed", "task_failed",
      "agent_online", "agent_offline",
      "deployment_started", "deployment_finished",
      "backup_started", "backup_completed", "backup_failed",
    ],
  });
});

function generateApiKey(): string {
  const prefix = "gl_";
  const key = crypto.randomBytes(32).toString("base64url");
  return `${prefix}${key}`;
}

function hashKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

const ENC_ALGORITHM = "aes-256-gcm";
const ENC_IV_LENGTH = 16;

// PATCHED: APP_ENCRYPTION_KEY is the source of truth (was sha256(DATABASE_URL)).
// Two-layer check:
//   (1) IIFE throws at module load -- server fails fast at boot like JWT_SECRET.
//   (2) getEncryptionKey() re-checks at call time -- defense-in-depth if (1) is ever removed.
// No silent fallbacks.
(() => {
  if (!process.env.APP_ENCRYPTION_KEY) {
    throw new Error("APP_ENCRYPTION_KEY environment variable is required at startup.");
  }
})();

function getEncryptionKey(): Buffer {
  const raw = process.env.APP_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("APP_ENCRYPTION_KEY environment variable is required for encryption operations.");
  }
  return crypto.createHash("sha256").update(raw).digest();
}

function encryptApiKey(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(ENC_IV_LENGTH);
  const cipher = crypto.createCipheriv(ENC_ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = (cipher as any).getAuthTag();
  return iv.toString("hex") + ":" + tag.toString("hex") + ":" + encrypted;
}

function decryptApiKey(ciphertext: string): string {
  const key = getEncryptionKey();
  const parts = ciphertext.split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted data format");
  const iv = Buffer.from(parts[0], "hex");
  const tag = Buffer.from(parts[1], "hex");
  const encrypted = parts[2];
  const decipher = crypto.createDecipheriv(ENC_ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

router.get("/gateway/api-keys", async (_req, res): Promise<void> => {
  try {
    const keys = await db
      .select({
        id: apiKeysTable.id,
        name: apiKeysTable.name,
        keyPrefix: apiKeysTable.keyPrefix,
        scopes: apiKeysTable.scopes,
        lastUsedAt: apiKeysTable.lastUsedAt,
        expiresAt: apiKeysTable.expiresAt,
        revoked: apiKeysTable.revoked,
        createdAt: apiKeysTable.createdAt,
      })
      .from(apiKeysTable)
      .orderBy(desc(apiKeysTable.createdAt));

    res.json({ keys });
  } catch (err: any) {
    console.error("[gateway] GET /api-keys failed:", err.message);
    res.status(500).json({ error: "Failed to list API keys" });
  }
});

router.post("/gateway/api-keys", async (req, res): Promise<void> => {
  try {
    const { name, scopes, expiresInDays } = req.body;
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      res.status(400).json({ error: "Name is required" });
      return;
    }

    const rawKey = generateApiKey();
    const keyHash = hashKey(rawKey);
    const keyPrefix = rawKey.substring(0, 10) + "...";
    const encryptedKey = encryptApiKey(rawKey);
    const scopeStr = scopes || "read,write";
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const [created] = await db.insert(apiKeysTable).values({
      name: name.trim(),
      keyPrefix,
      keyHash,
      encryptedKey,
      scopes: scopeStr,
      expiresAt,
      revoked: false,
    }).returning();

    await logActivity({
      action: "API_KEY_CREATED",
      category: "gateway",
      source: "api_gateway",
      detail: `API key "${name.trim()}" created with scopes: ${scopeStr}`,
    });

    const { encryptedKey: _enc, keyHash: _hash, ...safeKey } = created;
    res.json({
      key: safeKey,
      rawKey,
      message: "Store this key securely — it won't be shown again.",
    });
  } catch (err: any) {
    console.error("[gateway] POST /api-keys failed:", err.message);
    res.status(500).json({ error: "Failed to create API key" });
  }
});

router.delete("/gateway/api-keys/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid key ID" });
      return;
    }

    const [updated] = await db
      .update(apiKeysTable)
      .set({ revoked: true })
      .where(eq(apiKeysTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "API key not found" });
      return;
    }

    await logActivity({
      action: "API_KEY_REVOKED",
      category: "gateway",
      source: "api_gateway",
      detail: `API key "${updated.name}" (ID: ${id}) has been revoked`,
    });

    res.json({ success: true, key: updated });
  } catch (err: any) {
    console.error("[gateway] DELETE /api-keys/:id failed:", err.message);
    res.status(500).json({ error: "Failed to revoke API key" });
  }
});

router.post("/gateway/api-keys/:id/reveal", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid key ID" });
      return;
    }

    const { pin } = req.body;
    if (!pin || typeof pin !== "string") {
      res.status(400).json({ error: "PIN is required to reveal API key" });
      return;
    }

    const [storedPin] = await db.select().from(platformPinTable).limit(1);
    if (!storedPin) {
      res.status(400).json({ error: "No platform PIN has been set. Set one in Security Settings first." });
      return;
    }

    const pinHash = crypto.createHash("sha256").update(pin).digest("hex");
    if (storedPin.pinHash !== pinHash) {
      await logActivity({
        action: "API_KEY_REVEAL_FAILED",
        category: "gateway",
        source: "api_gateway",
        detail: `Failed PIN attempt to reveal API key ID: ${id}`,
        severity: "warning",
      });
      res.status(403).json({ error: "Incorrect PIN" });
      return;
    }

    const [key] = await db
      .select()
      .from(apiKeysTable)
      .where(eq(apiKeysTable.id, id))
      .limit(1);

    if (!key) {
      res.status(404).json({ error: "API key not found" });
      return;
    }

    if (key.revoked) {
      res.status(400).json({ error: "Cannot reveal a revoked API key" });
      return;
    }

    if (!key.encryptedKey) {
      res.status(400).json({ error: "This key was created before secure storage was enabled. The full key cannot be recovered." });
      return;
    }

    const rawKey = decryptApiKey(key.encryptedKey);

    await logActivity({
      action: "API_KEY_REVEALED",
      category: "gateway",
      source: "api_gateway",
      detail: `API key "${key.name}" (ID: ${id}) was revealed via PIN`,
      severity: "info",
    });

    res.json({ rawKey });
  } catch (err: any) {
    console.error("[gateway] POST /api-keys/:id/reveal failed:", err.message);
    res.status(500).json({ error: "Failed to reveal API key" });
  }
});

export default router;

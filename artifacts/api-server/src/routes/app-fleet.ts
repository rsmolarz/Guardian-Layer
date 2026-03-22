import { Router, type IRouter } from "express";
import { db, monitoredUrlsTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";

const router: IRouter = Router();

const BLOCKED_HOSTS = new Set([
  "localhost", "127.0.0.1", "0.0.0.0", "::1",
  "metadata.google.internal", "169.254.169.254",
]);

function isValidExternalUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
    const host = parsed.hostname.toLowerCase();
    if (BLOCKED_HOSTS.has(host)) return false;
    if (host.endsWith(".local") || host.endsWith(".internal")) return false;
    if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(host)) return false;
    if (host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80")) return false;
    return true;
  } catch {
    return false;
  }
}

async function checkUrl(urlStr: string): Promise<{
  status: "online" | "offline" | "error";
  statusCode?: number;
  responseTimeMs: number;
  ssl?: { valid: boolean };
  error?: string;
}> {
  const fullUrl = urlStr.startsWith("http") ? urlStr : `https://${urlStr}`;

  if (!isValidExternalUrl(fullUrl)) {
    return { status: "error", responseTimeMs: 0, error: "Blocked: internal/private URL" };
  }

  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    let response = await fetch(fullUrl, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
    });

    if (response.status === 405 || response.status === 501) {
      const controller2 = new AbortController();
      const timeout2 = setTimeout(() => controller2.abort(), 10000);
      response = await fetch(fullUrl, {
        method: "GET",
        signal: controller2.signal,
        redirect: "follow",
      });
      clearTimeout(timeout2);
    }

    clearTimeout(timeout);
    const responseTimeMs = Date.now() - start;

    return {
      status: response.ok || response.status === 403 ? "online" : "error",
      statusCode: response.status,
      responseTimeMs,
      ssl: { valid: fullUrl.startsWith("https") },
    };
  } catch (err: any) {
    return {
      status: "offline",
      responseTimeMs: Date.now() - start,
      error: err.message?.slice(0, 100),
    };
  }
}

router.get("/app-fleet", async (_req, res): Promise<void> => {
  try {
    const apps = await db
      .select()
      .from(monitoredUrlsTable)
      .orderBy(desc(monitoredUrlsTable.addedAt));
    res.json({ apps });
  } catch (err: any) {
    console.error("[app-fleet] GET failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve apps" });
  }
});

router.post("/app-fleet", async (req, res): Promise<void> => {
  try {
    const { url, label, category } = req.body;
    if (!url || !label) {
      res.status(400).json({ error: "url and label are required" });
      return;
    }
    const [app] = await db
      .insert(monitoredUrlsTable)
      .values({ url, label, category: category || "general" })
      .returning();
    res.json({ app });
  } catch (err: any) {
    console.error("[app-fleet] POST failed:", err.message);
    res.status(500).json({ error: "Failed to add app" });
  }
});

router.post("/app-fleet/bulk", async (req, res): Promise<void> => {
  try {
    const { apps } = req.body;
    if (!Array.isArray(apps) || apps.length === 0) {
      res.status(400).json({ error: "apps array is required" });
      return;
    }
    const values = apps.map((a: any) => ({
      url: a.url,
      label: a.label,
      category: a.category || "general",
      status: "active",
    }));
    const inserted = await db
      .insert(monitoredUrlsTable)
      .values(values)
      .onConflictDoNothing()
      .returning();
    res.json({ inserted: inserted.length, apps: inserted });
  } catch (err: any) {
    console.error("[app-fleet] bulk POST failed:", err.message);
    res.status(500).json({ error: "Failed to bulk add apps" });
  }
});

router.delete("/app-fleet/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(monitoredUrlsTable).where(eq(monitoredUrlsTable.id, id));
    res.json({ success: true });
  } catch (err: any) {
    console.error("[app-fleet] DELETE failed:", err.message);
    res.status(500).json({ error: "Failed to remove app" });
  }
});

router.post("/app-fleet/check", async (_req, res): Promise<void> => {
  try {
    const apps = await db.select().from(monitoredUrlsTable);

    const checkPromises = apps.map(async (app) => {
      const result = await checkUrl(app.url);
      const newStatus = result.status === "online" ? "active" : "down";
      await db
        .update(monitoredUrlsTable)
        .set({ lastChecked: new Date(), status: newStatus })
        .where(eq(monitoredUrlsTable.id, app.id));

      return {
        id: app.id,
        url: app.url,
        ...result,
      };
    });

    const results = await Promise.all(checkPromises.map(p => p.catch(e => null))).then(r => r.filter(Boolean));

    const online = results.filter((r: any) => r.status === "online").length;
    const offline = results.filter((r: any) => r.status === "offline").length;
    const errors = results.filter((r: any) => r.status === "error").length;

    res.json({
      summary: { total: results.length, online, offline, errors },
      results: results.sort((a: any, b: any) => {
        const order: Record<string, number> = { offline: 0, error: 1, online: 2 };
        return (order[a.status] ?? 2) - (order[b.status] ?? 2);
      }),
    });
  } catch (err: any) {
    console.error("[app-fleet] check failed:", err.message);
    res.status(500).json({ error: "Failed to check apps" });
  }
});

router.post("/app-fleet/check/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const [app] = await db
      .select()
      .from(monitoredUrlsTable)
      .where(eq(monitoredUrlsTable.id, id));

    if (!app) {
      res.status(404).json({ error: "App not found" });
      return;
    }

    const result = await checkUrl(app.url);
    const newStatus = result.status === "online" ? "active" : "down";
    await db
      .update(monitoredUrlsTable)
      .set({ lastChecked: new Date(), status: newStatus })
      .where(eq(monitoredUrlsTable.id, id));

    res.json({
      id: app.id,
      url: app.url,
      ...result,
    });
  } catch (err: any) {
    console.error("[app-fleet] single check failed:", err.message);
    res.status(500).json({ error: "Failed to check app" });
  }
});

export default router;

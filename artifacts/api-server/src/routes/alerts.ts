import { Router, type IRouter } from "express";
import {
  createAlert,
  getAlerts,
  getRecentAlerts,
  dismissAlert,
  dismissAllAlerts,
  markAlertRead,
  getAlertPreferences,
  updateAlertPreference,
  getAlertStats,
} from "../lib/alert-engine";

const router: IRouter = Router();

router.get("/alerts", async (req, res): Promise<void> => {
  try {
    const severity = req.query.severity as string | undefined;
    const category = req.query.category as string | undefined;
    const dismissed = req.query.dismissed === "true" ? true : req.query.dismissed === "false" ? false : undefined;
    const limit = Math.max(1, Math.min(parseInt(req.query.limit as string) || 50, 200));
    const offset = Math.max(0, parseInt(req.query.offset as string) || 0);

    const result = await getAlerts({ severity, category, dismissed, limit, offset });
    res.json(result);
  } catch (err: any) {
    console.error("[alerts] GET /alerts failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve alerts" });
  }
});

router.get("/alerts/recent", async (req, res): Promise<void> => {
  try {
    const minutes = Math.max(1, Math.min(parseInt(req.query.minutes as string) || 5, 60));
    const alerts = await getRecentAlerts(minutes);
    res.json({ alerts, count: alerts.length });
  } catch (err: any) {
    console.error("[alerts] GET /alerts/recent failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve recent alerts" });
  }
});

router.get("/alerts/stats", async (_req, res): Promise<void> => {
  try {
    const stats = await getAlertStats();
    res.json(stats);
  } catch (err: any) {
    console.error("[alerts] GET /alerts/stats failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve alert stats" });
  }
});

router.get("/alerts/preferences", async (_req, res): Promise<void> => {
  try {
    const prefs = await getAlertPreferences();
    res.json({ preferences: prefs });
  } catch (err: any) {
    console.error("[alerts] GET /alerts/preferences failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve preferences" });
  }
});

router.post("/alerts/preferences", async (req, res): Promise<void> => {
  try {
    const { channel, enabled, minSeverity } = req.body;
    if (!channel || typeof channel !== "string") {
      res.status(400).json({ error: "Missing required field: channel" });
      return;
    }
    const validChannels = ["inapp", "push", "email", "sound"];
    if (!validChannels.includes(channel)) {
      res.status(400).json({ error: `Invalid channel. Must be one of: ${validChannels.join(", ")}` });
      return;
    }
    const validSeverities = ["critical", "high", "medium", "low", "info"];
    if (minSeverity && !validSeverities.includes(minSeverity)) {
      res.status(400).json({ error: `Invalid severity. Must be one of: ${validSeverities.join(", ")}` });
      return;
    }
    const updates: any = {};
    if (typeof enabled === "boolean") updates.enabled = enabled;
    if (minSeverity) updates.minSeverity = minSeverity;

    const pref = await updateAlertPreference(channel, updates);
    res.json(pref);
  } catch (err: any) {
    console.error("[alerts] POST /alerts/preferences failed:", err.message);
    res.status(500).json({ error: "Failed to update preference" });
  }
});

router.post("/alerts/:id/dismiss", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id) || id <= 0) {
      res.status(400).json({ error: "Invalid alert ID" });
      return;
    }
    const alert = await dismissAlert(id);
    if (!alert) {
      res.status(404).json({ error: "Alert not found" });
      return;
    }
    res.json(alert);
  } catch (err: any) {
    console.error("[alerts] POST /alerts/:id/dismiss failed:", err.message);
    res.status(500).json({ error: "Failed to dismiss alert" });
  }
});

router.post("/alerts/:id/read", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id) || id <= 0) {
      res.status(400).json({ error: "Invalid alert ID" });
      return;
    }
    const alert = await markAlertRead(id);
    if (!alert) {
      res.status(404).json({ error: "Alert not found" });
      return;
    }
    res.json(alert);
  } catch (err: any) {
    console.error("[alerts] POST /alerts/:id/read failed:", err.message);
    res.status(500).json({ error: "Failed to mark alert read" });
  }
});

router.post("/alerts/dismiss-all", async (_req, res): Promise<void> => {
  try {
    await dismissAllAlerts();
    res.json({ success: true });
  } catch (err: any) {
    console.error("[alerts] POST /alerts/dismiss-all failed:", err.message);
    res.status(500).json({ error: "Failed to dismiss alerts" });
  }
});

router.post("/alerts/create", async (req, res): Promise<void> => {
  try {
    const { title, message, severity, category, source, metadata } = req.body;
    if (!title || typeof title !== "string" || !message || typeof message !== "string") {
      res.status(400).json({ error: "Missing required fields: title, message" });
      return;
    }
    const validSeverities = ["critical", "high", "medium", "low", "info"];
    if (severity && !validSeverities.includes(severity)) {
      res.status(400).json({ error: `Invalid severity. Must be one of: ${validSeverities.join(", ")}` });
      return;
    }
    if (title.length > 255 || message.length > 5000) {
      res.status(400).json({ error: "Title must be under 255 chars, message under 5000 chars" });
      return;
    }

    const alert = await createAlert({
      title,
      message,
      severity: severity || "medium",
      category: category || "general",
      source: source || "manual",
      metadata: metadata || {},
    });
    res.json(alert);
  } catch (err: any) {
    console.error("[alerts] POST /alerts/create failed:", err.message);
    res.status(500).json({ error: "Failed to create alert" });
  }
});

router.post("/alerts/test", async (_req, res): Promise<void> => {
  try {
    const alert = await createAlert({
      title: "Test Alert — System Check",
      message: "This is a test alert to verify the multi-channel notification system is working correctly. You should see this in-app, and depending on your preferences, via browser push notification and email.",
      severity: "medium",
      category: "system",
      source: "alert-test",
    });
    res.json({ success: true, alert });
  } catch (err: any) {
    console.error("[alerts] POST /alerts/test failed:", err.message);
    res.status(500).json({ error: "Failed to send test alert" });
  }
});

export default router;

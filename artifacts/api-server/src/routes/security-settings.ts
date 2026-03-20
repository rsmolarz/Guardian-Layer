import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import crypto from "crypto";
import { db, securitySettingsTable, settingsChangeLogTable, platformPinTable } from "@workspace/db";
import { logActivity } from "../lib/activity-logger";

const router: IRouter = Router();

function hashPin(pin: string): string {
  return crypto.createHash("sha256").update(pin).digest("hex");
}

router.get("/security-settings", async (_req, res): Promise<void> => {
  try {
    const settings = await db
      .select()
      .from(securitySettingsTable)
      .orderBy(securitySettingsTable.category, securitySettingsTable.settingName);

    res.json({ settings });
  } catch (err: any) {
    console.error("[security-settings] GET failed:", err.message);
    res.status(500).json({ error: "Failed to list security settings" });
  }
});

router.post("/security-settings", async (req, res): Promise<void> => {
  try {
    const { category, settingName, currentValue, notes } = req.body;
    if (!category || !settingName || !currentValue) {
      res.status(400).json({ error: "category, settingName, and currentValue are required" });
      return;
    }

    const [created] = await db.insert(securitySettingsTable).values({
      category: category.trim(),
      settingName: settingName.trim(),
      currentValue: currentValue.trim(),
      notes: notes?.trim() || null,
      lastVerifiedAt: new Date(),
    }).returning();

    await logActivity({
      action: "SECURITY_SETTING_ADDED",
      category: "security",
      source: "security_settings",
      detail: `Added setting "${settingName}" in category "${category}"`,
    });

    res.json({ setting: created });
  } catch (err: any) {
    console.error("[security-settings] POST failed:", err.message);
    res.status(500).json({ error: "Failed to add security setting" });
  }
});

router.put("/security-settings/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

    const { currentValue, notes } = req.body;
    if (!currentValue) { res.status(400).json({ error: "currentValue is required" }); return; }

    const [existing] = await db.select().from(securitySettingsTable).where(eq(securitySettingsTable.id, id));
    if (!existing) { res.status(404).json({ error: "Setting not found" }); return; }

    if (existing.currentValue !== currentValue.trim()) {
      await db.insert(settingsChangeLogTable).values({
        settingId: id,
        previousValue: existing.currentValue,
        newValue: currentValue.trim(),
        changedBy: "user",
      });

      await logActivity({
        action: "SECURITY_SETTING_CHANGED",
        category: "security",
        source: "security_settings",
        detail: `Setting "${existing.settingName}" changed from "${existing.currentValue}" to "${currentValue.trim()}"`,
        severity: "warning",
      });
    }

    const [updated] = await db
      .update(securitySettingsTable)
      .set({
        currentValue: currentValue.trim(),
        notes: notes?.trim() || existing.notes,
        updatedAt: new Date(),
      })
      .where(eq(securitySettingsTable.id, id))
      .returning();

    res.json({ setting: updated });
  } catch (err: any) {
    console.error("[security-settings] PUT failed:", err.message);
    res.status(500).json({ error: "Failed to update security setting" });
  }
});

router.post("/security-settings/:id/verify", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

    const [updated] = await db
      .update(securitySettingsTable)
      .set({ lastVerifiedAt: new Date(), updatedAt: new Date() })
      .where(eq(securitySettingsTable.id, id))
      .returning();

    if (!updated) { res.status(404).json({ error: "Setting not found" }); return; }

    res.json({ setting: updated });
  } catch (err: any) {
    console.error("[security-settings] POST /verify failed:", err.message);
    res.status(500).json({ error: "Failed to verify setting" });
  }
});

router.delete("/security-settings/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

    const [deleted] = await db
      .delete(securitySettingsTable)
      .where(eq(securitySettingsTable.id, id))
      .returning();

    if (!deleted) { res.status(404).json({ error: "Setting not found" }); return; }

    await logActivity({
      action: "SECURITY_SETTING_REMOVED",
      category: "security",
      source: "security_settings",
      detail: `Removed setting "${deleted.settingName}" from category "${deleted.category}"`,
    });

    res.json({ success: true });
  } catch (err: any) {
    console.error("[security-settings] DELETE failed:", err.message);
    res.status(500).json({ error: "Failed to delete security setting" });
  }
});

router.get("/security-settings/:id/history", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

    const history = await db
      .select()
      .from(settingsChangeLogTable)
      .where(eq(settingsChangeLogTable.settingId, id))
      .orderBy(desc(settingsChangeLogTable.createdAt));

    res.json({ history });
  } catch (err: any) {
    console.error("[security-settings] GET /history failed:", err.message);
    res.status(500).json({ error: "Failed to get change history" });
  }
});

router.get("/platform-pin/status", async (_req, res): Promise<void> => {
  try {
    const pins = await db.select().from(platformPinTable).limit(1);
    res.json({ hasPin: pins.length > 0 });
  } catch (err: any) {
    console.error("[platform-pin] GET /status failed:", err.message);
    res.status(500).json({ error: "Failed to check PIN status" });
  }
});

router.post("/platform-pin/set", async (req, res): Promise<void> => {
  try {
    const { pin } = req.body;
    if (!pin || typeof pin !== "string" || pin.length < 4 || pin.length > 20) {
      res.status(400).json({ error: "PIN must be 4-20 characters" });
      return;
    }

    const pinHashed = hashPin(pin);
    const existing = await db.select().from(platformPinTable).limit(1);

    if (existing.length > 0) {
      await db.update(platformPinTable).set({ pinHash: pinHashed, updatedAt: new Date() }).where(eq(platformPinTable.id, existing[0].id));
    } else {
      await db.insert(platformPinTable).values({ pinHash: pinHashed });
    }

    await logActivity({
      action: "PLATFORM_PIN_SET",
      category: "security",
      source: "platform_pin",
      detail: "Platform access PIN was set or updated",
    });

    res.json({ success: true });
  } catch (err: any) {
    console.error("[platform-pin] POST /set failed:", err.message);
    res.status(500).json({ error: "Failed to set PIN" });
  }
});

router.post("/platform-pin/verify", async (req, res): Promise<void> => {
  try {
    const { pin } = req.body;
    if (!pin) { res.status(400).json({ error: "PIN is required" }); return; }

    const [stored] = await db.select().from(platformPinTable).limit(1);
    if (!stored) { res.status(404).json({ error: "No PIN has been set" }); return; }

    const isValid = stored.pinHash === hashPin(pin);

    if (!isValid) {
      await logActivity({
        action: "PLATFORM_PIN_FAILED",
        category: "security",
        source: "platform_pin",
        detail: "Failed PIN verification attempt",
        severity: "warning",
      });
    }

    res.json({ valid: isValid });
  } catch (err: any) {
    console.error("[platform-pin] POST /verify failed:", err.message);
    res.status(500).json({ error: "Failed to verify PIN" });
  }
});

router.delete("/platform-pin", async (_req, res): Promise<void> => {
  try {
    await db.delete(platformPinTable);

    await logActivity({
      action: "PLATFORM_PIN_REMOVED",
      category: "security",
      source: "platform_pin",
      detail: "Platform access PIN was removed",
    });

    res.json({ success: true });
  } catch (err: any) {
    console.error("[platform-pin] DELETE failed:", err.message);
    res.status(500).json({ error: "Failed to remove PIN" });
  }
});

export default router;

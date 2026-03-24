import { Router, type IRouter } from "express";
import { db, yubikeyAppCoverageTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/yubikey/coverage", async (_req, res): Promise<void> => {
  try {
    const apps = await db
      .select()
      .from(yubikeyAppCoverageTable)
      .orderBy(desc(yubikeyAppCoverageTable.createdAt));
    const total = apps.length;
    const protected_ = apps.filter(a => a.hasHardwareKey).length;
    const unprotected = total - protected_;
    res.json({ apps, stats: { total, protected: protected_, unprotected } });
  } catch (err: any) {
    console.error("[yubikey-coverage] GET failed:", err.message);
    res.status(500).json({ error: "Failed to load coverage data" });
  }
});

router.post("/yubikey/coverage", async (req, res): Promise<void> => {
  try {
    const { appName, appUrl, hasHardwareKey, protectionType, keySerials, notes } = req.body;
    if (!appName) {
      res.status(400).json({ error: "appName is required" });
      return;
    }
    const [app] = await db
      .insert(yubikeyAppCoverageTable)
      .values({
        appName,
        appUrl: appUrl || null,
        hasHardwareKey: hasHardwareKey || false,
        protectionType: protectionType || "none",
        keySerials: keySerials || null,
        notes: notes || null,
        lastVerified: hasHardwareKey ? new Date() : null,
      })
      .returning();
    res.json({ app });
  } catch (err: any) {
    console.error("[yubikey-coverage] POST failed:", err.message);
    res.status(500).json({ error: "Failed to add app" });
  }
});

router.post("/yubikey/coverage/bulk", async (req, res): Promise<void> => {
  try {
    const { apps } = req.body;
    if (!Array.isArray(apps) || apps.length === 0) {
      res.status(400).json({ error: "apps array is required" });
      return;
    }
    const values = apps.map((a: any) => ({
      appName: a.appName,
      appUrl: a.appUrl || null,
      hasHardwareKey: a.hasHardwareKey || false,
      protectionType: a.protectionType || "none",
      keySerials: a.keySerials || null,
      notes: a.notes || null,
      lastVerified: a.hasHardwareKey ? new Date() : null,
    }));
    const inserted = await db
      .insert(yubikeyAppCoverageTable)
      .values(values)
      .onConflictDoNothing()
      .returning();
    res.json({ inserted: inserted.length });
  } catch (err: any) {
    console.error("[yubikey-coverage] bulk POST failed:", err.message);
    res.status(500).json({ error: "Failed to bulk add" });
  }
});

router.put("/yubikey/coverage/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const { hasHardwareKey, protectionType, keySerials, notes } = req.body;
    const updates: any = {};
    if (hasHardwareKey !== undefined) updates.hasHardwareKey = hasHardwareKey;
    if (protectionType !== undefined) updates.protectionType = protectionType;
    if (keySerials !== undefined) updates.keySerials = keySerials;
    if (notes !== undefined) updates.notes = notes;
    if (hasHardwareKey) updates.lastVerified = new Date();

    const [app] = await db
      .update(yubikeyAppCoverageTable)
      .set(updates)
      .where(eq(yubikeyAppCoverageTable.id, id))
      .returning();
    res.json({ app });
  } catch (err: any) {
    console.error("[yubikey-coverage] PUT failed:", err.message);
    res.status(500).json({ error: "Failed to update" });
  }
});

router.delete("/yubikey/coverage/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(yubikeyAppCoverageTable).where(eq(yubikeyAppCoverageTable.id, id));
    res.json({ success: true });
  } catch (err: any) {
    console.error("[yubikey-coverage] DELETE failed:", err.message);
    res.status(500).json({ error: "Failed to delete" });
  }
});

export default router;

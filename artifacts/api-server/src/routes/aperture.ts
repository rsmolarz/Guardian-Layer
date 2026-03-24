import { Router } from "express";
import { db } from "@workspace/db";
import { apertureAppsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/aperture/apps", async (_req, res) => {
  try {
    const apps = await db.select().from(apertureAppsTable).orderBy(apertureAppsTable.appName);
    const totalApps = apps.length;
    const routed = apps.filter((a) => a.routedThroughAperture).length;
    const notStarted = apps.filter((a) => a.migrationStatus === "not_started").length;
    const inProgress = apps.filter((a) => a.migrationStatus === "in_progress").length;
    const completed = apps.filter((a) => a.migrationStatus === "completed").length;

    const providerCounts: Record<string, number> = {};
    for (const app of apps) {
      if (app.aiProviders) {
        for (const p of app.aiProviders.split(",").map((s) => s.trim()).filter(Boolean)) {
          providerCounts[p] = (providerCounts[p] || 0) + 1;
        }
      }
    }

    res.json({
      apps,
      stats: {
        totalApps,
        routedThroughAperture: routed,
        notStarted,
        inProgress,
        completed,
        coveragePercent: totalApps > 0 ? Math.round((routed / totalApps) * 100) : 0,
        providerCounts,
      },
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.put("/aperture/apps/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const [updated] = await db
      .update(apertureAppsTable)
      .set({ ...updates, lastChecked: new Date() })
      .where(eq(apertureAppsTable.id, Number(id)))
      .returning();
    if (!updated) return res.status(404).json({ error: "App not found" });
    res.json({ app: updated });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/aperture/apps/bulk", async (req, res) => {
  try {
    const { apps } = req.body;
    if (!Array.isArray(apps) || apps.length === 0) {
      return res.status(400).json({ error: "apps array required" });
    }
    const inserted = await db.insert(apertureAppsTable).values(apps).returning();
    res.json({ inserted: inserted.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/aperture/stats", async (_req, res) => {
  try {
    const apps = await db.select().from(apertureAppsTable);
    const providerCounts: Record<string, number> = {};
    let totalEstCost = 0;

    for (const app of apps) {
      if (app.aiProviders) {
        for (const p of app.aiProviders.split(",").map((s) => s.trim()).filter(Boolean)) {
          providerCounts[p] = (providerCounts[p] || 0) + 1;
        }
      }
      if (app.estimatedMonthlyCost) {
        const cost = parseFloat(app.estimatedMonthlyCost.replace(/[^0-9.]/g, ""));
        if (!isNaN(cost)) totalEstCost += cost;
      }
    }

    res.json({
      totalApps: apps.length,
      routedCount: apps.filter((a) => a.routedThroughAperture).length,
      coveragePercent: apps.length > 0 ? Math.round((apps.filter((a) => a.routedThroughAperture).length / apps.length) * 100) : 0,
      migrationStatus: {
        not_started: apps.filter((a) => a.migrationStatus === "not_started").length,
        in_progress: apps.filter((a) => a.migrationStatus === "in_progress").length,
        completed: apps.filter((a) => a.migrationStatus === "completed").length,
      },
      providerCounts,
      totalEstimatedMonthlyCost: `$${totalEstCost.toFixed(2)}`,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;

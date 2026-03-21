import { Router, type IRouter } from "express";
import {
  getAnomalies,
  getAnomalySummary,
  updateAnomalyStatus,
  getThreatCorrelations,
  getLockedOutIPs,
  getIPReputationCache,
  checkIPReputation,
  runThreatCorrelation,
  type ThreatCorrelation,
} from "../lib/anomaly-engine";
import { getBlockedIPs, getIPStats } from "../middleware/ip-guard";

const router: IRouter = Router();

router.get("/threat-detection/overview", async (_req, res): Promise<void> => {
  const anomalySummary = getAnomalySummary();
  const correlations = getThreatCorrelations();
  const lockedOut = getLockedOutIPs();
  const ipStats = getIPStats();
  const reputationCache = getIPReputationCache();
  const blockedIPs = getBlockedIPs();

  const activeCorrelations = correlations.filter(
    (c) => Date.now() - new Date(c.detectedAt).getTime() < 30 * 60 * 1000
  );

  const maliciousIPs = reputationCache.filter((r) => r.score >= 50);

  res.json({
    anomalySummary,
    threatCorrelations: activeCorrelations.slice(0, 20),
    totalCorrelations: correlations.length,
    loginSecurity: {
      lockedOutIPs: lockedOut,
      totalLockedOut: lockedOut.length,
      lockoutDurationMinutes: 15,
      lockoutThreshold: 5,
    },
    ipReputation: {
      checkedIPs: reputationCache.length,
      maliciousIPs: maliciousIPs.length,
      suspiciousIPs: reputationCache.filter((r) => r.score >= 25 && r.score < 50).length,
      cleanIPs: reputationCache.filter((r) => r.score < 25).length,
      recentChecks: reputationCache.slice(0, 20),
    },
    networkStats: {
      ...ipStats,
      blockedIPs: blockedIPs.length,
    },
  });
});

router.get("/threat-detection/anomalies", async (req, res): Promise<void> => {
  const { severity, status, type } = req.query as Record<string, string | undefined>;
  const anomalies = getAnomalies({ severity, status, type });
  res.json({ anomalies, total: anomalies.length });
});

router.patch("/threat-detection/anomalies/:id", async (req, res): Promise<void> => {
  const { id } = req.params;
  const { status } = req.body;
  if (!["active", "investigating", "mitigated"].includes(status)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }
  const updated = updateAnomalyStatus(id, status);
  if (!updated) {
    res.status(404).json({ error: "Anomaly not found" });
    return;
  }
  res.json({ success: true });
});

router.get("/threat-detection/correlations", async (_req, res): Promise<void> => {
  const correlations = getThreatCorrelations();
  res.json({ correlations, total: correlations.length });
});

router.post("/threat-detection/correlate-now", async (_req, res): Promise<void> => {
  await runThreatCorrelation();
  const correlations = getThreatCorrelations();
  res.json({ correlations, total: correlations.length, message: "Correlation analysis complete" });
});

router.get("/threat-detection/locked-ips", async (_req, res): Promise<void> => {
  const locked = getLockedOutIPs();
  res.json({ lockedIPs: locked, total: locked.length });
});

router.get("/threat-detection/ip-reputation", async (_req, res): Promise<void> => {
  const cache = getIPReputationCache();
  res.json({ results: cache, total: cache.length });
});

router.post("/threat-detection/check-ip", async (req, res): Promise<void> => {
  const { ip } = req.body;
  if (!ip || typeof ip !== "string") {
    res.status(400).json({ error: "IP address is required" });
    return;
  }
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipRegex.test(ip)) {
    res.status(400).json({ error: "Invalid IP address format" });
    return;
  }
  const result = await checkIPReputation(ip);
  if (!result) {
    res.json({ ip, score: 0, category: "unknown", isKnownBad: false, message: "Could not check IP reputation (API key may not be configured or IP is private)" });
    return;
  }
  res.json({ ip, ...result });
});

export default router;

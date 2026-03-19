import { Router, type IRouter } from "express";
import { blockIP, unblockIP, getBlockedIPs, getIPStats } from "../middleware/ip-guard";

const router: IRouter = Router();

router.get("/security/ip-stats", async (_req, res): Promise<void> => {
  const stats = getIPStats();
  res.json(stats);
});

router.get("/security/blocked-ips", async (_req, res): Promise<void> => {
  const blocked = getBlockedIPs();
  res.json({ blockedIPs: blocked, total: blocked.length });
});

router.post("/security/block-ip", async (req, res): Promise<void> => {
  const { ip } = req.body;
  if (!ip || typeof ip !== "string") {
    res.status(400).json({ error: "Valid IP address is required" });
    return;
  }

  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipRegex.test(ip)) {
    res.status(400).json({ error: "Invalid IP address format" });
    return;
  }

  blockIP(ip);
  console.warn(`[IP-GUARD] Manually blocked IP: ${ip}`);
  res.json({ success: true, message: `IP ${ip} has been blocked` });
});

router.post("/security/unblock-ip", async (req, res): Promise<void> => {
  const { ip } = req.body;
  if (!ip || typeof ip !== "string") {
    res.status(400).json({ error: "Valid IP address is required" });
    return;
  }

  unblockIP(ip);
  console.log(`[IP-GUARD] Unblocked IP: ${ip}`);
  res.json({ success: true, message: `IP ${ip} has been unblocked` });
});

export default router;

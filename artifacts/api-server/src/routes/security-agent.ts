import { Router, type IRouter } from "express";
import { runSecurityAudit, getSecurityScore } from "../lib/security-agent";

const router: IRouter = Router();

router.get("/agent/audit", async (_req, res): Promise<void> => {
  try {
    const audit = await runSecurityAudit();
    res.json(audit);
  } catch (err: any) {
    console.error("[security-agent] Audit failed:", err.message);
    res.status(500).json({ error: "Security audit failed" });
  }
});

router.get("/agent/score", async (_req, res): Promise<void> => {
  try {
    const score = await getSecurityScore();
    res.json(score);
  } catch (err: any) {
    console.error("[security-agent] Score failed:", err.message);
    res.status(500).json({ error: "Failed to retrieve security score" });
  }
});

export default router;

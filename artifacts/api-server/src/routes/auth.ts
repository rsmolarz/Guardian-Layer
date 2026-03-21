import { Router, type IRouter } from "express";
import { z } from "zod";
import { signToken } from "../middleware/auth";
import { authLimiter } from "../middleware/rate-limiter";

const router: IRouter = Router();

const loginSchema = z.object({
  username: z.string({ required_error: "Username is required" }).min(1, "Username is required"),
  password: z.string({ required_error: "Password is required" }).min(1, "Password is required"),
});

const DEMO_USERS: Record<string, { password: string; userId: string; role: string }> = {
  admin: { password: "admin123", userId: "usr_001", role: "admin" },
};

router.post("/auth/login", authLimiter, async (req, res): Promise<void> => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message || "Invalid input.";
      res.status(400).json({ error: firstError });
      return;
    }
    const { username, password } = parsed.data;

    const user = DEMO_USERS[username];
    if (!user || user.password !== password) {
      res.status(401).json({ error: "Invalid credentials." });
      return;
    }

    const token = signToken({ userId: user.userId, username, role: user.role });
    res.json({ token, user: { userId: user.userId, username, role: user.role } });
  } catch (err: any) {
    console.error("[auth] POST /login failed:", err.message);
    res.status(500).json({ error: "Authentication failed." });
  }
});

router.get("/auth/me", async (req, res): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }
  res.json({ user: req.user });
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  res.json({ success: true, message: "Logged out successfully." });
});

export default router;

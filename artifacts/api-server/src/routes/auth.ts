import { Router, type IRouter } from "express";
import { z } from "zod";
import { signToken } from "../middleware/auth";
import { authLimiter } from "../middleware/rate-limiter";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq, or } from "drizzle-orm";
import bcrypt from "bcryptjs";

const router: IRouter = Router();

const loginSchema = z.object({
  username: z.string({ required_error: "Email or username is required" }).min(1, "Email or username is required"),
  password: z.string({ required_error: "Password is required" }).min(1, "Password is required"),
});

router.post("/auth/login", authLimiter, async (req, res): Promise<void> => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message || "Invalid input.";
      res.status(400).json({ error: firstError });
      return;
    }
    const { username, password } = parsed.data;

    const users = await db
      .select()
      .from(usersTable)
      .where(or(eq(usersTable.email, username), eq(usersTable.username, username)))
      .limit(1);

    const user = users[0];
    if (!user) {
      res.status(401).json({ error: "Invalid credentials." });
      return;
    }

    if (!user.active) {
      res.status(401).json({ error: "Account is deactivated. Contact your administrator." });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid credentials." });
      return;
    }

    const token = signToken({ userId: String(user.id), username: user.username, role: user.role });
    res.json({
      token,
      user: { userId: String(user.id), username: user.username, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error("[auth] POST /login failed:", err instanceof Error ? err.message : err);
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

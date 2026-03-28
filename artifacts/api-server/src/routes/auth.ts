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
    console.log(`[auth] Login attempt: username="${username}", password length=${password.length}, password chars=[${[...password].map(c => c.charCodeAt(0)).join(',')}]`);

    const users = await db
      .select()
      .from(usersTable)
      .where(or(eq(usersTable.email, username), eq(usersTable.username, username)))
      .limit(1);

    const user = users[0];
    if (!user) {
      console.log(`[auth] No user found for: "${username}"`);
      res.status(401).json({ error: "Invalid credentials." });
      return;
    }

    if (!user.active) {
      console.log(`[auth] User "${username}" is deactivated`);
      res.status(401).json({ error: "Account is deactivated. Contact your administrator." });
      return;
    }

    console.log(`[auth] Found user: id=${user.id}, username="${user.username}", hash prefix="${user.passwordHash.substring(0, 20)}"`);
    const valid = await bcrypt.compare(password, user.passwordHash);
    console.log(`[auth] Password compare result: ${valid}`);
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

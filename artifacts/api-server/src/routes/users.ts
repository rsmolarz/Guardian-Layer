import { Router, type IRouter } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { requireSuperadmin } from "../middleware/auth";

const router: IRouter = Router();

router.get("/users", requireSuperadmin, async (req, res): Promise<void> => {
  try {
    const users = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        username: usersTable.username,
        role: usersTable.role,
        active: usersTable.active,
        createdAt: usersTable.createdAt,
        updatedAt: usersTable.updatedAt,
      })
      .from(usersTable)
      .orderBy(usersTable.createdAt);

    res.json(users);
  } catch (err) {
    console.error("[users] GET /users failed:", err instanceof Error ? err.message : err);
    res.status(500).json({ error: "Failed to fetch users." });
  }
});

const createUserSchema = z.object({
  email: z.string().email("Valid email is required"),
  username: z.string().min(3, "Username must be at least 3 characters").max(50),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["admin", "user"]),
});

router.post("/users", requireSuperadmin, async (req, res): Promise<void> => {
  try {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message || "Invalid input.";
      res.status(400).json({ error: firstError });
      return;
    }

    const { email, username, password, role } = parsed.data;

    const passwordHash = await bcrypt.hash(password, 12);

    const [newUser] = await db
      .insert(usersTable)
      .values({ email, username, passwordHash, role, active: true })
      .returning({
        id: usersTable.id,
        email: usersTable.email,
        username: usersTable.username,
        role: usersTable.role,
        active: usersTable.active,
        createdAt: usersTable.createdAt,
      });

    res.status(201).json(newUser);
  } catch (err) {
    const pgErr = err as { code?: string; detail?: string };
    if (pgErr.code === "23505") {
      const detail = pgErr.detail || "";
      if (detail.includes("email")) {
        res.status(409).json({ error: "A user with this email already exists." });
      } else if (detail.includes("username")) {
        res.status(409).json({ error: "A user with this username already exists." });
      } else {
        res.status(409).json({ error: "A user with this email or username already exists." });
      }
      return;
    }
    console.error("[users] POST /users failed:", err instanceof Error ? err.message : err);
    res.status(500).json({ error: "Failed to create user." });
  }
});

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  username: z.string().min(3).max(50).optional(),
  role: z.enum(["admin", "user"]).optional(),
  active: z.boolean().optional(),
  password: z.string().min(8).optional(),
});

router.put("/users/:id", requireSuperadmin, async (req, res): Promise<void> => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
      res.status(400).json({ error: "Invalid user ID." });
      return;
    }

    const existing = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (existing.length === 0) {
      res.status(404).json({ error: "User not found." });
      return;
    }

    if (existing[0].role === "superadmin") {
      res.status(403).json({ error: "Cannot modify the superadmin account." });
      return;
    }

    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message || "Invalid input.";
      res.status(400).json({ error: firstError });
      return;
    }

    const { password, ...fields } = parsed.data;
    const updateSet: Partial<{
      email: string;
      username: string;
      role: "admin" | "user";
      active: boolean;
      passwordHash: string;
      updatedAt: Date;
    }> = { ...fields, updatedAt: new Date() };

    if (password) {
      updateSet.passwordHash = await bcrypt.hash(password, 12);
    }

    const [updated] = await db
      .update(usersTable)
      .set(updateSet)
      .where(eq(usersTable.id, userId))
      .returning({
        id: usersTable.id,
        email: usersTable.email,
        username: usersTable.username,
        role: usersTable.role,
        active: usersTable.active,
        createdAt: usersTable.createdAt,
        updatedAt: usersTable.updatedAt,
      });

    res.json(updated);
  } catch (err) {
    const pgErr = err as { code?: string };
    if (pgErr.code === "23505") {
      res.status(409).json({ error: "A user with this email or username already exists." });
      return;
    }
    console.error("[users] PUT /users/:id failed:", err instanceof Error ? err.message : err);
    res.status(500).json({ error: "Failed to update user." });
  }
});

router.delete("/users/:id", requireSuperadmin, async (req, res): Promise<void> => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
      res.status(400).json({ error: "Invalid user ID." });
      return;
    }

    const existing = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (existing.length === 0) {
      res.status(404).json({ error: "User not found." });
      return;
    }

    if (existing[0].role === "superadmin") {
      res.status(403).json({ error: "Cannot delete the superadmin account." });
      return;
    }

    await db.delete(usersTable).where(eq(usersTable.id, userId));
    res.json({ success: true, message: "User deleted." });
  } catch (err) {
    console.error("[users] DELETE /users/:id failed:", err instanceof Error ? err.message : err);
    res.status(500).json({ error: "Failed to delete user." });
  }
});

export default router;

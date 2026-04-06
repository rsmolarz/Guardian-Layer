import { Router, type IRouter } from "express";
import { z } from "zod";
import { signToken } from "../middleware/auth";
import { verifyFirebaseToken, isFirebaseConfigured } from "../lib/firebase-admin";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const router: IRouter = Router();

const firebaseLoginSchema = z.object({
  idToken: z.string().min(1, "Firebase ID token is required"),
});

router.post("/auth/firebase", async (req, res): Promise<void> => {
  try {
    if (!isFirebaseConfigured()) {
      res.status(503).json({ error: "Firebase authentication is not configured on this server." });
      return;
    }

    const parsed = firebaseLoginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid input." });
      return;
    }

    const decoded = await verifyFirebaseToken(parsed.data.idToken);
    const { uid, email, name } = decoded;
    const provider = decoded.firebase?.sign_in_provider || "unknown";

    if (!email) {
      res.status(400).json({ error: "No email associated with this account. Please use an account with an email address." });
      return;
    }

    let user = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.firebaseUid, uid))
      .limit(1)
      .then((rows) => rows[0]);

    if (!user) {
      user = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, email))
        .limit(1)
        .then((rows) => rows[0]);

      if (user) {
        await db
          .update(usersTable)
          .set({ firebaseUid: uid, firebaseProvider: provider })
          .where(eq(usersTable.id, user.id));
      }
    }

    if (!user) {
      const username = (name || email.split("@")[0])
        .toLowerCase()
        .replace(/[^a-z0-9_.-]/g, "")
        .slice(0, 30);

      let uniqueUsername = username;
      const existing = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.username, uniqueUsername))
        .limit(1);

      if (existing.length > 0) {
        uniqueUsername = `${username}_${crypto.randomBytes(3).toString("hex")}`;
      }

      const placeholderHash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);

      const [newUser] = await db
        .insert(usersTable)
        .values({
          email,
          username: uniqueUsername,
          passwordHash: placeholderHash,
          role: "user",
          active: true,
          firebaseUid: uid,
          firebaseProvider: provider,
        })
        .returning();

      user = newUser;
    }

    if (!user!.active) {
      res.status(401).json({ error: "Account is deactivated. Contact your administrator." });
      return;
    }

    const token = signToken({
      userId: String(user!.id),
      username: user!.username,
      role: user!.role,
    });

    res.json({
      token,
      user: {
        userId: String(user!.id),
        username: user!.username,
        email: user!.email,
        role: user!.role,
      },
    });
  } catch (err: any) {
    if (err.code === "auth/id-token-expired") {
      res.status(401).json({ error: "Firebase token expired. Please sign in again." });
      return;
    }
    if (err.code === "auth/argument-error" || err.code === "auth/id-token-revoked") {
      res.status(401).json({ error: "Invalid Firebase token. Please sign in again." });
      return;
    }
    console.error("[firebase-auth] POST /auth/firebase failed:", err.message || err);
    res.status(500).json({ error: "Authentication failed." });
  }
});

export default router;

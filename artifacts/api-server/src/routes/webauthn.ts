import { Router, type IRouter } from "express";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type {
  AuthenticatorTransportFuture,
} from "@simplewebauthn/types";
import { db, webauthnCredentialsTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { signToken } from "../middleware/auth";

const router: IRouter = Router();

function getRpId(req: any): string {
  const host = req.hostname || req.headers.host?.split(":")[0] || "localhost";
  return host;
}

function getOrigin(req: any): string {
  const proto = req.headers["x-forwarded-proto"] || req.protocol || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
  return `${proto}://${host}`;
}

const challenges = new Map<string, { challenge: string; userId: number; timestamp: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [key, val] of challenges) {
    if (now - val.timestamp > 5 * 60 * 1000) challenges.delete(key);
  }
}, 60000);

router.post("/auth/webauthn/register/options", async (req, res): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const userId = parseInt(req.user.userId);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const existingCreds = await db
      .select()
      .from(webauthnCredentialsTable)
      .where(eq(webauthnCredentialsTable.userId, userId));

    const rpID = getRpId(req);
    const rpName = "GuardianLayer Enterprise";

    const userIdBuffer = new TextEncoder().encode(String(user.id));

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: userIdBuffer,
      userName: user.username,
      userDisplayName: user.username,
      attestationType: "none",
      excludeCredentials: existingCreds.map((c) => ({
        id: c.credentialId,
        transports: c.transports ? (c.transports.split(",") as AuthenticatorTransportFuture[]) : undefined,
      })),
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
        authenticatorAttachment: "cross-platform",
      },
    });

    challenges.set(`reg_${userId}`, {
      challenge: options.challenge,
      userId,
      timestamp: Date.now(),
    });

    res.json(options);
  } catch (err: any) {
    console.error("[webauthn] register options failed:", err.message);
    res.status(500).json({ error: "Failed to generate registration options" });
  }
});

router.post("/auth/webauthn/register/verify", async (req, res): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const userId = parseInt(req.user.userId);
    const stored = challenges.get(`reg_${userId}`);
    if (!stored) {
      res.status(400).json({ error: "No registration challenge found. Please try again." });
      return;
    }

    const rpID = getRpId(req);
    const origin = getOrigin(req);

    const verification = await verifyRegistrationResponse({
      response: req.body.credential,
      expectedChallenge: stored.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });

    challenges.delete(`reg_${userId}`);

    if (!verification.verified || !verification.registrationInfo) {
      res.status(400).json({ error: "Verification failed" });
      return;
    }

    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

    const uint8ToBase64 = (arr: Uint8Array) => Buffer.from(arr).toString("base64url");

    const [saved] = await db
      .insert(webauthnCredentialsTable)
      .values({
        userId,
        credentialId: credential.id,
        publicKey: uint8ToBase64(credential.publicKey),
        counter: credential.counter,
        deviceType: credentialDeviceType,
        backedUp: credentialBackedUp,
        transports: credential.transports?.join(",") || null,
        label: req.body.label || "Security Key",
      })
      .returning();

    res.json({ success: true, credential: { id: saved.id, label: saved.label, createdAt: saved.createdAt } });
  } catch (err: any) {
    console.error("[webauthn] register verify failed:", err.message);
    res.status(500).json({ error: "Registration verification failed" });
  }
});

router.post("/auth/webauthn/login/options", async (req, res): Promise<void> => {
  try {
    const { username } = req.body;
    if (!username) {
      res.status(400).json({ error: "Username is required" });
      return;
    }

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.username, username));

    if (!user) {
      res.status(404).json({ error: "User not found", hasKeys: false });
      return;
    }

    const credentials = await db
      .select()
      .from(webauthnCredentialsTable)
      .where(eq(webauthnCredentialsTable.userId, user.id));

    if (credentials.length === 0) {
      res.json({ hasKeys: false });
      return;
    }

    const rpID = getRpId(req);

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: credentials.map((c) => ({
        id: c.credentialId,
        transports: c.transports ? (c.transports.split(",") as AuthenticatorTransportFuture[]) : undefined,
      })),
      userVerification: "preferred",
    });

    challenges.set(`auth_${user.id}`, {
      challenge: options.challenge,
      userId: user.id,
      timestamp: Date.now(),
    });

    res.json({ hasKeys: true, options });
  } catch (err: any) {
    console.error("[webauthn] login options failed:", err.message);
    res.status(500).json({ error: "Failed to generate authentication options" });
  }
});

router.post("/auth/webauthn/login/verify", async (req, res): Promise<void> => {
  try {
    const { username, credential } = req.body;
    if (!username || !credential) {
      res.status(400).json({ error: "Username and credential are required" });
      return;
    }

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.username, username));

    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    if (!user.active) {
      res.status(401).json({ error: "Account is deactivated" });
      return;
    }

    const stored = challenges.get(`auth_${user.id}`);
    if (!stored) {
      res.status(400).json({ error: "No authentication challenge found. Please try again." });
      return;
    }

    const [dbCred] = await db
      .select()
      .from(webauthnCredentialsTable)
      .where(
        and(
          eq(webauthnCredentialsTable.userId, user.id),
          eq(webauthnCredentialsTable.credentialId, credential.id)
        )
      );

    if (!dbCred) {
      res.status(401).json({ error: "Unknown security key" });
      return;
    }

    const rpID = getRpId(req);
    const origin = getOrigin(req);

    const base64ToUint8 = (str: string) => new Uint8Array(Buffer.from(str, "base64url"));

    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge: stored.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: dbCred.credentialId,
        publicKey: base64ToUint8(dbCred.publicKey),
        counter: dbCred.counter,
        transports: dbCred.transports ? (dbCred.transports.split(",") as AuthenticatorTransportFuture[]) : undefined,
      },
    });

    challenges.delete(`auth_${user.id}`);

    if (!verification.verified) {
      res.status(401).json({ error: "Verification failed" });
      return;
    }

    await db
      .update(webauthnCredentialsTable)
      .set({
        counter: verification.authenticationInfo.newCounter,
        lastUsed: new Date(),
      })
      .where(eq(webauthnCredentialsTable.id, dbCred.id));

    const token = signToken({
      userId: String(user.id),
      username: user.username,
      role: user.role,
    });

    res.json({
      token,
      user: { userId: String(user.id), username: user.username, email: user.email, role: user.role },
    });
  } catch (err: any) {
    console.error("[webauthn] login verify failed:", err.message);
    res.status(500).json({ error: "Authentication failed" });
  }
});

router.get("/auth/webauthn/credentials", async (req, res): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const userId = parseInt(req.user.userId);
    const credentials = await db
      .select({
        id: webauthnCredentialsTable.id,
        label: webauthnCredentialsTable.label,
        deviceType: webauthnCredentialsTable.deviceType,
        createdAt: webauthnCredentialsTable.createdAt,
        lastUsed: webauthnCredentialsTable.lastUsed,
      })
      .from(webauthnCredentialsTable)
      .where(eq(webauthnCredentialsTable.userId, userId));

    res.json({ credentials });
  } catch (err: any) {
    console.error("[webauthn] list credentials failed:", err.message);
    res.status(500).json({ error: "Failed to list credentials" });
  }
});

router.delete("/auth/webauthn/credentials/:id", async (req, res): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const userId = parseInt(req.user.userId);
    const credId = parseInt(req.params.id);

    await db
      .delete(webauthnCredentialsTable)
      .where(
        and(
          eq(webauthnCredentialsTable.id, credId),
          eq(webauthnCredentialsTable.userId, userId)
        )
      );

    res.json({ success: true });
  } catch (err: any) {
    console.error("[webauthn] delete credential failed:", err.message);
    res.status(500).json({ error: "Failed to remove credential" });
  }
});

export default router;

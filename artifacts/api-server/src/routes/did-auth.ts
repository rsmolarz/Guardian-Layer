import { Router, type IRouter } from "express";
import crypto from "crypto";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken } from "../middleware/auth";
import bcrypt from "bcryptjs";

const router: IRouter = Router();

const MEDINVEST_BASE = process.env.MEDINVEST_BASE_URL || "https://did-login.replit.app";
const MEDINVEST_CLIENT_ID = process.env.MEDINVEST_CLIENT_ID || process.env.DID_CLIENT_ID || "";
const MEDINVEST_CLIENT_SECRET = process.env.MEDINVEST_CLIENT_SECRET || process.env.DID_CLIENT_SECRET || "";
const MEDINVEST_REDIRECT_URI = process.env.MEDINVEST_REDIRECT_URI || "";
const SCOPES = "openid profile email did:read did:verify credentials:read credentials:verify";

const pendingStates = new Map<string, { createdAt: number; redirectAfter: string }>();
const pendingCodes = new Map<string, { token: string; createdAt: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [key, val] of pendingStates) {
    if (now - val.createdAt > 10 * 60 * 1000) pendingStates.delete(key);
  }
  for (const [key, val] of pendingCodes) {
    if (now - val.createdAt > 2 * 60 * 1000) pendingCodes.delete(key);
  }
}, 60000);

function getCanonicalBase(req: any): string {
  const configuredUrl = process.env.APP_URL || process.env.REPLIT_DEV_DOMAIN;
  if (configuredUrl) {
    const base = configuredUrl.startsWith("http") ? configuredUrl : `https://${configuredUrl}`;
    return base.replace(/\/$/, "");
  }
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
  return `${proto}://${host}`;
}

function getCallbackUrl(req: any): string {
  if (MEDINVEST_REDIRECT_URI) return MEDINVEST_REDIRECT_URI;
  const baseUrl = getCanonicalBase(req);
  return `${baseUrl}/api/auth/medinvest/callback`;
}

async function handleOAuthCallback(req: any, res: any) {
  const { code, state, error: oauthError } = req.query;
  const baseUrl = getCanonicalBase(req);

  if (oauthError) {
    console.error("[MedInvest] OAuth error:", oauthError);
    res.redirect(`${baseUrl}/?did_error=${encodeURIComponent(String(oauthError))}`);
    return;
  }

  if (!code || !state) {
    res.redirect(`${baseUrl}/?did_error=missing_code_or_state`);
    return;
  }

  const pending = pendingStates.get(state as string);
  if (!pending) {
    res.redirect(`${baseUrl}/?did_error=invalid_or_expired_state`);
    return;
  }
  pendingStates.delete(state as string);

  try {
    const callbackUrl = getCallbackUrl(req);
    const tokenRes = await fetch(`${MEDINVEST_BASE}/api/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: callbackUrl,
        client_id: MEDINVEST_CLIENT_ID,
        client_secret: MEDINVEST_CLIENT_SECRET,
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("[MedInvest] Token exchange failed:", tokenRes.status, errText);
      res.redirect(`${baseUrl}/?did_error=token_exchange_failed`);
      return;
    }

    const tokenData = await tokenRes.json() as any;
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      console.error("[MedInvest] No access_token in response:", tokenData);
      res.redirect(`${baseUrl}/?did_error=no_access_token`);
      return;
    }

    const userInfoRes = await fetch(`${MEDINVEST_BASE}/api/oauth/userinfo`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userInfoRes.ok) {
      console.error("[MedInvest] UserInfo failed:", userInfoRes.status);
      res.redirect(`${baseUrl}/?did_error=userinfo_failed`);
      return;
    }

    const userInfo = await userInfoRes.json() as any;
    console.log("[MedInvest] User info received:", JSON.stringify({ sub: userInfo.sub, email: userInfo.email, name: userInfo.name }));

    const didIdentifier = userInfo.sub || userInfo.did || userInfo.id;
    const email = userInfo.email || `${didIdentifier}@medinvest.local`;
    const displayName = userInfo.name || userInfo.display_name || userInfo.username || "MedInvest User";

    let user;
    const [existingByEmail] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);

    if (existingByEmail) {
      user = existingByEmail;
    } else {
      const username = displayName.toLowerCase().replace(/[^a-z0-9]/g, "_").substring(0, 30) || `mi_${Date.now()}`;
      const randomPass = crypto.randomBytes(32).toString("hex");
      const passwordHash = await bcrypt.hash(randomPass, 12);

      const [newUser] = await db.insert(usersTable).values({
        email,
        username,
        passwordHash,
        role: "user",
        active: true,
      }).returning();
      user = newUser;
      console.log(`[MedInvest] Created new user: ${username} (${email})`);
    }

    if (!user.active) {
      res.redirect(`${baseUrl}/?did_error=account_disabled`);
      return;
    }

    const jwtToken = signToken({
      userId: String(user.id),
      username: user.username,
      role: user.role,
    });

    const exchangeCode = crypto.randomBytes(32).toString("hex");
    pendingCodes.set(exchangeCode, { token: jwtToken, createdAt: Date.now() });

    const redirectPath = pending.redirectAfter || "/";
    res.redirect(`${baseUrl}${redirectPath}?did_code=${exchangeCode}`);
  } catch (err: any) {
    console.error("[MedInvest] Callback error:", err.message);
    res.redirect(`${baseUrl}/?did_error=internal_error`);
  }
}

router.get("/auth/medinvest/initiate", (req, res) => {
  if (!MEDINVEST_CLIENT_ID) {
    res.status(500).json({ error: "MedInvest login not configured (missing MEDINVEST_CLIENT_ID)" });
    return;
  }

  const state = crypto.randomBytes(32).toString("hex");
  const redirectAfter = (req.query.redirect as string) || "/";
  const safePath = redirectAfter.startsWith("/") && !redirectAfter.startsWith("//") ? redirectAfter : "/";
  pendingStates.set(state, { createdAt: Date.now(), redirectAfter: safePath });

  const callbackUrl = getCallbackUrl(req);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: MEDINVEST_CLIENT_ID,
    redirect_uri: callbackUrl,
    scope: SCOPES,
    state,
  });

  const authUrl = `${MEDINVEST_BASE}/api/oauth/authorize?${params.toString()}`;
  res.redirect(authUrl);
});

router.get("/auth/medinvest/callback", async (req, res) => {
  await handleOAuthCallback(req, res);
});

router.get("/auth/did/initiate", (req, res) => {
  res.redirect(307, `/api/auth/medinvest/initiate${req.url.includes("?") ? "?" + req.url.split("?")[1] : ""}`);
});

router.get("/auth/did/callback", async (req, res) => {
  await handleOAuthCallback(req, res);
});

router.post("/auth/did/exchange", (req, res) => {
  const { code } = req.body;
  if (!code || typeof code !== "string") {
    res.status(400).json({ error: "Missing exchange code" });
    return;
  }

  const pending = pendingCodes.get(code);
  if (!pending) {
    res.status(400).json({ error: "Invalid or expired code" });
    return;
  }
  pendingCodes.delete(code);

  res.json({ token: pending.token });
});

export default router;

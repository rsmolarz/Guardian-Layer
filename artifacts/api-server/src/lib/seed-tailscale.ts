import crypto from "crypto";
import { db, remoteMachinesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TS_API_BASE = "https://api.tailscale.com/api/v2";

function getEncryptionKey(): Buffer {
  const raw = process.env.DATABASE_URL || "gl-remote-fallback-key";
  return crypto.createHash("sha256").update(raw).digest();
}

function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag();
  return iv.toString("hex") + ":" + tag.toString("hex") + ":" + encrypted;
}

function mapTailscaleOs(os: string): string {
  if (!os) return "unknown";
  const lower = os.toLowerCase();
  if (lower === "macos") return "darwin";
  if (lower === "windows") return "windows";
  if (lower === "linux") return "linux";
  if (lower === "ios" || lower === "android") return lower;
  return lower;
}

export async function syncTailscaleDevices() {
  const key = process.env.TAILSCALE_API_KEY;
  if (!key) {
    console.log("[tailscale-sync] TAILSCALE_API_KEY not set, skipping auto-sync");
    return;
  }

  try {
    const res = await fetch(`${TS_API_BASE}/tailnet/-/devices`, {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.error(`[tailscale-sync] API returned ${res.status}`);
      return;
    }

    const data = await res.json();
    const devices = data.devices || [];

    const existingMachines = await db
      .select({ hostname: remoteMachinesTable.hostname })
      .from(remoteMachinesTable);
    const registeredIps = new Set(existingMachines.map((m) => m.hostname));

    let imported = 0;
    let skipped = 0;

    for (const d of devices) {
      const tailscaleIp = d.addresses?.[0];
      if (!tailscaleIp || !d.hostname) {
        skipped++;
        continue;
      }

      if (registeredIps.has(tailscaleIp)) {
        skipped++;
        continue;
      }

      await db.insert(remoteMachinesTable).values({
        name: d.hostname,
        hostname: tailscaleIp,
        port: 22,
        username: "root",
        authMethod: "password",
        encryptedCredential: encrypt(""),
        os: mapTailscaleOs(d.os),
        active: true,
        tags: ["tailscale", "auto-imported"],
      });

      registeredIps.add(tailscaleIp);
      imported++;
    }

    console.log(`[tailscale-sync] Synced ${devices.length} devices: ${imported} imported, ${skipped} already registered`);
  } catch (err: any) {
    console.error("[tailscale-sync] Auto-sync failed:", err.message);
  }
}

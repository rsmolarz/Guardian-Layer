import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { secureVaultTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { logActivity } from "../lib/activity-logger";
import crypto from "crypto";

const router: IRouter = Router();

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const raw = process.env.DATABASE_URL || "gl-vault-fallback-key-do-not-use";
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

function decrypt(ciphertext: string): string {
  const key = getEncryptionKey();
  const parts = ciphertext.split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted data format");
  const iv = Buffer.from(parts[0], "hex");
  const tag = Buffer.from(parts[1], "hex");
  const encrypted = parts[2];
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

router.get("/secure-vault/entries", async (_req, res): Promise<void> => {
  try {
    const entries = await db.select({
      id: secureVaultTable.id,
      entryType: secureVaultTable.entryType,
      label: secureVaultTable.label,
      issuer: secureVaultTable.issuer,
      lastFour: secureVaultTable.lastFour,
      websiteUrl: secureVaultTable.websiteUrl,
      phoneNumber: secureVaultTable.phoneNumber,
      breachInstructions: secureVaultTable.breachInstructions,
      notes: secureVaultTable.notes,
      createdAt: secureVaultTable.createdAt,
      updatedAt: secureVaultTable.updatedAt,
    }).from(secureVaultTable).orderBy(desc(secureVaultTable.updatedAt));

    res.json(entries);
  } catch (err: any) {
    console.error("[secure-vault] GET /entries failed:", err.message);
    res.status(500).json({ error: "Failed to fetch vault entries" });
  }
});

router.get("/secure-vault/entries/:id/reveal", async (req, res): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const [entry] = await db.select().from(secureVaultTable).where(eq(secureVaultTable.id, id));
    if (!entry) {
      res.status(404).json({ error: "Entry not found" });
      return;
    }

    let sensitiveData: any = {};
    try {
      sensitiveData = JSON.parse(decrypt(entry.encryptedData));
    } catch {
      res.status(500).json({ error: "Failed to decrypt entry data" });
      return;
    }

    await logActivity({
      action: "VAULT_REVEAL",
      category: "security",
      source: "secure_vault",
      detail: `Revealed sensitive data for vault entry: ${entry.label}`,
      severity: "warning",
    });

    res.json({ id: entry.id, sensitiveData });
  } catch (err: any) {
    console.error("[secure-vault] GET /entries/:id/reveal failed:", err.message);
    res.status(500).json({ error: "Failed to reveal entry" });
  }
});

router.post("/secure-vault/entries", async (req, res): Promise<void> => {
  try {
    const { entryType, label, issuer, lastFour, sensitiveData, websiteUrl, phoneNumber, breachInstructions, notes } = req.body;

    if (!label || typeof label !== "string") {
      res.status(400).json({ error: "Label is required" });
      return;
    }
    if (!sensitiveData || typeof sensitiveData !== "object") {
      res.status(400).json({ error: "Sensitive data is required" });
      return;
    }

    const encryptedData = encrypt(JSON.stringify(sensitiveData));

    const [created] = await db.insert(secureVaultTable).values({
      entryType: entryType || "card",
      label,
      issuer: issuer || null,
      lastFour: lastFour || null,
      encryptedData,
      websiteUrl: websiteUrl || null,
      phoneNumber: phoneNumber || null,
      breachInstructions: breachInstructions || null,
      notes: notes || null,
    }).returning();

    await logActivity({
      action: "VAULT_ENTRY_CREATED",
      category: "security",
      source: "secure_vault",
      detail: `Created vault entry: ${label} (${entryType || "card"})`,
    });

    res.json({ id: created.id, label: created.label, entryType: created.entryType });
  } catch (err: any) {
    console.error("[secure-vault] POST /entries failed:", err.message);
    res.status(500).json({ error: "Failed to create vault entry" });
  }
});

router.put("/secure-vault/entries/:id", async (req, res): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const { label, issuer, lastFour, sensitiveData, websiteUrl, phoneNumber, breachInstructions, notes } = req.body;

    const updates: any = { updatedAt: new Date() };
    if (label !== undefined) updates.label = label;
    if (issuer !== undefined) updates.issuer = issuer;
    if (lastFour !== undefined) updates.lastFour = lastFour;
    if (websiteUrl !== undefined) updates.websiteUrl = websiteUrl;
    if (phoneNumber !== undefined) updates.phoneNumber = phoneNumber;
    if (breachInstructions !== undefined) updates.breachInstructions = breachInstructions;
    if (notes !== undefined) updates.notes = notes;
    if (sensitiveData !== undefined) {
      updates.encryptedData = encrypt(JSON.stringify(sensitiveData));
    }

    await db.update(secureVaultTable).set(updates).where(eq(secureVaultTable.id, id));

    await logActivity({
      action: "VAULT_ENTRY_UPDATED",
      category: "security",
      source: "secure_vault",
      detail: `Updated vault entry ID: ${id}`,
    });

    res.json({ success: true });
  } catch (err: any) {
    console.error("[secure-vault] PUT /entries/:id failed:", err.message);
    res.status(500).json({ error: "Failed to update vault entry" });
  }
});

router.delete("/secure-vault/entries/:id", async (req, res): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const [entry] = await db.select({ label: secureVaultTable.label }).from(secureVaultTable).where(eq(secureVaultTable.id, id));

    await db.delete(secureVaultTable).where(eq(secureVaultTable.id, id));

    await logActivity({
      action: "VAULT_ENTRY_DELETED",
      category: "security",
      source: "secure_vault",
      detail: `Deleted vault entry: ${entry?.label || id}`,
      severity: "warning",
    });

    res.json({ success: true });
  } catch (err: any) {
    console.error("[secure-vault] DELETE /entries/:id failed:", err.message);
    res.status(500).json({ error: "Failed to delete vault entry" });
  }
});

export default router;

import { Router, type IRouter } from "express";
import { eq, desc, sql, and, lt } from "drizzle-orm";
import { db, backupsTable, backupSettingsTable } from "@workspace/db";
import {
  ListBackupsQueryParams,
  ListBackupsResponse,
  TriggerBackupResponse,
  GetBackupSummaryResponse,
  GetBackupSettingsResponse,
  UpdateBackupSettingsBody,
  UpdateBackupSettingsResponse,
  VerifyBackupParams,
  VerifyBackupResponse,
  RestoreBackupParams,
  RestoreBackupResponse,
  DownloadBackupParams,
} from "@workspace/api-zod";
import { createHash } from "crypto";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import { getDriveClient, checkGoogleConnection } from "../lib/google-clients";
import type { Request, Response, NextFunction } from "express";
import { randomBytes } from "crypto";

const execAsync = promisify(exec);
const router: IRouter = Router();

const BACKUP_ADMIN_KEY = process.env.BACKUP_ADMIN_KEY || randomBytes(32).toString("hex");

if (!process.env.BACKUP_ADMIN_KEY) {
  console.warn("[BACKUP] No BACKUP_ADMIN_KEY env var set. An ephemeral key has been generated for this session.");
  console.warn("[BACKUP] Set BACKUP_ADMIN_KEY environment variable for persistent, secure auth.");
}

function requireBackupAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authorization required. Provide Bearer token via Authorization header." });
    return;
  }
  const token = authHeader.slice(7);
  if (token !== BACKUP_ADMIN_KEY) {
    res.status(403).json({ error: "Invalid backup admin key." });
    return;
  }
  next();
}
const WORKSPACE_DIR = process.env.WORKSPACE_DIR || path.resolve(process.cwd(), "..", "..");
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(WORKSPACE_DIR, "backups");

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function computeSHA256(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  return createHash("sha256").update(fileBuffer).digest("hex");
}

async function performBackup(backupId: number, backupType: string) {
  const timestamp = new Date();
  const dateFolder = formatDate(timestamp);
  const backupName = `backup-${dateFolder}-${timestamp.getTime()}`;
  const backupPath = path.join(BACKUP_DIR, dateFolder);

  try {
    await db
      .update(backupsTable)
      .set({ status: "in_progress", updatedAt: new Date() })
      .where(eq(backupsTable.id, backupId));

    ensureBackupDir();
    if (!fs.existsSync(backupPath)) {
      fs.mkdirSync(backupPath, { recursive: true });
    }

    const tempDir = path.join(backupPath, `${backupName}-temp`);
    fs.mkdirSync(tempDir, { recursive: true });

    let dbDumpSuccess = false;
    try {
      if (process.env.DATABASE_URL) {
        await execAsync(`pg_dump "${process.env.DATABASE_URL}" > "${path.join(tempDir, "database.sql")}"`, {
          timeout: 60000,
        });
        dbDumpSuccess = true;
      }
    } catch {
      fs.writeFileSync(
        path.join(tempDir, "database_dump_error.txt"),
        "Database dump failed or pg_dump not available. Database URL present: " + !!process.env.DATABASE_URL
      );
    }

    const packageFiles = ["package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml"];
    const pkgDir = path.join(tempDir, "packages");
    fs.mkdirSync(pkgDir, { recursive: true });

    for (const file of packageFiles) {
      const src = path.join(WORKSPACE_DIR, file);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, path.join(pkgDir, file));
      }
    }

    const subPkgDirs = ["artifacts/api-server", "artifacts/guardianlayer", "lib/db", "lib/api-spec", "lib/api-zod", "lib/api-client-react"];
    for (const dir of subPkgDirs) {
      const pkgJson = path.join(WORKSPACE_DIR, dir, "package.json");
      if (fs.existsSync(pkgJson)) {
        const destDir = path.join(pkgDir, dir);
        fs.mkdirSync(destDir, { recursive: true });
        fs.copyFileSync(pkgJson, path.join(destDir, "package.json"));
      }
    }

    let sourceSuccess = false;
    try {
      const srcDirs = ["artifacts", "lib"];
      for (const dir of srcDirs) {
        const srcPath = path.join(WORKSPACE_DIR, dir);
        if (fs.existsSync(srcPath)) {
          await execAsync(
            `tar --exclude='node_modules' --exclude='.cache' --exclude='dist' --exclude='.next' -czf "${path.join(tempDir, `${dir}.tar.gz`)}" -C "${WORKSPACE_DIR}" "${dir}"`,
            { timeout: 120000 }
          );
        }
      }
      sourceSuccess = true;
    } catch {
      fs.writeFileSync(
        path.join(tempDir, "source_archive_error.txt"),
        "Source code archiving encountered errors."
      );
    }

    const archivePath = path.join(backupPath, `${backupName}.tar.gz`);
    await execAsync(`tar -czf "${archivePath}" -C "${path.dirname(tempDir)}" "${path.basename(tempDir)}"`, {
      timeout: 120000,
    });

    fs.rmSync(tempDir, { recursive: true, force: true });

    const stats = fs.statSync(archivePath);
    const checksum = computeSHA256(archivePath);

    const verifyChecksum = computeSHA256(archivePath);
    if (checksum !== verifyChecksum) {
      throw new Error("Post-create integrity check failed: SHA-256 mismatch on re-read");
    }

    let driveFileId: string | null = null;
    let driveFolderId: string | null = null;
    let driveUploadSuccess = false;
    let driveVerified = false;

    try {
      const driveConnection = await checkGoogleConnection("google-drive");
      if (driveConnection.connected) {
        const drive = await getDriveClient();

        let rootFolderId: string | null = null;
        const rootSearch = await drive.files.list({
          q: "name='GuardianLayer-Backups' and mimeType='application/vnd.google-apps.folder' and trashed=false",
          fields: "files(id)",
        });

        if (rootSearch.data.files && rootSearch.data.files.length > 0) {
          rootFolderId = rootSearch.data.files[0].id!;
        } else {
          const rootFolder = await drive.files.create({
            requestBody: {
              name: "GuardianLayer-Backups",
              mimeType: "application/vnd.google-apps.folder",
            },
            fields: "id",
          });
          rootFolderId = rootFolder.data.id!;
        }

        let dateFolderId: string | null = null;
        const dateSearch = await drive.files.list({
          q: `name='${dateFolder}' and '${rootFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
          fields: "files(id)",
        });

        if (dateSearch.data.files && dateSearch.data.files.length > 0) {
          dateFolderId = dateSearch.data.files[0].id!;
        } else {
          const dateCreated = await drive.files.create({
            requestBody: {
              name: dateFolder,
              mimeType: "application/vnd.google-apps.folder",
              parents: [rootFolderId],
            },
            fields: "id",
          });
          dateFolderId = dateCreated.data.id!;
        }

        driveFolderId = dateFolderId;

        const fileStream = fs.createReadStream(archivePath);
        const uploaded = await drive.files.create({
          requestBody: {
            name: `${backupName}.tar.gz`,
            parents: [dateFolderId],
            description: `GuardianLayer backup - ${backupType} - ${timestamp.toISOString()} - checksum:${checksum}`,
          },
          media: {
            mimeType: "application/gzip",
            body: fileStream,
          },
          fields: "id,size,md5Checksum",
        });

        driveFileId = uploaded.data.id!;
        driveUploadSuccess = true;

        const driveDownload = await drive.files.get(
          { fileId: driveFileId, alt: "media" },
          { responseType: "arraybuffer" }
        );
        const driveBuffer = Buffer.from(driveDownload.data as ArrayBuffer);
        const driveSha256 = createHash("sha256").update(driveBuffer).digest("hex");

        if (driveSha256 === checksum && driveBuffer.length === stats.size) {
          driveVerified = true;
        }
      }
    } catch (driveErr: any) {
      console.error("Google Drive upload failed:", driveErr.message);
    }

    const errors: string[] = [];
    if (!dbDumpSuccess) errors.push("Database dump failed");
    if (!sourceSuccess) errors.push("Source code archiving failed");
    if (!driveUploadSuccess) errors.push("Google Drive upload failed — backup stored locally only (dual-redundancy not achieved)");
    if (driveUploadSuccess && !driveVerified) errors.push("Google Drive SHA-256 verification failed after upload");

    const allCriticalPassed = dbDumpSuccess && sourceSuccess;
    const localChecksumOk = allCriticalPassed && !!checksum;
    const dualRedundancy = allCriticalPassed && driveUploadSuccess && driveVerified;
    const finalStatus: "completed" | "partial" | "failed" = dualRedundancy
      ? "completed"
      : allCriticalPassed
        ? "partial"
        : "failed";

    await db
      .update(backupsTable)
      .set({
        status: finalStatus,
        sizeBytes: stats.size,
        checksum,
        checksumVerified: localChecksumOk && (dualRedundancy || !driveUploadSuccess),
        localPath: archivePath,
        driveFileId,
        driveFolderId,
        includesDatabase: dbDumpSuccess,
        includesSourceCode: sourceSuccess,
        includesPackages: true,
        errorMessage: errors.length > 0 ? errors.join("; ") : null,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(backupsTable.id, backupId));
  } catch (err: any) {
    await db
      .update(backupsTable)
      .set({
        status: "failed",
        errorMessage: err.message || "Unknown error",
        updatedAt: new Date(),
      })
      .where(eq(backupsTable.id, backupId));
  }
}

async function deleteDriveFile(fileId: string): Promise<void> {
  try {
    const driveConnection = await checkGoogleConnection("google-drive");
    if (driveConnection.connected) {
      const drive = await getDriveClient();
      await drive.files.delete({ fileId });
    }
  } catch (err: any) {
    console.error(`Failed to delete Drive file ${fileId}:`, err.message);
  }
}

router.get("/backups", async (req, res): Promise<void> => {
  const params = ListBackupsQueryParams.safeParse(req.query);
  const limit = params.success ? params.data.limit : 50;
  const offset = params.success ? params.data.offset : 0;

  const backups = await db
    .select()
    .from(backupsTable)
    .orderBy(desc(backupsTable.createdAt))
    .limit(limit)
    .offset(offset);

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(backupsTable);

  const mappedBackups = backups.map((b) => ({
    ...b,
    storedLocally: !!b.localPath,
    localPath: undefined,
  }));

  res.json(
    ListBackupsResponse.parse({
      backups: mappedBackups,
      total: countResult?.count ?? 0,
    })
  );
});

router.post("/backups/trigger", requireBackupAuth, async (_req, res): Promise<void> => {
  const timestamp = new Date();
  const backupName = `manual-backup-${formatDate(timestamp)}-${timestamp.getTime()}`;

  const [backup] = await db
    .insert(backupsTable)
    .values({
      name: backupName,
      status: "pending",
      type: "manual",
    })
    .returning();

  performBackup(backup.id, "manual");

  res.json(
    TriggerBackupResponse.parse({
      success: true,
      backupId: backup.id,
      message: "Backup started. It will run in the background.",
    })
  );
});

router.get("/backups/summary", async (_req, res): Promise<void> => {
  const [totalResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(backupsTable);

  const [successResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(backupsTable)
    .where(eq(backupsTable.status, "completed"));

  const [failedResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(backupsTable)
    .where(eq(backupsTable.status, "failed"));

  const [sizeResult] = await db
    .select({ total: sql<number>`coalesce(sum(size_bytes), 0)::int` })
    .from(backupsTable)
    .where(eq(backupsTable.status, "completed"));

  const [lastBackup] = await db
    .select({ completedAt: backupsTable.completedAt })
    .from(backupsTable)
    .where(eq(backupsTable.status, "completed"))
    .orderBy(desc(backupsTable.completedAt))
    .limit(1);

  const driveStatus = await checkGoogleConnection("google-drive");

  const localBackups = await db
    .select({ size: backupsTable.sizeBytes })
    .from(backupsTable)
    .where(
      and(
        eq(backupsTable.status, "completed"),
        sql`${backupsTable.localPath} is not null`
      )
    );

  const driveBackups = await db
    .select({ size: backupsTable.sizeBytes })
    .from(backupsTable)
    .where(
      and(
        eq(backupsTable.status, "completed"),
        sql`${backupsTable.driveFileId} is not null`
      )
    );

  res.json(
    GetBackupSummaryResponse.parse({
      totalBackups: totalResult?.count ?? 0,
      successfulBackups: successResult?.count ?? 0,
      failedBackups: failedResult?.count ?? 0,
      totalSizeBytes: sizeResult?.total ?? 0,
      lastBackupAt: lastBackup?.completedAt ?? null,
      driveConnected: driveStatus.connected,
      localStorageUsedBytes: localBackups.reduce((acc, b) => acc + (b.size ?? 0), 0),
      driveStorageUsedBytes: driveBackups.reduce((acc, b) => acc + (b.size ?? 0), 0),
    })
  );
});

router.get("/backups/settings", async (_req, res): Promise<void> => {
  const settings = await ensureDefaultSettings();

  res.json(
    GetBackupSettingsResponse.parse({
      intervalHours: settings.intervalHours,
      retentionDays: settings.retentionDays,
      maxBackups: settings.maxBackups,
      autoBackupEnabled: settings.autoBackupEnabled,
      lastAutoBackupAt: settings.lastAutoBackupAt,
    })
  );
});

router.patch("/backups/settings", requireBackupAuth, async (req, res): Promise<void> => {
  const body = UpdateBackupSettingsBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const existing = await ensureDefaultSettings();

  const [updated] = await db
    .update(backupSettingsTable)
    .set({
      updatedAt: new Date(),
      ...(body.data.intervalHours !== undefined ? { intervalHours: body.data.intervalHours } : {}),
      ...(body.data.retentionDays !== undefined ? { retentionDays: body.data.retentionDays } : {}),
      ...(body.data.maxBackups !== undefined ? { maxBackups: body.data.maxBackups } : {}),
      ...(body.data.autoBackupEnabled !== undefined ? { autoBackupEnabled: body.data.autoBackupEnabled } : {}),
    })
    .where(eq(backupSettingsTable.id, existing.id))
    .returning();

  res.json(
    UpdateBackupSettingsResponse.parse({
      intervalHours: updated.intervalHours,
      retentionDays: updated.retentionDays,
      maxBackups: updated.maxBackups,
      autoBackupEnabled: updated.autoBackupEnabled,
      lastAutoBackupAt: updated.lastAutoBackupAt,
    })
  );
});

router.post("/backups/:id/verify", requireBackupAuth, async (req, res): Promise<void> => {
  const params = VerifyBackupParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [backup] = await db
    .select()
    .from(backupsTable)
    .where(eq(backupsTable.id, params.data.id));

  if (!backup) {
    res.status(404).json({ error: "Backup not found" });
    return;
  }

  if (!backup.localPath || !fs.existsSync(backup.localPath)) {
    res.json(
      VerifyBackupResponse.parse({
        verified: false,
        checksum: backup.checksum || "none",
        message: "Local backup file not found",
      })
    );
    return;
  }

  const currentChecksum = computeSHA256(backup.localPath);
  const verified = currentChecksum === backup.checksum;

  await db
    .update(backupsTable)
    .set({ checksumVerified: verified, updatedAt: new Date() })
    .where(eq(backupsTable.id, backup.id));

  res.json(
    VerifyBackupResponse.parse({
      verified,
      checksum: currentChecksum,
      message: verified
        ? "Backup integrity verified — checksum matches"
        : "Checksum mismatch — backup may be corrupted",
    })
  );
});

router.post("/backups/:id/restore", requireBackupAuth, async (req, res): Promise<void> => {
  const params = RestoreBackupParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const confirmHeader = req.headers["x-confirm-restore"];
  if (confirmHeader !== "true") {
    res.status(400).json({ error: "Restore requires confirmation. Set X-Confirm-Restore: true header." });
    return;
  }

  const [backup] = await db
    .select()
    .from(backupsTable)
    .where(eq(backupsTable.id, params.data.id));

  if (!backup) {
    res.status(404).json({ error: "Backup not found" });
    return;
  }

  if (backup.status !== "completed" && backup.status !== "partial") {
    res.json(
      RestoreBackupResponse.parse({
        success: false,
        message: "Cannot restore from a backup that is not completed or partial",
        restoredComponents: [],
        restorePath: "",
      })
    );
    return;
  }

  console.warn(`[BACKUP RESTORE] Restore initiated for backup #${backup.id} (${backup.name}) at ${new Date().toISOString()}`);

  if (!backup.localPath || !fs.existsSync(backup.localPath)) {
    res.json(
      RestoreBackupResponse.parse({
        success: false,
        message: "Backup archive file not found on disk",
        restoredComponents: [],
        restorePath: "",
      })
    );
    return;
  }

  const restoreDir = path.join(BACKUP_DIR, "restore", `restore-${Date.now()}`);

  try {
    fs.mkdirSync(restoreDir, { recursive: true });

    await execAsync(
      `tar -xzf "${backup.localPath}" -C "${restoreDir}"`,
      { timeout: 120000 }
    );

    const restoredComponents: string[] = [];
    const innerDirs = fs.readdirSync(restoreDir);
    const contentDir = innerDirs.length === 1
      ? path.join(restoreDir, innerDirs[0])
      : restoreDir;

    if (fs.existsSync(path.join(contentDir, "database.sql"))) {
      restoredComponents.push("database_dump");
      const applyDb = req.headers["x-restore-database"] === "true";
      if (applyDb && process.env.DATABASE_URL) {
        try {
          await execAsync(
            `psql "${process.env.DATABASE_URL}" < "${path.join(contentDir, "database.sql")}"`,
            { timeout: 120000 }
          );
          restoredComponents.push("database_restored");
        } catch (dbErr: any) {
          restoredComponents.push(`database_restore_error: ${dbErr.message}`);
        }
      } else if (!applyDb) {
        restoredComponents.push("database_available_not_applied");
      }
    }

    if (fs.existsSync(path.join(contentDir, "artifacts.tar.gz"))) {
      restoredComponents.push("source_code_archive");
    }
    if (fs.existsSync(path.join(contentDir, "lib.tar.gz"))) {
      restoredComponents.push("lib_archive");
    }
    if (fs.existsSync(path.join(contentDir, "packages"))) {
      restoredComponents.push("package_manifests");
    }

    res.json(
      RestoreBackupResponse.parse({
        success: true,
        message: `Backup extracted successfully. ${restoredComponents.length} components available for restore at: ${restoreDir}`,
        restoredComponents,
        restorePath: restoreDir,
      })
    );
  } catch (err: any) {
    res.json(
      RestoreBackupResponse.parse({
        success: false,
        message: `Restore failed: ${err.message}`,
        restoredComponents: [],
        restorePath: restoreDir,
      })
    );
  }
});

router.get("/backups/:id/download", requireBackupAuth, async (req, res): Promise<void> => {
  const params = DownloadBackupParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [backup] = await db
    .select()
    .from(backupsTable)
    .where(eq(backupsTable.id, params.data.id));

  if (!backup) {
    res.status(404).json({ error: "Backup not found" });
    return;
  }

  if (!backup.localPath || !fs.existsSync(backup.localPath)) {
    res.status(404).json({ error: "Backup file not found on disk" });
    return;
  }

  res.setHeader("Content-Type", "application/gzip");
  res.setHeader("Content-Disposition", `attachment; filename="${path.basename(backup.localPath)}"`);
  const stream = fs.createReadStream(backup.localPath);
  stream.pipe(res);
});

let scheduledBackupTimer: ReturnType<typeof setInterval> | null = null;

async function ensureDefaultSettings() {
  let [settings] = await db.select().from(backupSettingsTable).limit(1);
  if (!settings) {
    [settings] = await db
      .insert(backupSettingsTable)
      .values({
        intervalHours: 6,
        retentionDays: 30,
        maxBackups: 50,
        autoBackupEnabled: true,
      })
      .returning();
  }
  return settings;
}

async function runScheduledBackup() {
  try {
    const settings = await ensureDefaultSettings();
    if (!settings.autoBackupEnabled) return;

    if (settings.lastAutoBackupAt) {
      const hoursSinceLastBackup =
        (Date.now() - settings.lastAutoBackupAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastBackup < settings.intervalHours) return;
    }

    const timestamp = new Date();
    const backupName = `scheduled-backup-${formatDate(timestamp)}-${timestamp.getTime()}`;

    const [backup] = await db
      .insert(backupsTable)
      .values({
        name: backupName,
        status: "pending",
        type: "scheduled",
      })
      .returning();

    await db
      .update(backupSettingsTable)
      .set({ lastAutoBackupAt: timestamp, updatedAt: timestamp })
      .where(eq(backupSettingsTable.id, settings.id));

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(backupsTable)
      .where(eq(backupsTable.status, "completed"));

    if (countResult && countResult.count > settings.maxBackups) {
      const oldBackups = await db
        .select()
        .from(backupsTable)
        .where(eq(backupsTable.status, "completed"))
        .orderBy(backupsTable.createdAt)
        .limit(countResult.count - settings.maxBackups);

      for (const old of oldBackups) {
        if (old.localPath && fs.existsSync(old.localPath)) {
          fs.unlinkSync(old.localPath);
        }
        if (old.driveFileId) {
          await deleteDriveFile(old.driveFileId);
        }
        await db.delete(backupsTable).where(eq(backupsTable.id, old.id));
      }
    }

    if (settings.retentionDays > 0) {
      const cutoffDate = new Date(Date.now() - settings.retentionDays * 24 * 60 * 60 * 1000);
      const expiredBackups = await db
        .select()
        .from(backupsTable)
        .where(
          and(
            eq(backupsTable.status, "completed"),
            lt(backupsTable.createdAt, cutoffDate)
          )
        );

      for (const old of expiredBackups) {
        if (old.localPath && fs.existsSync(old.localPath)) {
          fs.unlinkSync(old.localPath);
        }
        if (old.driveFileId) {
          await deleteDriveFile(old.driveFileId);
        }
        await db.delete(backupsTable).where(eq(backupsTable.id, old.id));
      }
    }

    await performBackup(backup.id, "scheduled");

    console.log(`[Backup Scheduler] Scheduled backup ${backupName} started`);
  } catch (err: any) {
    console.error("[Backup Scheduler] Error:", err.message);
  }
}

export function startBackupScheduler() {
  if (scheduledBackupTimer) return;
  scheduledBackupTimer = setInterval(runScheduledBackup, 5 * 60 * 1000);
  console.log("[Backup Scheduler] Started — checking every 5 minutes");
  setTimeout(runScheduledBackup, 10000);
}

export function stopBackupScheduler() {
  if (scheduledBackupTimer) {
    clearInterval(scheduledBackupTimer);
    scheduledBackupTimer = null;
  }
}

export default router;

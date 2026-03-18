import { pgTable, serial, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const backupsTable = pgTable("backups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  status: text("status").notNull().default("pending"),
  type: text("type").notNull().default("manual"),
  sizeBytes: integer("size_bytes"),
  checksum: text("checksum"),
  checksumVerified: boolean("checksum_verified").default(false),
  localPath: text("local_path"),
  driveFileId: text("drive_file_id"),
  driveFolderId: text("drive_folder_id"),
  includesDatabase: boolean("includes_database").default(true),
  includesSourceCode: boolean("includes_source_code").default(true),
  includesPackages: boolean("includes_packages").default(true),
  errorMessage: text("error_message"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const backupSettingsTable = pgTable("backup_settings", {
  id: serial("id").primaryKey(),
  intervalHours: integer("interval_hours").notNull().default(6),
  retentionDays: integer("retention_days").notNull().default(30),
  maxBackups: integer("max_backups").notNull().default(50),
  autoBackupEnabled: boolean("auto_backup_enabled").default(true),
  lastAutoBackupAt: timestamp("last_auto_backup_at"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertBackupSchema = createInsertSchema(backupsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBackup = z.infer<typeof insertBackupSchema>;
export type Backup = typeof backupsTable.$inferSelect;

export const insertBackupSettingsSchema = createInsertSchema(backupSettingsTable).omit({
  id: true,
  updatedAt: true,
});

export type InsertBackupSettings = z.infer<typeof insertBackupSettingsSchema>;
export type BackupSettings = typeof backupSettingsTable.$inferSelect;

import { pgTable, serial, text, timestamp, boolean, integer, pgEnum } from "drizzle-orm/pg-core";

export const appStatusEnum = pgEnum("devops_app_status", ["running", "stopped", "deploying", "failed", "paused"]);
export const deployStatusEnum = pgEnum("deploy_status", ["pending", "running", "success", "failed", "rolled_back"]);
export const backupTypeEnum = pgEnum("devops_backup_type", ["full", "incremental", "snapshot"]);
export const backupStatusEnum = pgEnum("devops_backup_status", ["pending", "running", "success", "failed"]);
export const incidentLevelEnum = pgEnum("devops_incident_level", ["info", "warning", "error", "critical"]);
export const agentTriggerEnum = pgEnum("agent_trigger", ["cron", "webhook", "manual", "on_deploy"]);

export const devopsAppsTable = pgTable("devops_apps", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  repoUrl: text("repo_url").notNull(),
  environment: text("environment").notNull().default("production"),
  vpsHost: text("vps_host").notNull(),
  vpsPort: integer("vps_port").notNull().default(22),
  containerName: text("container_name").notNull(),
  imageName: text("image_name").notNull(),
  exposedPort: integer("exposed_port").notNull().default(3000),
  currentVersion: text("current_version"),
  status: appStatusEnum("status").notNull().default("stopped"),
  riskScore: integer("risk_score").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const deploymentRecordsTable = pgTable("deployment_records", {
  id: serial("id").primaryKey(),
  appId: integer("app_id").notNull(),
  version: text("version").notNull(),
  imageTag: text("image_tag"),
  status: deployStatusEnum("status").notNull().default("pending"),
  deployedAt: timestamp("deployed_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  log: text("log"),
  triggeredBy: text("triggered_by"),
  rollbackOf: integer("rollback_of"),
});

export const backupPoliciesTable = pgTable("devops_backup_policies", {
  id: serial("id").primaryKey(),
  appId: integer("app_id").notNull(),
  backupType: backupTypeEnum("backup_type").notNull().default("full"),
  schedule: text("schedule").notNull().default("0 3 * * *"),
  retentionDays: integer("retention_days").notNull().default(7),
  enabled: boolean("enabled").notNull().default(true),
  storagePath: text("storage_path"),
  lastBackupAt: timestamp("last_backup_at"),
  lastBackupStatus: backupStatusEnum("last_backup_status"),
});

export const backupRecordsTable = pgTable("devops_backup_records", {
  id: serial("id").primaryKey(),
  appId: integer("app_id").notNull(),
  policyId: integer("policy_id"),
  backupType: backupTypeEnum("backup_type").notNull(),
  status: backupStatusEnum("status").notNull().default("pending"),
  storageKey: text("storage_key"),
  sizeBytes: integer("size_bytes"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  log: text("log"),
  checksum: text("checksum"),
});

export const agentDefinitionsTable = pgTable("agent_definitions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  trigger: agentTriggerEnum("trigger").notNull().default("cron"),
  schedule: text("schedule"),
  enabled: boolean("enabled").notNull().default(true),
  configJson: text("config_json"),
  lastRunAt: timestamp("last_run_at"),
  lastStatus: text("last_status"),
});

export const incidentLogsTable = pgTable("devops_incident_logs", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  appId: integer("app_id"),
  agentId: integer("agent_id"),
  level: incidentLevelEnum("level").notNull().default("info"),
  category: text("category").notNull().default("system"),
  message: text("message").notNull(),
  resolved: boolean("resolved").notNull().default(false),
  resolvedAt: timestamp("resolved_at"),
});

export const notificationChannelsTable = pgTable("notification_channels", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  name: text("name").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  configJson: text("config_json"),
  lastSentAt: timestamp("last_sent_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type DevopsApp = typeof devopsAppsTable.$inferSelect;
export type DeploymentRecord = typeof deploymentRecordsTable.$inferSelect;
export type BackupPolicy = typeof backupPoliciesTable.$inferSelect;
export type BackupRecord = typeof backupRecordsTable.$inferSelect;
export type AgentDefinition = typeof agentDefinitionsTable.$inferSelect;
export type IncidentLog = typeof incidentLogsTable.$inferSelect;
export type NotificationChannel = typeof notificationChannelsTable.$inferSelect;

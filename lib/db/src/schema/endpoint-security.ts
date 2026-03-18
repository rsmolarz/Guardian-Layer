import { pgTable, serial, text, doublePrecision, timestamp, boolean, integer } from "drizzle-orm/pg-core";

export const endpointsTable = pgTable("endpoints", {
  id: serial("id").primaryKey(),
  hostname: text("hostname").notNull(),
  deviceType: text("device_type").notNull().default("workstation"),
  os: text("os").notNull(),
  osVersion: text("os_version").notNull(),
  lastSeen: timestamp("last_seen").notNull().defaultNow(),
  status: text("status").notNull().default("online"),
  complianceStatus: text("compliance_status").notNull().default("compliant"),
  riskScore: doublePrecision("risk_score").notNull().default(0),
  agentVersion: text("agent_version"),
  encryptionEnabled: boolean("encryption_enabled").notNull().default(true),
  firewallEnabled: boolean("firewall_enabled").notNull().default(true),
  antivirusEnabled: boolean("antivirus_enabled").notNull().default(true),
  patchesPending: integer("patches_pending").notNull().default(0),
  vulnerabilities: integer("vulnerabilities").notNull().default(0),
  assignedUser: text("assigned_user"),
  ipAddress: text("ip_address"),
  location: text("location"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Endpoint = typeof endpointsTable.$inferSelect;

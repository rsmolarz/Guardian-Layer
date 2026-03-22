import { pgTable, serial, varchar, text, boolean, timestamp, integer } from "drizzle-orm/pg-core";

export const remoteMachinesTable = pgTable("remote_machines", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  hostname: varchar("hostname", { length: 255 }).notNull(),
  port: integer("port").notNull().default(22),
  username: varchar("username", { length: 100 }).notNull(),
  authMethod: varchar("auth_method", { length: 20 }).notNull().default("password"),
  encryptedCredential: text("encrypted_credential").notNull(),
  os: varchar("os", { length: 20 }),
  osVersion: varchar("os_version", { length: 100 }),
  lastSeen: timestamp("last_seen"),
  lastMaintenanceAt: timestamp("last_maintenance_at"),
  active: boolean("active").notNull().default(true),
  tags: text("tags"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const maintenanceJobsTable = pgTable("maintenance_jobs", {
  id: serial("id").primaryKey(),
  machineId: integer("machine_id").notNull(),
  taskType: varchar("task_type", { length: 50 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  output: text("output"),
  error: text("error"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

import { pgTable, serial, text, boolean, timestamp, jsonb, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const alertsTable = pgTable("alerts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  severity: text("severity").notNull().default("low"),
  category: varchar("category", { length: 50 }).default("general"),
  source: varchar("source", { length: 100 }),
  dismissed: boolean("dismissed").notNull().default(false),
  readAt: timestamp("read_at"),
  emailSent: boolean("email_sent").default(false),
  pushSent: boolean("push_sent").default(false),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const alertPreferencesTable = pgTable("alert_preferences", {
  id: serial("id").primaryKey(),
  channel: varchar("channel", { length: 20 }).notNull(),
  enabled: boolean("enabled").notNull().default(true),
  minSeverity: varchar("min_severity", { length: 20 }).default("medium"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAlertSchema = createInsertSchema(alertsTable).omit({ id: true, createdAt: true });
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alertsTable.$inferSelect;

export const insertAlertPreferenceSchema = createInsertSchema(alertPreferencesTable).omit({ id: true, updatedAt: true });
export type InsertAlertPreference = z.infer<typeof insertAlertPreferenceSchema>;
export type AlertPreference = typeof alertPreferencesTable.$inferSelect;

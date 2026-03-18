import { pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const monitoredUrlsTable = pgTable("monitored_urls", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull().default("general"),
  status: varchar("status", { length: 50 }).notNull().default("active"),
  addedAt: timestamp("added_at").defaultNow().notNull(),
  lastChecked: timestamp("last_checked"),
});

export const insertMonitoredUrlSchema = createInsertSchema(monitoredUrlsTable);
export const selectMonitoredUrlSchema = createSelectSchema(monitoredUrlsTable);
export type MonitoredUrl = typeof monitoredUrlsTable.$inferSelect;
export type InsertMonitoredUrl = typeof monitoredUrlsTable.$inferInsert;

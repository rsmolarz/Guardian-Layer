import { pgTable, serial, text, timestamp, doublePrecision, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const activityLogsTable = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  action: text("action").notNull(),
  category: text("category").notNull(),
  source: text("source").notNull(),
  detail: text("detail").notNull(),
  severity: text("severity").notNull().default("info"),
  ipAddress: text("ip_address"),
  metadata: jsonb("metadata"),
  responseTimeMs: doublePrecision("response_time_ms"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertActivityLogSchema = createInsertSchema(activityLogsTable).omit({ id: true, createdAt: true });
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLogsTable.$inferSelect;

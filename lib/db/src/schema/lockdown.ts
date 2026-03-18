import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const lockdownSessionsTable = pgTable("lockdown_sessions", {
  id: serial("id").primaryKey(),
  status: text("status").notNull().default("active"),
  reason: text("reason").notNull(),
  activatedAt: timestamp("activated_at").notNull().defaultNow(),
  deactivatedAt: timestamp("deactivated_at"),
  summaryReport: text("summary_report"),
});

export const lockdownActionsTable = pgTable("lockdown_actions", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  actionType: text("action_type").notNull(),
  label: text("label").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("active"),
  activatedAt: timestamp("activated_at").notNull().defaultNow(),
  liftedAt: timestamp("lifted_at"),
});

export const insertLockdownSessionSchema = createInsertSchema(lockdownSessionsTable).omit({ id: true, activatedAt: true });
export type InsertLockdownSession = z.infer<typeof insertLockdownSessionSchema>;
export type LockdownSession = typeof lockdownSessionsTable.$inferSelect;

export const insertLockdownActionSchema = createInsertSchema(lockdownActionsTable).omit({ id: true, activatedAt: true });
export type InsertLockdownAction = z.infer<typeof insertLockdownActionSchema>;
export type LockdownAction = typeof lockdownActionsTable.$inferSelect;

import { pgTable, serial, text, integer, timestamp, foreignKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const recoveryCasesTable = pgTable("recovery_cases", {
  id: serial("id").primaryKey(),
  assetType: text("asset_type").notNull(),
  assetIdentifier: text("asset_identifier").notNull(),
  compromiseDetails: text("compromise_details").notNull(),
  status: text("status").notNull().default("pending"),
  recoveryPercentage: integer("recovery_percentage").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const recoveryStepsTable = pgTable("recovery_steps", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").notNull().references(() => recoveryCasesTable.id),
  stepOrder: integer("step_order").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  status: text("status").notNull().default("not_started"),
  notes: text("notes"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  verifiedAt: timestamp("verified_at"),
});

export const insertRecoveryCaseSchema = createInsertSchema(recoveryCasesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRecoveryCase = z.infer<typeof insertRecoveryCaseSchema>;
export type RecoveryCase = typeof recoveryCasesTable.$inferSelect;

export const insertRecoveryStepSchema = createInsertSchema(recoveryStepsTable).omit({ id: true });
export type InsertRecoveryStep = z.infer<typeof insertRecoveryStepSchema>;
export type RecoveryStep = typeof recoveryStepsTable.$inferSelect;

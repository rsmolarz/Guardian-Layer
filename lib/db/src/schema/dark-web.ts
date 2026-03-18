import { pgTable, serial, text, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const darkWebExposuresTable = pgTable("dark_web_exposures", {
  id: serial("id").primaryKey(),
  dataType: text("data_type").notNull(),
  sourceMarketplace: text("source_marketplace").notNull(),
  severity: text("severity").notNull().default("medium"),
  status: text("status").notNull().default("active"),
  discoveryDate: timestamp("discovery_date").notNull().defaultNow(),
  description: text("description").notNull(),
  recommendedActions: text("recommended_actions").notNull().default("[]"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const recoveryActionsTable = pgTable("recovery_actions", {
  id: serial("id").primaryKey(),
  exposureId: integer("exposure_id").notNull().references(() => darkWebExposuresTable.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  completed: boolean("completed").notNull().default(false),
  priority: integer("priority").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDarkWebExposureSchema = createInsertSchema(darkWebExposuresTable).omit({ id: true, createdAt: true });
export type InsertDarkWebExposure = z.infer<typeof insertDarkWebExposureSchema>;
export type DarkWebExposure = typeof darkWebExposuresTable.$inferSelect;

export const insertRecoveryActionSchema = createInsertSchema(recoveryActionsTable).omit({ id: true, createdAt: true });
export type InsertRecoveryAction = z.infer<typeof insertRecoveryActionSchema>;
export type RecoveryAction = typeof recoveryActionsTable.$inferSelect;

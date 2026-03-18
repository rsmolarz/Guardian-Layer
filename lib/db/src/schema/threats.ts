import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const threatsTable = pgTable("threats", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  severity: text("severity").notNull().default("medium"),
  status: text("status").notNull().default("detected"),
  affectedAssets: text("affected_assets").notNull(),
  detectionSource: text("detection_source").notNull(),
  description: text("description").notNull(),
  detectedAt: timestamp("detected_at").notNull().defaultNow(),
  containedAt: timestamp("contained_at"),
  neutralizedAt: timestamp("neutralized_at"),
});

export const neutralizationStepsTable = pgTable("neutralization_steps", {
  id: serial("id").primaryKey(),
  threatId: integer("threat_id").notNull(),
  stepOrder: integer("step_order").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  status: text("status").notNull().default("pending"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
});

export const insertThreatSchema = createInsertSchema(threatsTable).omit({ id: true, detectedAt: true });
export type InsertThreat = z.infer<typeof insertThreatSchema>;
export type Threat = typeof threatsTable.$inferSelect;

export const insertNeutralizationStepSchema = createInsertSchema(neutralizationStepsTable).omit({ id: true });
export type InsertNeutralizationStep = z.infer<typeof insertNeutralizationStepSchema>;
export type NeutralizationStep = typeof neutralizationStepsTable.$inferSelect;

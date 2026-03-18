import { pgTable, serial, text, integer, timestamp, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const drProceduresTable = pgTable("dr_procedures", {
  id: serial("id").primaryKey(),
  scenario: text("scenario").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  priority: text("priority").notNull().default("medium"),
  rtoMinutes: integer("rto_minutes").notNull(),
  rpoMinutes: integer("rpo_minutes").notNull(),
  estimatedRecoveryMinutes: integer("estimated_recovery_minutes").notNull(),
  requiredPersonnel: text("required_personnel").notNull(),
  dependencies: text("dependencies").notNull(),
  lastTestedAt: timestamp("last_tested_at"),
  lastTestResult: text("last_test_result"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const drProcedureStepsTable = pgTable("dr_procedure_steps", {
  id: serial("id").primaryKey(),
  procedureId: integer("procedure_id").notNull().references(() => drProceduresTable.id),
  stepOrder: integer("step_order").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  estimatedMinutes: integer("estimated_minutes").notNull(),
  responsible: text("responsible").notNull(),
});

export const drTestResultsTable = pgTable("dr_test_results", {
  id: serial("id").primaryKey(),
  procedureId: integer("procedure_id").notNull().references(() => drProceduresTable.id),
  testDate: timestamp("test_date").notNull(),
  outcome: text("outcome").notNull(),
  actualRecoveryMinutes: integer("actual_recovery_minutes"),
  notes: text("notes"),
  gapsFound: text("gaps_found"),
  remediationStatus: text("remediation_status").notNull().default("pending"),
  conductedBy: text("conducted_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const drBusinessImpactTable = pgTable("dr_business_impact", {
  id: serial("id").primaryKey(),
  systemName: text("system_name").notNull(),
  description: text("description").notNull(),
  criticality: text("criticality").notNull(),
  maxDowntimeMinutes: integer("max_downtime_minutes").notNull(),
  financialImpactPerHour: real("financial_impact_per_hour").notNull(),
  dependencies: text("dependencies").notNull(),
  currentStatus: text("current_status").notNull().default("operational"),
  lastAssessedAt: timestamp("last_assessed_at").notNull().defaultNow(),
});

export const drFailoverConfigTable = pgTable("dr_failover_config", {
  id: serial("id").primaryKey(),
  component: text("component").notNull(),
  primaryStatus: text("primary_status").notNull().default("healthy"),
  secondaryStatus: text("secondary_status").notNull().default("standby"),
  failoverMode: text("failover_mode").notNull().default("manual"),
  lastFailoverAt: timestamp("last_failover_at"),
  lastHealthCheckAt: timestamp("last_health_check_at").notNull().defaultNow(),
  rtoSeconds: integer("rto_seconds").notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

export const drCommunicationPlanTable = pgTable("dr_communication_plan", {
  id: serial("id").primaryKey(),
  scenario: text("scenario").notNull(),
  escalationLevel: integer("escalation_level").notNull(),
  contactName: text("contact_name").notNull(),
  contactRole: text("contact_role").notNull(),
  contactEmail: text("contact_email").notNull(),
  contactPhone: text("contact_phone").notNull(),
  notificationTemplate: text("notification_template").notNull(),
  responseTimeMinutes: integer("response_time_minutes").notNull(),
});

export const drComplianceChecklistTable = pgTable("dr_compliance_checklist", {
  id: serial("id").primaryKey(),
  framework: text("framework").notNull(),
  controlId: text("control_id").notNull(),
  controlTitle: text("control_title").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("not_started"),
  evidence: text("evidence"),
  lastReviewedAt: timestamp("last_reviewed_at"),
  assignedTo: text("assigned_to"),
});

export const insertDrProcedureSchema = createInsertSchema(drProceduresTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDrProcedure = z.infer<typeof insertDrProcedureSchema>;
export type DrProcedure = typeof drProceduresTable.$inferSelect;

export const insertDrProcedureStepSchema = createInsertSchema(drProcedureStepsTable).omit({ id: true });
export type InsertDrProcedureStep = z.infer<typeof insertDrProcedureStepSchema>;
export type DrProcedureStep = typeof drProcedureStepsTable.$inferSelect;

export const insertDrTestResultSchema = createInsertSchema(drTestResultsTable).omit({ id: true, createdAt: true });
export type InsertDrTestResult = z.infer<typeof insertDrTestResultSchema>;
export type DrTestResult = typeof drTestResultsTable.$inferSelect;

export const insertDrBusinessImpactSchema = createInsertSchema(drBusinessImpactTable).omit({ id: true });
export type InsertDrBusinessImpact = z.infer<typeof insertDrBusinessImpactSchema>;
export type DrBusinessImpact = typeof drBusinessImpactTable.$inferSelect;

export const insertDrFailoverConfigSchema = createInsertSchema(drFailoverConfigTable).omit({ id: true });
export type InsertDrFailoverConfig = z.infer<typeof insertDrFailoverConfigSchema>;
export type DrFailoverConfig = typeof drFailoverConfigTable.$inferSelect;

export const insertDrCommunicationPlanSchema = createInsertSchema(drCommunicationPlanTable).omit({ id: true });
export type InsertDrCommunicationPlan = z.infer<typeof insertDrCommunicationPlanSchema>;
export type DrCommunicationPlan = typeof drCommunicationPlanTable.$inferSelect;

export const insertDrComplianceChecklistSchema = createInsertSchema(drComplianceChecklistTable).omit({ id: true });
export type InsertDrComplianceChecklist = z.infer<typeof insertDrComplianceChecklistSchema>;
export type DrComplianceChecklist = typeof drComplianceChecklistTable.$inferSelect;

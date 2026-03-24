import { pgTable, serial, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";

export const apertureAppsTable = pgTable("aperture_apps", {
  id: serial("id").primaryKey(),
  appName: text("app_name").notNull(),
  appUrl: text("app_url"),
  category: text("category").notNull().default("Other"),
  aiProviders: text("ai_providers").notNull().default(""),
  routedThroughAperture: boolean("routed_through_aperture").notNull().default(false),
  migrationStatus: text("migration_status").notNull().default("not_started"),
  estimatedMonthlyCost: text("estimated_monthly_cost"),
  notes: text("notes"),
  lastChecked: timestamp("last_checked"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ApertureApp = typeof apertureAppsTable.$inferSelect;

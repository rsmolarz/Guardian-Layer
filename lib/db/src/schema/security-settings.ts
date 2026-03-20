import { pgTable, serial, text, boolean, timestamp, varchar, integer } from "drizzle-orm/pg-core";

export const securitySettingsTable = pgTable("security_settings", {
  id: serial("id").primaryKey(),
  category: varchar("category", { length: 50 }).notNull(),
  settingName: varchar("setting_name", { length: 100 }).notNull(),
  currentValue: text("current_value").notNull(),
  notes: text("notes"),
  lastVerifiedAt: timestamp("last_verified_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const settingsChangeLogTable = pgTable("settings_change_log", {
  id: serial("id").primaryKey(),
  settingId: integer("setting_id").notNull(),
  previousValue: text("previous_value").notNull(),
  newValue: text("new_value").notNull(),
  changedBy: varchar("changed_by", { length: 100 }).default("user"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const platformPinTable = pgTable("platform_pin", {
  id: serial("id").primaryKey(),
  pinHash: text("pin_hash").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type SecuritySetting = typeof securitySettingsTable.$inferSelect;
export type SettingsChangeLog = typeof settingsChangeLogTable.$inferSelect;

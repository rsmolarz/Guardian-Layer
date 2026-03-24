import { pgTable, serial, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";

export const webauthnCredentialsTable = pgTable("webauthn_credentials", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  credentialId: text("credential_id").notNull().unique(),
  publicKey: text("public_key").notNull(),
  counter: integer("counter").notNull().default(0),
  deviceType: text("device_type").notNull().default("singleDevice"),
  backedUp: boolean("backed_up").notNull().default(false),
  transports: text("transports"),
  label: text("label").notNull().default("Security Key"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastUsed: timestamp("last_used"),
});

export const yubikeyAppCoverageTable = pgTable("yubikey_app_coverage", {
  id: serial("id").primaryKey(),
  appName: text("app_name").notNull(),
  appUrl: text("app_url"),
  hasHardwareKey: boolean("has_hardware_key").notNull().default(false),
  protectionType: text("protection_type").notNull().default("none"),
  keySerials: text("key_serials"),
  notes: text("notes"),
  lastVerified: timestamp("last_verified"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type WebAuthnCredential = typeof webauthnCredentialsTable.$inferSelect;
export type YubikeyAppCoverage = typeof yubikeyAppCoverageTable.$inferSelect;

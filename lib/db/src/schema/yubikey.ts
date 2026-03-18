import { pgTable, serial, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";

export const yubikeyDevicesTable = pgTable("yubikey_devices", {
  id: serial("id").primaryKey(),
  serialNumber: text("serial_number").notNull().unique(),
  model: text("model").notNull().default("YubiKey 5 NFC"),
  firmwareVersion: text("firmware_version").notNull().default("5.4.3"),
  assignedUser: text("assigned_user"),
  status: text("status").notNull().default("active"),
  enrolledAt: timestamp("enrolled_at").notNull().defaultNow(),
  lastUsed: timestamp("last_used"),
  authSuccessCount: integer("auth_success_count").notNull().default(0),
  authFailCount: integer("auth_fail_count").notNull().default(0),
  protocols: text("protocols").notNull().default("FIDO2,U2F,OTP"),
  department: text("department"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const yubikeyAuthEventsTable = pgTable("yubikey_auth_events", {
  id: serial("id").primaryKey(),
  deviceSerial: text("device_serial").notNull(),
  user: text("user_id").notNull(),
  eventType: text("event_type").notNull().default("auth_success"),
  protocol: text("protocol").notNull().default("FIDO2"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  location: text("location"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type YubikeyDevice = typeof yubikeyDevicesTable.$inferSelect;
export type YubikeyAuthEvent = typeof yubikeyAuthEventsTable.$inferSelect;

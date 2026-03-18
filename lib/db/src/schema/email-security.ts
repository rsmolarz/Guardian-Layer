import { pgTable, serial, text, doublePrecision, timestamp, boolean, integer } from "drizzle-orm/pg-core";

export const emailThreatsTable = pgTable("email_threats", {
  id: serial("id").primaryKey(),
  subject: text("subject").notNull(),
  sender: text("sender").notNull(),
  recipient: text("recipient").notNull(),
  threatType: text("threat_type").notNull().default("phishing"),
  riskScore: doublePrecision("risk_score").notNull(),
  status: text("status").notNull().default("detected"),
  senderReputation: doublePrecision("sender_reputation").notNull().default(0.5),
  hasAttachment: boolean("has_attachment").notNull().default(false),
  attachmentName: text("attachment_name"),
  attachmentScanResult: text("attachment_scan_result"),
  country: text("country"),
  ipAddress: text("ip_address"),
  details: text("details"),
  quarantined: boolean("quarantined").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type EmailThreat = typeof emailThreatsTable.$inferSelect;

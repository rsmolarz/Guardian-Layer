import { pgTable, serial, text, doublePrecision, timestamp, integer } from "drizzle-orm/pg-core";

export const networkEventsTable = pgTable("network_events", {
  id: serial("id").primaryKey(),
  eventType: text("event_type").notNull().default("firewall"),
  severity: text("severity").notNull().default("medium"),
  sourceIp: text("source_ip").notNull(),
  destinationIp: text("destination_ip").notNull(),
  sourcePort: integer("source_port"),
  destinationPort: integer("destination_port"),
  protocol: text("protocol").notNull().default("TCP"),
  action: text("action").notNull().default("blocked"),
  riskScore: doublePrecision("risk_score").notNull().default(0),
  country: text("country"),
  details: text("details"),
  ruleName: text("rule_name"),
  bytesTransferred: integer("bytes_transferred"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type NetworkEvent = typeof networkEventsTable.$inferSelect;

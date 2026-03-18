import { pgTable, serial, text, doublePrecision, timestamp, integer } from "drizzle-orm/pg-core";

export const openclawContractsTable = pgTable("openclaw_contracts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  contractType: text("contract_type").notNull().default("service_agreement"),
  status: text("status").notNull().default("active"),
  riskLevel: text("risk_level").notNull().default("low"),
  riskScore: doublePrecision("risk_score").notNull().default(0),
  counterparty: text("counterparty").notNull(),
  jurisdiction: text("jurisdiction").notNull().default("US"),
  flaggedClauses: integer("flagged_clauses").notNull().default(0),
  totalClauses: integer("total_clauses").notNull().default(0),
  complianceStatus: text("compliance_status").notNull().default("compliant"),
  expiresAt: timestamp("expires_at"),
  lastScanned: timestamp("last_scanned").notNull().defaultNow(),
  details: text("details"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type OpenclawContract = typeof openclawContractsTable.$inferSelect;

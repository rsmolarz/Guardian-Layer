import { pgTable, serial, text, timestamp, varchar, integer, boolean } from "drizzle-orm/pg-core";

export const monitoredDomainsTable = pgTable("monitored_domains", {
  id: serial("id").primaryKey(),
  domain: varchar("domain", { length: 255 }).notNull().unique(),
  notes: text("notes"),
  hibpVerified: boolean("hibp_verified").notNull().default(false),
  lastScanAt: timestamp("last_scan_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const domainEmailsTable = pgTable("domain_emails", {
  id: serial("id").primaryKey(),
  domainId: integer("domain_id").notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  lastCheckedAt: timestamp("last_checked_at"),
  breachCount: integer("breach_count").notNull().default(0),
  verdict: varchar("verdict", { length: 20 }).notNull().default("unchecked"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const domainBreachResultsTable = pgTable("domain_breach_results", {
  id: serial("id").primaryKey(),
  emailId: integer("email_id").notNull(),
  breachName: varchar("breach_name", { length: 255 }).notNull(),
  breachTitle: varchar("breach_title", { length: 255 }),
  breachDomain: varchar("breach_domain", { length: 255 }),
  breachDate: varchar("breach_date", { length: 20 }),
  pwnCount: integer("pwn_count"),
  dataClasses: text("data_classes"),
  isVerified: boolean("is_verified").default(true),
  discoveredAt: timestamp("discovered_at").notNull().defaultNow(),
});

import { pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const secureVaultTable = pgTable("secure_vault", {
  id: serial("id").primaryKey(),
  entryType: varchar("entry_type", { length: 50 }).notNull().default("card"),
  label: varchar("label", { length: 255 }).notNull(),
  issuer: varchar("issuer", { length: 255 }),
  lastFour: varchar("last_four", { length: 10 }),
  encryptedData: text("encrypted_data").notNull(),
  websiteUrl: varchar("website_url", { length: 500 }),
  phoneNumber: varchar("phone_number", { length: 100 }),
  breachInstructions: text("breach_instructions"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

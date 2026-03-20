import { pgTable, serial, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const systemEventsTable = pgTable("system_events", {
  id: serial("id").primaryKey(),
  eventType: text("event_type").notNull(),
  payload: jsonb("payload"),
  sourceService: text("source_service").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSystemEventSchema = createInsertSchema(systemEventsTable).omit({ id: true, createdAt: true });
export type InsertSystemEvent = z.infer<typeof insertSystemEventSchema>;
export type SystemEvent = typeof systemEventsTable.$inferSelect;

import { pgTable, serial, text, boolean, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const plannerEntriesTable = pgTable("planner_entries", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id"),
  date: text("date").notNull(),
  timeSlot: text("time_slot"),
  content: text("content").notNull(),
  category: text("category"),
  section: text("section").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPlannerEntrySchema = createInsertSchema(plannerEntriesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPlannerEntry = z.infer<typeof insertPlannerEntrySchema>;
export type PlannerEntry = typeof plannerEntriesTable.$inferSelect;

export const tasksTable = pgTable("tasks", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id"),
  date: text("date").notNull(),
  text: text("text").notNull(),
  completed: boolean("completed").default(false).notNull(),
  priority: text("priority"),
  source: text("source"),
  recurring: boolean("recurring").default(false).notNull(),
  recurringFrequency: text("recurring_frequency").default("none"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTaskSchema = createInsertSchema(tasksTable).omit({ id: true, createdAt: true });
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasksTable.$inferSelect;

export const specialDatesTable = pgTable("special_dates", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  date: text("date").notNull(),
  label: text("label").notNull(),
  type: text("type").notNull().default("event"),
  recurring: boolean("recurring").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSpecialDateSchema = createInsertSchema(specialDatesTable).omit({ id: true, createdAt: true });
export type InsertSpecialDate = z.infer<typeof insertSpecialDateSchema>;
export type SpecialDate = typeof specialDatesTable.$inferSelect;

export const brainDumpsTable = pgTable("brain_dumps", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id"),
  date: text("date").notNull(),
  rawText: text("raw_text").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBrainDumpSchema = createInsertSchema(brainDumpsTable).omit({ id: true, createdAt: true });
export type InsertBrainDump = z.infer<typeof insertBrainDumpSchema>;
export type BrainDump = typeof brainDumpsTable.$inferSelect;

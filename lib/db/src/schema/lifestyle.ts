import { pgTable, serial, text, boolean, integer, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Cycle/menstrual logs
export const cycleLogsTable = pgTable("cycle_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  date: text("date").notNull(),
  flow: text("flow"),           // spotting | light | medium | heavy
  symptoms: text("symptoms"),   // JSON-stringified string[]
  mood: text("mood"),
  notes: text("notes"),
  temperature: text("temperature"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export const insertCycleLogSchema = createInsertSchema(cycleLogsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCycleLog = z.infer<typeof insertCycleLogSchema>;
export type CycleLog = typeof cycleLogsTable.$inferSelect;

// Cycle settings (one row per user)
export const cycleSettingsTable = pgTable("cycle_settings", {
  userId: varchar("user_id").primaryKey(),
  cycleLength: integer("cycle_length").notNull().default(28),
  periodLength: integer("period_length").notNull().default(5),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export type CycleSetting = typeof cycleSettingsTable.$inferSelect;

// Daily mood logs
export const moodLogsTable = pgTable("mood_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  date: text("date").notNull(),
  moodIdx: integer("mood_idx").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const insertMoodLogSchema = createInsertSchema(moodLogsTable).omit({ id: true, createdAt: true });
export type InsertMoodLog = z.infer<typeof insertMoodLogSchema>;
export type MoodLog = typeof moodLogsTable.$inferSelect;

// Quick notes (one record per user, upserted)
export const quickNotesTable = pgTable("quick_notes", {
  userId: varchar("user_id").primaryKey(),
  content: text("content").notNull().default(""),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export type QuickNote = typeof quickNotesTable.$inferSelect;

// Vision board items
export const visionBoardItemsTable = pgTable("vision_board_items", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  type: text("type").notNull().default("image"), // image | quote | affirmation
  content: text("content").notNull(),
  caption: text("caption"),
  category: text("category").notNull().default("Faith"),
  color: text("color"),
  pinned: boolean("pinned").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const insertVisionBoardItemSchema = createInsertSchema(visionBoardItemsTable).omit({ id: true, createdAt: true });
export type InsertVisionBoardItem = z.infer<typeof insertVisionBoardItemSchema>;
export type VisionBoardItem = typeof visionBoardItemsTable.$inferSelect;

import { pgTable, serial, text, boolean, integer, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ─── Todo Items ───────────────────────────────────────────────────────────────

export const todoItemsTable = pgTable("todo_items", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  text: text("text").notNull(),
  notes: text("notes"),
  dueDate: text("due_date"),
  completed: boolean("completed").default(false).notNull(),
  completedAt: text("completed_at"),
  priority: text("priority").default("none"),
  category: text("category"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertTodoItemSchema = createInsertSchema(todoItemsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTodoItem = z.infer<typeof insertTodoItemSchema>;
export type TodoItem = typeof todoItemsTable.$inferSelect;

// ─── Prayer Entries ───────────────────────────────────────────────────────────

export const prayerEntriesTable = pgTable("prayer_entries", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  date: text("date").notNull(),
  title: text("title"),
  body: text("body").notNull(),
  category: text("category").default("request"),
  answered: boolean("answered").default(false).notNull(),
  answeredDate: text("answered_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPrayerEntrySchema = createInsertSchema(prayerEntriesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPrayerEntry = z.infer<typeof insertPrayerEntrySchema>;
export type PrayerEntry = typeof prayerEntriesTable.$inferSelect;

// ─── Habits ───────────────────────────────────────────────────────────────────

export const habitsTable = pgTable("habits", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  emoji: text("emoji"),
  color: text("color").default("primary"),
  category: text("category"),
  frequency: text("frequency").default("daily").notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertHabitSchema = createInsertSchema(habitsTable).omit({ id: true, createdAt: true });
export type InsertHabit = z.infer<typeof insertHabitSchema>;
export type Habit = typeof habitsTable.$inferSelect;

export const habitLogsTable = pgTable("habit_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  habitId: integer("habit_id").notNull(),
  date: text("date").notNull(),
  completed: boolean("completed").default(true).notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertHabitLogSchema = createInsertSchema(habitLogsTable).omit({ id: true, createdAt: true });
export type InsertHabitLog = z.infer<typeof insertHabitLogSchema>;
export type HabitLog = typeof habitLogsTable.$inferSelect;

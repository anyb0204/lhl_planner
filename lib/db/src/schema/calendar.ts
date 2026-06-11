import { pgTable, serial, text, varchar, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const calendarTokensTable = pgTable("calendar_tokens", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().unique(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const notificationPrefsTable = pgTable("notification_prefs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().unique(),
  browserPush: boolean("browser_push").default(false).notNull(),
  emailMorningSummary: boolean("email_morning_summary").default(false).notNull(),
  appointmentLeadMinutes: text("appointment_lead_minutes").default("60").notNull(),
  refillAlertDays: text("refill_alert_days").default("5").notNull(),
  quietStart: text("quiet_start").default("21:00").notNull(),
  quietEnd: text("quiet_end").default("07:00").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export const insertNotificationPrefsSchema = createInsertSchema(notificationPrefsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type NotificationPrefs = typeof notificationPrefsTable.$inferSelect;

export const pushSubscriptionsTable = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userMemoriesTable = pgTable("user_memories", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  kind: text("kind").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export const insertUserMemorySchema = createInsertSchema(userMemoriesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type UserMemory = typeof userMemoriesTable.$inferSelect;
export type InsertUserMemory = z.infer<typeof insertUserMemorySchema>;

export const sentEncouragementsTable = pgTable("sent_encouragements", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  scriptureReference: text("scripture_reference"),
  theme: text("theme"),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
});

export const reminderLastSentTable = pgTable("reminder_last_sent", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  reminderKey: text("reminder_key").notNull(),
  lastSentAt: timestamp("last_sent_at").defaultNow().notNull(),
});

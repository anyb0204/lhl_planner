import { pgTable, serial, text, boolean, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const medicationsTable = pgTable("medications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id"),
  name: text("name").notNull(),
  dose: text("dose"),
  times: text("times"), // comma-separated: "AM,Noon,PM,Bedtime"
  asNeeded: boolean("as_needed").default(false).notNull(),
  notes: text("notes"),
  refillDate: text("refill_date"),
  doctor: text("doctor"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const insertMedicationSchema = createInsertSchema(medicationsTable).omit({ id: true, createdAt: true });
export type InsertMedication = z.infer<typeof insertMedicationSchema>;
export type Medication = typeof medicationsTable.$inferSelect;

export const healthAppointmentsTable = pgTable("health_appointments", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id"),
  person: text("person").notNull(),
  doctor: text("doctor").notNull(),
  specialty: text("specialty"),
  appointmentDate: text("appointment_date").notNull(),
  location: text("location"),
  notes: text("notes"),
  questions: text("questions"),
  completed: boolean("completed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const insertHealthAppointmentSchema = createInsertSchema(healthAppointmentsTable).omit({ id: true, createdAt: true });
export type InsertHealthAppointment = z.infer<typeof insertHealthAppointmentSchema>;
export type HealthAppointment = typeof healthAppointmentsTable.$inferSelect;

export const healthConditionsTable = pgTable("health_conditions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id"),
  name: text("name").notNull(),
  person: text("person"),
  status: text("status").default("active").notNull(),
  diagnosedDate: text("diagnosed_date"),
  doctor: text("doctor"),
  severity: text("severity"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export const insertHealthConditionSchema = createInsertSchema(healthConditionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertHealthCondition = z.infer<typeof insertHealthConditionSchema>;
export type HealthCondition = typeof healthConditionsTable.$inferSelect;

export const financialEntriesTable = pgTable("financial_entries", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id"),
  date: text("date").notNull(),
  type: text("type").notNull(), // "income", "expense", "tithe", "giving", "savings"
  amount: text("amount").notNull(),
  description: text("description").notNull(),
  category: text("category"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const insertFinancialEntrySchema = createInsertSchema(financialEntriesTable).omit({ id: true, createdAt: true });
export type InsertFinancialEntry = z.infer<typeof insertFinancialEntrySchema>;
export type FinancialEntry = typeof financialEntriesTable.$inferSelect;

export const goalsTable = pgTable("goals", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id"),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category"), // "spiritual","personal","health","business","family","kingdom"
  targetDate: text("target_date"),
  progress: text("progress").default("0").notNull(),
  completed: boolean("completed").default(false).notNull(),
  milestones: text("milestones"), // JSON stringified array
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export const insertGoalSchema = createInsertSchema(goalsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type Goal = typeof goalsTable.$inferSelect;

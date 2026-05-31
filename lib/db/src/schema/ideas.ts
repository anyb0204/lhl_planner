import { pgTable, serial, text, integer, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ideaValidationsTable = pgTable("idea_validations", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  targetCustomer: text("target_customer"),
  revenueModel: text("revenue_model"),
  stage: text("stage"),
  status: text("status").notNull().default("pending"), // pending | complete | error
  report: text("report"),          // JSON string of full analysis
  successProbability: integer("success_probability"),
  confidenceScore: integer("confidence_score"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertIdeaValidationSchema = createInsertSchema(ideaValidationsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertIdeaValidation = z.infer<typeof insertIdeaValidationSchema>;
export type IdeaValidation = typeof ideaValidationsTable.$inferSelect;

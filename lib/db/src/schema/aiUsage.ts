import { integer, numeric, pgTable, serial, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

export const aiUsageLogTable = pgTable("ai_usage_log", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  bucket: text("bucket").notNull(),
  endpoint: text("endpoint").notNull(),
  model: text("model").notNull(),
  promptTokens: integer("prompt_tokens").notNull().default(0),
  completionTokens: integer("completion_tokens").notNull().default(0),
  totalTokens: integer("total_tokens").notNull().default(0),
  costUsd: numeric("cost_usd", { precision: 10, scale: 6 }).notNull().default("0"),
  localDate: text("local_date").notNull(),
  localMonth: text("local_month").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type AiUsageLog = typeof aiUsageLogTable.$inferSelect;

export const aiDailyUsageTable = pgTable(
  "ai_daily_usage",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id").notNull(),
    bucket: text("bucket").notNull(),
    localDate: text("local_date").notNull(),
    count: integer("count").notNull().default(0),
  },
  (table) => [uniqueIndex("ai_daily_usage_user_bucket_date_idx").on(table.userId, table.bucket, table.localDate)],
);
export type AiDailyUsage = typeof aiDailyUsageTable.$inferSelect;

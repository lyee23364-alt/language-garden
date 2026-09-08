import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const studySessions = sqliteTable("study_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  language: text("language").notNull(),
  module: text("module").notNull(),
  mode: text("mode").notNull(),
  duration: integer("duration").notNull().default(0),
  score: integer("score"),
  note: text("note").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_sessions_created_at").on(table.createdAt)]);

export const reviewItems = sqliteTable("review_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  itemKey: text("item_key").notNull(),
  language: text("language").notNull(),
  module: text("module").notNull(),
  prompt: text("prompt").notNull(),
  answer: text("answer").notNull(),
  status: text("status").notNull().default("learning"),
  nextReviewAt: text("next_review_at").notNull(),
  intervalDays: integer("interval_days").notNull().default(1),
  seenCount: integer("seen_count").notNull().default(0),
  correctCount: integer("correct_count").notNull().default(0),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("idx_review_item_key").on(table.itemKey),
  index("idx_review_due").on(table.nextReviewAt, table.language),
]);

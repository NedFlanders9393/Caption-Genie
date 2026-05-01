import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";

export const bugReports = pgTable("bug_reports", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  userEmail: text("user_email"),
  description: text("description").notNull(),
  expectedBehavior: text("expected_behavior"),
  screen: text("screen"),
  appVersion: text("app_version"),
  platform: text("platform"),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type BugReport = typeof bugReports.$inferSelect;
export type NewBugReport = typeof bugReports.$inferInsert;

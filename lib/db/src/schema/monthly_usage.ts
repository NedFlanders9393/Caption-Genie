import { pgTable, text, integer, primaryKey } from "drizzle-orm/pg-core";

export const monthlyUsage = pgTable(
  "monthly_usage",
  {
    userId: text("user_id").notNull(),
    yearMonth: text("year_month").notNull(),
    count: integer("count").notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.userId, table.yearMonth] })]
);

export type MonthlyUsage = typeof monthlyUsage.$inferSelect;

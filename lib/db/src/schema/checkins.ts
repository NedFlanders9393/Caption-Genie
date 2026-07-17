import { pgTable, text, integer, timestamp, primaryKey, index } from "drizzle-orm/pg-core";

/**
 * Daily check-in claims — one row per user per UTC day.
 *
 * The composite primary key (user_id, claim_date) makes claiming naturally
 * idempotent: a second claim on the same UTC day hits the conflict and is
 * rejected. Streak position is stored on each row so the next claim can be
 * computed from the latest row alone.
 *
 * claim_date: "YYYY-MM-DD" in UTC — the SERVER's clock decides the day, so
 * changing the phone clock can't farm extra claims.
 * streak_day: 1..7 position in the weekly cycle (day 7 pays the weekly bonus,
 * then the cycle restarts at 1).
 */
export const dailyCheckins = pgTable(
  "daily_checkins",
  {
    userId: text("user_id").notNull(),
    claimDate: text("claim_date").notNull(),
    streakDay: integer("streak_day").notNull(),
    creditsGranted: integer("credits_granted").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.claimDate] }),
    index("daily_checkins_user_date_idx").on(table.userId, table.claimDate),
  ]
);

export type DailyCheckin = typeof dailyCheckins.$inferSelect;
export type InsertDailyCheckin = typeof dailyCheckins.$inferInsert;

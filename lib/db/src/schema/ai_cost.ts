import { pgTable, text, integer, timestamp, serial, index, primaryKey } from "drizzle-orm/pg-core";

/**
 * Append-only record of every AI (Claude) call's actual cost.
 *
 * One row per call. Used by the spend-cap circuit breaker and the owner
 * cost dashboard. `costMicros` is the computed dollar cost in micro-dollars
 * (USD * 1_000_000) so we can sum without floating-point drift.
 *
 *  - action: "generate" | "regenerate" | "hashtags" | "remix"
 *  - tier:   "free" | "pro" | "guest"  (who paid for this call)
 *  - model:  the Claude model id actually used
 */
export const aiCostEvents = pgTable(
  "ai_cost_events",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id"),
    action: text("action").notNull(),
    tier: text("tier").notNull(),
    model: text("model").notNull(),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    costMicros: integer("cost_micros").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("ai_cost_created_idx").on(table.createdAt),
    index("ai_cost_tier_created_idx").on(table.tier, table.createdAt),
  ]
);

export type AiCostEvent = typeof aiCostEvents.$inferSelect;
export type InsertAiCostEvent = typeof aiCostEvents.$inferInsert;

/**
 * Per-user, per-month counter for free-but-metered AI actions
 * (hashtags, remix). These don't cost a credit, but they call the AI, so
 * we cap them server-side to stop unlimited abuse.
 *
 * PK is (userId, yearMonth, action) so each action is tracked independently.
 * `userId` here is the resolved identity — a Clerk user id or `guest_<deviceId>`.
 */
export const meteredActionUsage = pgTable(
  "metered_action_usage",
  {
    userId: text("user_id").notNull(),
    yearMonth: text("year_month").notNull(),
    action: text("action").notNull(),
    count: integer("count").notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.userId, table.yearMonth, table.action] })]
);

export type MeteredActionUsage = typeof meteredActionUsage.$inferSelect;
export type InsertMeteredActionUsage = typeof meteredActionUsage.$inferInsert;

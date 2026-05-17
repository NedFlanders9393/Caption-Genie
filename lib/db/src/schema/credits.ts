import { pgTable, text, integer, timestamp, jsonb, serial, index } from "drizzle-orm/pg-core";

/**
 * Per-user credit balance.
 *
 * Two buckets:
 *  - subscriptionCredits: granted on Pro renewal, RESET each cycle (no rollover)
 *  - purchasedCredits: bought as one-time top-up packs, NEVER expire
 *
 * Spend order is always subscription-first, then purchased — so users
 * maximize value out of their monthly allotment before dipping into packs.
 */
export const userCredits = pgTable("user_credits", {
  userId: text("user_id").primaryKey(),
  subscriptionCredits: integer("subscription_credits").notNull().default(0),
  purchasedCredits: integer("purchased_credits").notNull().default(0),
  monthlyCreditsResetAt: timestamp("monthly_credits_reset_at", { withTimezone: true }).notNull().defaultNow(),
  lifetimeCreditsUsed: integer("lifetime_credits_used").notNull().default(0),
  lifetimeCreditsPurchased: integer("lifetime_credits_purchased").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UserCredits = typeof userCredits.$inferSelect;
export type InsertUserCredits = typeof userCredits.$inferInsert;

/**
 * Full audit log of every credit movement. Append-only.
 *
 * delta: positive = grant, negative = spend
 * reason: "generation" | "hashtags" | "remix" | "subscription_renewal" | "purchase" | "refund" | "manual_grant"
 * bucket: which bucket the delta hit — "subscription" | "purchased" | "mixed"
 */
export const creditTransactions = pgTable(
  "credit_transactions",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    delta: integer("delta").notNull(),
    reason: text("reason").notNull(),
    bucket: text("bucket").notNull(),
    source: text("source"),
    balanceAfter: integer("balance_after").notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("credit_tx_user_created_idx").on(table.userId, table.createdAt),
  ]
);

export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type InsertCreditTransaction = typeof creditTransactions.$inferInsert;

/**
 * Idempotency table for RevenueCat webhook delivery.
 * RevenueCat retries failed webhooks — we MUST dedupe on event id.
 */
export const processedRevenueCatEvents = pgTable("processed_rc_events", {
  eventId: text("event_id").primaryKey(),
  eventType: text("event_type").notNull(),
  userId: text("user_id"),
  processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ProcessedRevenueCatEvent = typeof processedRevenueCatEvents.$inferSelect;

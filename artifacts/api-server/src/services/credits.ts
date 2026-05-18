/**
 * Credit ledger service.
 *
 * All state changes go through this module so we have one place to enforce
 * invariants:
 *   - Spends drain `subscriptionCredits` first, then `purchasedCredits`.
 *   - Spend MUST use SELECT ... FOR UPDATE inside a transaction to prevent
 *     double-spend races (user taps Generate twice in 200ms).
 *   - Every state change writes a row to `credit_transactions` for audit.
 *   - Subscription grants RESET the subscription bucket (no rollover).
 *   - Purchase grants ADD to the purchased bucket (never expire).
 */
import { db } from "@workspace/db";
import {
  userCredits,
  creditTransactions,
  type UserCredits,
} from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";

export interface CreditBalance {
  subscription: number;
  purchased: number;
  total: number;
  monthlyCreditsResetAt: Date;
  lifetimeUsed: number;
  lifetimePurchased: number;
}

export type SpendReason = "generation" | "hashtags" | "remix" | string;
export type GrantReason =
  | "subscription_renewal"
  | "subscription_initial"
  | "purchase"
  | "refund"
  | "manual_grant"
  | "signup_bonus";

const FREE_SIGNUP_CREDITS = 10;

/**
 * Look up the credits row for a user, creating it on first access with the
 * free signup grant. Idempotent.
 */
export async function getOrCreateUserCredits(userId: string): Promise<UserCredits> {
  if (!userId) throw new Error("userId required");

  const existing = await db.select().from(userCredits).where(eq(userCredits.userId, userId)).limit(1);
  if (existing[0]) return existing[0];

  // INSERT ... ON CONFLICT DO NOTHING RETURNING tells us whether THIS call
  // actually created the row. Only the winning caller writes the signup
  // bonus transaction — preventing duplicate ledger rows under concurrency.
  const inserted = await db
    .insert(userCredits)
    .values({
      userId,
      subscriptionCredits: FREE_SIGNUP_CREDITS,
      purchasedCredits: 0,
      lifetimeCreditsUsed: 0,
      lifetimeCreditsPurchased: 0,
    })
    .onConflictDoNothing()
    .returning({ userId: userCredits.userId });

  if (inserted.length > 0) {
    // This call won the race — log the signup grant exactly once.
    await db.insert(creditTransactions).values({
      userId,
      delta: FREE_SIGNUP_CREDITS,
      reason: "signup_bonus",
      bucket: "subscription",
      source: null,
      balanceAfter: FREE_SIGNUP_CREDITS,
      metadata: null,
    });
  }

  const created = await db.select().from(userCredits).where(eq(userCredits.userId, userId)).limit(1);
  if (!created[0]) throw new Error("Failed to create user_credits row");
  return created[0];
}

export async function getBalance(userId: string): Promise<CreditBalance> {
  const row = await getOrCreateUserCredits(userId);
  return {
    subscription: row.subscriptionCredits,
    purchased: row.purchasedCredits,
    total: row.subscriptionCredits + row.purchasedCredits,
    monthlyCreditsResetAt: row.monthlyCreditsResetAt,
    lifetimeUsed: row.lifetimeCreditsUsed,
    lifetimePurchased: row.lifetimeCreditsPurchased,
  };
}

export interface SpendResult {
  ok: boolean;
  reason?: "insufficient" | "error";
  balanceAfter?: number;
  spentFromSubscription?: number;
  spentFromPurchased?: number;
}

/**
 * Atomically decrement credits. Subscription bucket drains first.
 *
 * Uses SELECT ... FOR UPDATE inside a transaction so concurrent requests
 * can't both pass the balance check and double-spend.
 */
export async function spendCredits(
  userId: string,
  amount: number,
  reason: SpendReason,
  metadata?: Record<string, unknown>,
): Promise<SpendResult> {
  if (amount <= 0) throw new Error("amount must be positive");
  await getOrCreateUserCredits(userId);

  return await db.transaction(async (tx) => {
    const lockedRows = await tx.execute(
      sql`SELECT subscription_credits, purchased_credits, lifetime_credits_used
          FROM user_credits
          WHERE user_id = ${userId}
          FOR UPDATE`
    );
    const row = lockedRows.rows[0] as
      | { subscription_credits: number; purchased_credits: number; lifetime_credits_used: number }
      | undefined;
    if (!row) return { ok: false, reason: "error" as const };

    const sub = row.subscription_credits;
    const pur = row.purchased_credits;
    const total = sub + pur;

    if (total < amount) {
      return { ok: false, reason: "insufficient" as const };
    }

    const fromSub = Math.min(sub, amount);
    const fromPur = amount - fromSub;

    const newSub = sub - fromSub;
    const newPur = pur - fromPur;
    const newTotal = newSub + newPur;
    const newLifetimeUsed = row.lifetime_credits_used + amount;

    await tx
      .update(userCredits)
      .set({
        subscriptionCredits: newSub,
        purchasedCredits: newPur,
        lifetimeCreditsUsed: newLifetimeUsed,
        updatedAt: new Date(),
      })
      .where(eq(userCredits.userId, userId));

    const bucket = fromSub > 0 && fromPur > 0 ? "mixed" : fromSub > 0 ? "subscription" : "purchased";

    await tx.insert(creditTransactions).values({
      userId,
      delta: -amount,
      reason,
      bucket,
      source: null,
      balanceAfter: newTotal,
      metadata: metadata ? metadata : null,
    });

    return {
      ok: true,
      balanceAfter: newTotal,
      spentFromSubscription: fromSub,
      spentFromPurchased: fromPur,
    };
  });
}

/**
 * Grant subscription credits — RESETS the subscription bucket to `amount`.
 * Called from RevenueCat INITIAL_PURCHASE and RENEWAL webhooks.
 * Does not touch purchased bucket.
 */
export async function grantSubscriptionCredits(
  userId: string,
  amount: number,
  reason: GrantReason,
  source?: string,
  metadata?: Record<string, unknown>,
): Promise<{ ok: true; balanceAfter: number }> {
  if (amount < 0) throw new Error("amount must be non-negative");
  await getOrCreateUserCredits(userId);

  return await db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT 1 FROM user_credits WHERE user_id = ${userId} FOR UPDATE`
    );

    await tx
      .update(userCredits)
      .set({
        subscriptionCredits: amount,
        monthlyCreditsResetAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userCredits.userId, userId));

    const after = await tx.select().from(userCredits).where(eq(userCredits.userId, userId)).limit(1);
    const total = (after[0]?.subscriptionCredits ?? 0) + (after[0]?.purchasedCredits ?? 0);

    await tx.insert(creditTransactions).values({
      userId,
      delta: amount,
      reason,
      bucket: "subscription",
      source: source ?? null,
      balanceAfter: total,
      metadata: metadata ? metadata : null,
    });

    return { ok: true, balanceAfter: total };
  });
}

/**
 * Add credits to the purchased bucket (top-up packs). These never expire.
 */
export async function grantPurchasedCredits(
  userId: string,
  amount: number,
  source: string,
  metadata?: Record<string, unknown>,
): Promise<{ ok: true; balanceAfter: number }> {
  if (amount <= 0) throw new Error("amount must be positive");
  await getOrCreateUserCredits(userId);

  return await db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT 1 FROM user_credits WHERE user_id = ${userId} FOR UPDATE`
    );

    await tx
      .update(userCredits)
      .set({
        purchasedCredits: sql`${userCredits.purchasedCredits} + ${amount}`,
        lifetimeCreditsPurchased: sql`${userCredits.lifetimeCreditsPurchased} + ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(userCredits.userId, userId));

    const after = await tx.select().from(userCredits).where(eq(userCredits.userId, userId)).limit(1);
    const total = (after[0]?.subscriptionCredits ?? 0) + (after[0]?.purchasedCredits ?? 0);

    await tx.insert(creditTransactions).values({
      userId,
      delta: amount,
      reason: "purchase",
      bucket: "purchased",
      source,
      balanceAfter: total,
      metadata: metadata ? metadata : null,
    });

    return { ok: true, balanceAfter: total };
  });
}

/**
 * Refund credits (negative grant). Used when RevenueCat sends a REFUND event.
 * Refunds from purchased bucket (subscription credits are time-bounded anyway).
 */
export async function refundCredits(
  userId: string,
  amount: number,
  source: string,
  metadata?: Record<string, unknown>,
): Promise<{ ok: true; balanceAfter: number }> {
  if (amount <= 0) throw new Error("amount must be positive");
  await getOrCreateUserCredits(userId);

  return await db.transaction(async (tx) => {
    // Read locked row so we can compute the exact deducted amount. If the user
    // already spent some/all of the refunded credits, we can only claw back
    // what's still in the bucket — we never go negative.
    const lockedRows = await tx.execute(
      sql`SELECT purchased_credits FROM user_credits WHERE user_id = ${userId} FOR UPDATE`
    );
    const lockedRow = lockedRows.rows[0] as { purchased_credits: number } | undefined;
    const currentPurchased = lockedRow?.purchased_credits ?? 0;
    const actualDeducted = Math.min(currentPurchased, amount);
    const unrecovered = amount - actualDeducted;

    await tx
      .update(userCredits)
      .set({
        purchasedCredits: sql`${userCredits.purchasedCredits} - ${actualDeducted}`,
        updatedAt: new Date(),
      })
      .where(eq(userCredits.userId, userId));

    const after = await tx.select().from(userCredits).where(eq(userCredits.userId, userId)).limit(1);
    const total = (after[0]?.subscriptionCredits ?? 0) + (after[0]?.purchasedCredits ?? 0);

    // Record the ACTUAL deducted amount so the ledger reconciles to the
    // balance. Preserve the requested amount and any unrecovered shortfall
    // in metadata for finance / dispute audit.
    const refundMetadata: Record<string, unknown> = {
      ...(metadata ?? {}),
      requestedAmount: amount,
      actualDeducted,
      unrecoveredAmount: unrecovered,
    };

    await tx.insert(creditTransactions).values({
      userId,
      delta: -actualDeducted,
      reason: "refund",
      bucket: "purchased",
      source,
      balanceAfter: total,
      metadata: refundMetadata,
    });

    return { ok: true, balanceAfter: total };
  });
}

/**
 * Check that the user has at least `amount` credits available without
 * spending them. Use this to gate UI affordances; the actual spend
 * still uses spendCredits() which re-checks atomically.
 */
export async function canSpend(userId: string, amount: number): Promise<boolean> {
  const bal = await getBalance(userId);
  return bal.total >= amount;
}

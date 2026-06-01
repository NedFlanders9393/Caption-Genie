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
  deviceFreeCredits,
  users,
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
 * Look up the credits row for a user, creating it on first access with
 * ZERO credits. Free credits are granted separately via claimFreeCredits()
 * after device-fingerprint validation, to prevent account-farming.
 */
export async function getOrCreateUserCredits(userId: string): Promise<UserCredits> {
  if (!userId) throw new Error("userId required");

  const existing = await db.select().from(userCredits).where(eq(userCredits.userId, userId)).limit(1);
  if (existing[0]) return existing[0];

  await db
    .insert(userCredits)
    .values({
      userId,
      subscriptionCredits: 0,
      purchasedCredits: 0,
      lifetimeCreditsUsed: 0,
      lifetimeCreditsPurchased: 0,
    })
    .onConflictDoNothing();

  const created = await db.select().from(userCredits).where(eq(userCredits.userId, userId)).limit(1);
  if (!created[0]) throw new Error("Failed to create user_credits row");
  return created[0];
}

/**
 * Attempt to claim the one-time free signup bonus for a device.
 * Each physical device (identified by iOS Vendor ID or a stored UUID) may
 * only claim credits once — regardless of how many accounts are created.
 *
 * Returns { granted: number, alreadyClaimed: boolean }
 */
export async function claimFreeCredits(
  userId: string,
  deviceId: string,
  userEmail?: string,
): Promise<{ granted: number; alreadyClaimed: boolean; blockedReason?: string }> {
  if (!userId) throw new Error("userId required");
  if (!deviceId || deviceId.trim().length < 4) {
    return { granted: 0, alreadyClaimed: false, blockedReason: "invalid_device_id" };
  }

  const cleanDeviceId = deviceId.trim().toLowerCase();

  // Disposable email domain check
  if (userEmail) {
    const domain = userEmail.split("@")[1]?.toLowerCase() ?? "";
    if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
      return { granted: 0, alreadyClaimed: false, blockedReason: "disposable_email" };
    }
  }

  // Check if this device has already claimed free credits
  const existing = await db
    .select()
    .from(deviceFreeCredits)
    .where(eq(deviceFreeCredits.deviceId, cleanDeviceId))
    .limit(1);

  if (existing[0]) {
    return { granted: 0, alreadyClaimed: true };
  }

  // Ensure the user has a credits row
  await getOrCreateUserCredits(userId);

  // Atomically record device claim + grant credits
  return await db.transaction(async (tx) => {
    // Insert device record (idempotent — ON CONFLICT means we only win once)
    const inserted = await tx
      .insert(deviceFreeCredits)
      .values({ deviceId: cleanDeviceId, userId })
      .onConflictDoNothing()
      .returning({ deviceId: deviceFreeCredits.deviceId });

    if (inserted.length === 0) {
      // Another concurrent request won the race
      return { granted: 0, alreadyClaimed: true };
    }

    // Grant the credits
    await tx
      .update(userCredits)
      .set({
        subscriptionCredits: sql`${userCredits.subscriptionCredits} + ${FREE_SIGNUP_CREDITS}`,
        updatedAt: new Date(),
      })
      .where(eq(userCredits.userId, userId));

    const after = await tx.select().from(userCredits).where(eq(userCredits.userId, userId)).limit(1);
    const total = (after[0]?.subscriptionCredits ?? 0) + (after[0]?.purchasedCredits ?? 0);

    await tx.insert(creditTransactions).values({
      userId,
      delta: FREE_SIGNUP_CREDITS,
      reason: "signup_bonus",
      bucket: "subscription",
      source: cleanDeviceId,
      balanceAfter: total,
      metadata: { deviceId: cleanDeviceId },
    });

    // Store deviceId on the user record for future reference
    await tx
      .update(users)
      .set({ deviceId: cleanDeviceId })
      .where(eq(users.id, userId));

    return { granted: FREE_SIGNUP_CREDITS, alreadyClaimed: false };
  });
}

const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "guerrillamail.info", "guerrillamailblock.com",
  "grr.la", "sharklasers.com", "spam4.me", "10minutemail.com", "temp-mail.org",
  "throwaway.email", "yopmail.com", "yopmail.fr", "trashmail.com", "trashmail.me",
  "trashmail.net", "trashmail.io", "trashmail.at", "maildrop.cc", "dispostable.com",
  "fakeinbox.com", "mailnull.com", "spamgourmet.com", "spamgourmet.net", "tempinbox.com",
  "binkmail.com", "bob.email", "mailsac.com", "getnada.com", "tempr.email",
  "discard.email", "throwam.com", "mytempemail.com", "mohmal.com", "mailforspam.com",
  "tempail.com", "spamex.com", "getairmail.com", "filzmail.com", "shitmail.me",
  "mailexpire.com", "inboxalias.com", "cool.fr.nf", "jetable.fr.nf", "nospam.ze.tc",
  "nomail.xl.cx", "mega.zik.dj", "speed.1s.fr", "courriel.fr.nf", "moncourrier.fr.nf",
]);

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

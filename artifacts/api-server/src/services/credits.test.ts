/**
 * Integration tests for the unified credit system.
 *
 * These run against the real Postgres database (DATABASE_URL) because the
 * money-critical logic lives in SQL transactions with SELECT ... FOR UPDATE —
 * mocking the DB would test a fiction. Every test uses unique, prefixed user /
 * device ids and cleans them up afterwards, so it is safe to run against the
 * development database without touching real users.
 *
 * Coverage (the paths where a regression would silently overcharge or block
 * real users):
 *  - brand-new guest gets the free allowance and can generate
 *  - guest monthly reset (no rollover) and same-month no-op
 *  - signed-in renewal only fires for accounts that claimed the signup bonus
 *  - Pro and "unknown" (RevenueCat outage) statuses never mutate credits
 *  - a Pro-sized balance is never reset even if mis-classified as free
 *  - 1 credit is charged per caption set, and an empty balance is "insufficient"
 *    (the condition the route turns into an HTTP 402 -> paywall)
 */
import { describe, it, expect, afterEach, afterAll } from "vitest";
import express, { type Express } from "express";
import request from "supertest";
import { clerkMiddleware } from "@clerk/express";
import { db, pool } from "@workspace/db";
import { userCredits, creditTransactions, deviceFreeCredits } from "@workspace/db/schema";
import { eq, inArray, and } from "drizzle-orm";
import {
  ensureMonthlyFreeAllowance,
  spendCredits,
  getBalance,
  FREE_MONTHLY_CREDITS,
} from "./credits.js";
import captionsRouter from "../routes/captions.js";

// A calendar month firmly in the past so the "new month" branch always fires.
const PAST_MONTH = new Date(Date.UTC(2020, 0, 15));

const createdUserIds: string[] = [];
const createdDeviceIds: string[] = [];

function uid(): string {
  return `vitest_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function newUserId(): string {
  const id = uid();
  createdUserIds.push(id);
  return id;
}

function newGuestId(): string {
  const id = `guest_${uid()}`;
  createdUserIds.push(id);
  return id;
}

function newDeviceId(): string {
  const id = uid();
  createdDeviceIds.push(id);
  return id;
}

/** Insert (or overwrite) a credits row with an exact balance + reset date. */
async function seedRow(userId: string, subscription: number, resetAt: Date): Promise<void> {
  if (!createdUserIds.includes(userId)) createdUserIds.push(userId);
  await db
    .insert(userCredits)
    .values({
      userId,
      subscriptionCredits: subscription,
      purchasedCredits: 0,
      monthlyCreditsResetAt: resetAt,
    })
    .onConflictDoUpdate({
      target: userCredits.userId,
      set: { subscriptionCredits: subscription, monthlyCreditsResetAt: resetAt },
    });
}

async function setResetDate(userId: string, date: Date): Promise<void> {
  await db.update(userCredits).set({ monthlyCreditsResetAt: date }).where(eq(userCredits.userId, userId));
}

/** Simulate a prior signup-bonus claim for a signed-in account. */
async function seedDeviceClaim(userId: string, deviceId: string): Promise<void> {
  if (!createdDeviceIds.includes(deviceId)) createdDeviceIds.push(deviceId);
  await db.insert(deviceFreeCredits).values({ deviceId, userId }).onConflictDoNothing();
}

afterEach(async () => {
  if (createdUserIds.length) {
    await db.delete(creditTransactions).where(inArray(creditTransactions.userId, createdUserIds));
    await db.delete(deviceFreeCredits).where(inArray(deviceFreeCredits.userId, createdUserIds));
    await db.delete(userCredits).where(inArray(userCredits.userId, createdUserIds));
  }
  if (createdDeviceIds.length) {
    await db.delete(deviceFreeCredits).where(inArray(deviceFreeCredits.deviceId, createdDeviceIds));
  }
  createdUserIds.length = 0;
  createdDeviceIds.length = 0;
});

afterAll(async () => {
  await pool.end();
});

describe("ensureMonthlyFreeAllowance — guests", () => {
  it("grants the free allowance to a brand-new guest, who can then generate", async () => {
    const guest = newGuestId();

    await ensureMonthlyFreeAllowance(guest, "free");

    const balance = await getBalance(guest);
    expect(balance.subscription).toBe(FREE_MONTHLY_CREDITS);
    expect(balance.total).toBe(FREE_MONTHLY_CREDITS);

    const spend = await spendCredits(guest, 1, "generation");
    expect(spend.ok).toBe(true);
    expect(spend.balanceAfter).toBe(FREE_MONTHLY_CREDITS - 1);
  });

  it("resets to the free allowance on a new month with NO rollover", async () => {
    const guest = newGuestId();
    await ensureMonthlyFreeAllowance(guest, "free"); // -> 10
    await spendCredits(guest, 7, "generation"); // -> 3 remaining
    await setResetDate(guest, PAST_MONTH); // pretend the grant was last month

    await ensureMonthlyFreeAllowance(guest, "free");

    const balance = await getBalance(guest);
    // Reset to exactly 10, not 3 (lost) and not 13 (rolled over).
    expect(balance.subscription).toBe(FREE_MONTHLY_CREDITS);
  });

  it("is a no-op for a guest already current this month", async () => {
    const guest = newGuestId();
    await ensureMonthlyFreeAllowance(guest, "free"); // -> 10
    await spendCredits(guest, 4, "generation"); // -> 6 remaining

    await ensureMonthlyFreeAllowance(guest, "free"); // same month: do nothing

    const balance = await getBalance(guest);
    expect(balance.subscription).toBe(6);
  });
});

describe("ensureMonthlyFreeAllowance — signed-in users", () => {
  it("does NOT renew an account that never claimed the signup bonus", async () => {
    const user = newUserId();
    await seedRow(user, 2, PAST_MONTH); // last month, no device claim

    await ensureMonthlyFreeAllowance(user, "free");

    const balance = await getBalance(user);
    expect(balance.subscription).toBe(2); // untouched — no claim on file
  });

  it("renews an account that DID claim the signup bonus when a new month rolls over", async () => {
    const user = newUserId();
    const device = newDeviceId();
    await seedRow(user, 2, PAST_MONTH);
    await seedDeviceClaim(user, device);

    await ensureMonthlyFreeAllowance(user, "free");

    const balance = await getBalance(user);
    expect(balance.subscription).toBe(FREE_MONTHLY_CREDITS);
  });

  it("does not double-grant a claimed account within the same month", async () => {
    const user = newUserId();
    const device = newDeviceId();
    await seedRow(user, 4, new Date()); // already current month
    await seedDeviceClaim(user, device);

    await ensureMonthlyFreeAllowance(user, "free");

    const balance = await getBalance(user);
    expect(balance.subscription).toBe(4); // same month -> untouched
  });
});

describe("ensureMonthlyFreeAllowance — Pro / RevenueCat safety", () => {
  it("never mutates credits for a confirmed Pro user", async () => {
    const user = newUserId();
    await seedRow(user, 150, PAST_MONTH);

    await ensureMonthlyFreeAllowance(user, "pro");

    const balance = await getBalance(user);
    expect(balance.subscription).toBe(150);
  });

  it("never resets a Pro user spent down to <=10 when status is 'unknown' (RC outage)", async () => {
    const user = newUserId();
    // The dangerous case: a Pro user has spent down to a free-sized balance and
    // hits a month boundary during a RevenueCat outage (status cannot be read).
    await seedRow(user, 5, PAST_MONTH);

    await ensureMonthlyFreeAllowance(user, "unknown");

    const balance = await getBalance(user);
    expect(balance.subscription).toBe(5); // must NOT be reset to 10
  });

  it("never resets a Pro-sized (>10) balance even if mis-classified as 'free'", async () => {
    const user = newUserId();
    await seedRow(user, 150, PAST_MONTH);

    // Even with a (wrong) confident "free", the >FREE_MONTHLY_CREDITS guard holds.
    await ensureMonthlyFreeAllowance(user, "free");

    const balance = await getBalance(user);
    expect(balance.subscription).toBe(150);
  });
});

describe("spendCredits — caption set cost and empty balance", () => {
  it("charges exactly 1 credit per caption set and records the ledger entry", async () => {
    const guest = newGuestId();
    await ensureMonthlyFreeAllowance(guest, "free"); // -> 10

    const spend = await spendCredits(guest, 1, "generation");
    expect(spend.ok).toBe(true);
    expect(spend.spentFromSubscription).toBe(1);
    expect(spend.balanceAfter).toBe(FREE_MONTHLY_CREDITS - 1);

    const tx = await db
      .select()
      .from(creditTransactions)
      .where(and(eq(creditTransactions.userId, guest), eq(creditTransactions.reason, "generation")));
    expect(tx).toHaveLength(1);
    expect(tx[0]!.delta).toBe(-1);
  });

  it("reports 'insufficient' at zero balance — the condition the route maps to HTTP 402", async () => {
    const user = newUserId();
    await seedRow(user, 0, new Date()); // empty balance, current month

    const spend = await spendCredits(user, 1, "generation");
    expect(spend.ok).toBe(false);
    expect(spend.reason).toBe("insufficient");

    const balance = await getBalance(user);
    expect(balance.total).toBe(0); // nothing was deducted
  });
});

/**
 * End-to-end HTTP test of the credit gate. We mount the real captions router on
 * a minimal Express app (no Anthropic call happens because the 402 short-circuits
 * before generation) and hit it as a GUEST via the X-Device-Id header — the same
 * path a signed-out user takes. A guest at zero balance must get HTTP 402 with
 * the insufficient_credits payload the mobile app maps to the paywall.
 */
function buildTestApp(): Express {
  const app = express();
  app.use(express.json());
  // resolveIdentity() calls getAuth(req), which requires clerkMiddleware to have
  // run; with no auth token it simply resolves to a signed-out (guest) request.
  app.use(
    clerkMiddleware(() => ({ publishableKey: process.env.CLERK_PUBLISHABLE_KEY })),
  );
  app.use("/api", captionsRouter);
  return app;
}

describe("POST /api/captions/generate — credit gate (HTTP)", () => {
  it("returns HTTP 402 insufficient_credits for a guest at zero balance", async () => {
    const app = buildTestApp();
    const device = newDeviceId();
    const guest = `guest_${device}`;
    createdUserIds.push(guest);

    // Seed an empty balance for THIS calendar month so the monthly top-up is a
    // no-op and the spend genuinely fails (mirrors a guest who used all 10).
    await seedRow(guest, 0, new Date());

    const res = await request(app)
      .post("/api/captions/generate")
      .set("X-Device-Id", device)
      .send({
        niche: "Food & Beverage",
        postDescription: "new coffee blend launch",
        tone: "Casual",
        platform: "Instagram",
        postType: "Product Launch",
      });

    expect(res.status).toBe(402);
    expect(res.body.error).toBe("insufficient_credits");

    // The gate must not have deducted anything below zero.
    const balance = await getBalance(guest);
    expect(balance.total).toBe(0);
  });
});

/**
 * Daily check-in streak rewards.
 *
 * Users claim a small credit reward once per UTC day. Consecutive days build
 * a 7-day streak cycle: days 1-6 pay +1 credit, day 7 pays the +3 weekly
 * bonus, then the cycle restarts. Missing a day resets the streak to day 1.
 *
 * Anti-cheat: the SERVER clock (UTC) decides what "today" is, and claims are
 * recorded per (user, UTC day) with a composite primary key — so changing the
 * phone clock or double-tapping can never produce a second grant for a day.
 *
 * Rewards land in the PURCHASED bucket so they never expire and are never
 * clobbered by the monthly free-allowance reset (which only touches the
 * subscription bucket). lifetimeCreditsPurchased is NOT incremented — that
 * counter is reserved for real money purchases.
 */
import { db } from "@workspace/db";
import { dailyCheckins, userCredits, creditTransactions } from "@workspace/db/schema";
import { desc, eq, sql, and, gte, lte } from "drizzle-orm";

/** Reward for each streak day (index 0 = day 1). Day 7 is the weekly bonus. */
export const CHECKIN_REWARDS = [1, 1, 1, 1, 1, 1, 3] as const;

function utcDateString(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate()
  ).padStart(2, "0")}`;
}

function addDaysUtc(dateStr: string, days: number): string {
  const [y, m, day] = dateStr.split("-").map(Number);
  const d = new Date(Date.UTC(y!, m! - 1, day! + days));
  return utcDateString(d);
}

export interface CheckinStatus {
  todayUtc: string;
  claimedToday: boolean;
  /** 1..7 — the streak position the NEXT claim will land on. */
  nextStreakDay: number;
  /** Credits the next claim will grant. */
  nextReward: number;
  /** Consecutive-day streak count as of the latest claim (0 if none/broken). */
  currentStreak: number;
  /** Reward schedule for the full 7-day cycle. */
  rewards: number[];
  /** All claimed UTC dates in the current UTC month ("YYYY-MM-DD"). */
  claimedDatesThisMonth: string[];
}

interface LatestClaim {
  claimDate: string;
  streakDay: number;
}

async function getLatestClaim(userId: string): Promise<LatestClaim | null> {
  const rows = await db
    .select({ claimDate: dailyCheckins.claimDate, streakDay: dailyCheckins.streakDay })
    .from(dailyCheckins)
    .where(eq(dailyCheckins.userId, userId))
    .orderBy(desc(dailyCheckins.claimDate))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Compute the streak position (1..7) that a claim on `today` would land on,
 * given the user's latest claim.
 */
function computeNextStreakDay(latest: LatestClaim | null, today: string): number {
  if (!latest) return 1;
  const yesterday = addDaysUtc(today, -1);
  if (latest.claimDate === yesterday) {
    return (latest.streakDay % 7) + 1;
  }
  if (latest.claimDate === today) {
    // Already claimed — the next OPEN claim is tomorrow's position.
    return (latest.streakDay % 7) + 1;
  }
  return 1; // streak broken
}

export async function getCheckinStatus(userId: string): Promise<CheckinStatus> {
  const now = new Date();
  const today = utcDateString(now);
  const monthStart = `${today.slice(0, 7)}-01`;
  const monthEnd = `${today.slice(0, 7)}-31`;

  const [latest, monthRows] = await Promise.all([
    getLatestClaim(userId),
    db
      .select({ claimDate: dailyCheckins.claimDate, streakDay: dailyCheckins.streakDay })
      .from(dailyCheckins)
      .where(
        and(
          eq(dailyCheckins.userId, userId),
          gte(dailyCheckins.claimDate, monthStart),
          lte(dailyCheckins.claimDate, monthEnd)
        )
      ),
  ]);

  const claimedToday = latest?.claimDate === today;
  const nextStreakDay = computeNextStreakDay(latest, today);

  // Current streak length: only meaningful if the chain reaches today or
  // yesterday; otherwise it's broken and reads 0.
  let currentStreak = 0;
  if (latest && (latest.claimDate === today || latest.claimDate === addDaysUtc(today, -1))) {
    currentStreak = latest.streakDay;
  }

  return {
    todayUtc: today,
    claimedToday,
    nextStreakDay,
    nextReward: CHECKIN_REWARDS[nextStreakDay - 1]!,
    currentStreak,
    rewards: [...CHECKIN_REWARDS],
    claimedDatesThisMonth: monthRows.map((r) => r.claimDate).sort(),
  };
}

export interface ClaimResult {
  ok: boolean;
  alreadyClaimed: boolean;
  granted: number;
  streakDay: number;
  balanceAfter: number | null;
}

export async function claimDailyCheckin(userId: string): Promise<ClaimResult> {
  if (!userId) throw new Error("userId required");
  const today = utcDateString(new Date());

  // Ensure the credits row exists before we lock it inside the transaction.
  await db
    .insert(userCredits)
    .values({ userId, subscriptionCredits: 0, purchasedCredits: 0 })
    .onConflictDoNothing();

  return await db.transaction(async (tx) => {
    // Lock the credits row first — serializes concurrent claims for this user
    // so the streak read below is race-free.
    await tx.execute(sql`SELECT 1 FROM user_credits WHERE user_id = ${userId} FOR UPDATE`);

    const latestRows = await tx
      .select({ claimDate: dailyCheckins.claimDate, streakDay: dailyCheckins.streakDay })
      .from(dailyCheckins)
      .where(eq(dailyCheckins.userId, userId))
      .orderBy(desc(dailyCheckins.claimDate))
      .limit(1);
    const latest = latestRows[0] ?? null;

    if (latest?.claimDate === today) {
      return { ok: false, alreadyClaimed: true, granted: 0, streakDay: latest.streakDay, balanceAfter: null };
    }

    const streakDay = computeNextStreakDay(latest, today);
    const reward = CHECKIN_REWARDS[streakDay - 1]!;

    // Composite PK (user_id, claim_date) is the hard idempotency backstop.
    const inserted = await tx
      .insert(dailyCheckins)
      .values({ userId, claimDate: today, streakDay, creditsGranted: reward })
      .onConflictDoNothing()
      .returning({ claimDate: dailyCheckins.claimDate });

    if (inserted.length === 0) {
      return { ok: false, alreadyClaimed: true, granted: 0, streakDay, balanceAfter: null };
    }

    // Grant to the purchased bucket (never expires, never reset). Do NOT bump
    // lifetimeCreditsPurchased — that tracks real money purchases only.
    await tx
      .update(userCredits)
      .set({
        purchasedCredits: sql`${userCredits.purchasedCredits} + ${reward}`,
        updatedAt: new Date(),
      })
      .where(eq(userCredits.userId, userId));

    const after = await tx.select().from(userCredits).where(eq(userCredits.userId, userId)).limit(1);
    const total = (after[0]?.subscriptionCredits ?? 0) + (after[0]?.purchasedCredits ?? 0);

    await tx.insert(creditTransactions).values({
      userId,
      delta: reward,
      reason: "daily_checkin",
      bucket: "purchased",
      source: null,
      balanceAfter: total,
      metadata: { streakDay, claimDate: today },
    });

    return { ok: true, alreadyClaimed: false, granted: reward, streakDay, balanceAfter: total };
  });
}

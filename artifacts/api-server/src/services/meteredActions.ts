/**
 * Per-user monthly caps for free-but-metered AI actions (hashtags, remix).
 *
 * These actions don't cost a credit — that keeps the "hashtags are free"
 * promise — but they DO call the AI, so leaving them unlimited is an abuse
 * vector. We cap them per identity per calendar month, enforced server-side.
 *
 * Identity is the same key used everywhere else: a Clerk user id, or
 * `guest_<deviceId>` for signed-out users.
 */
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

export type MeteredAction = "hashtags" | "remix";

function getYearMonth(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function envNumber(key: string, fallback: number): number {
  const raw = process.env[key];
  if (raw == null || raw.trim() === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

// Default monthly caps. Free users get a generous allowance that still stops
// scripted abuse; Pro users get a much higher ceiling. Override via env.
const CAPS: Record<MeteredAction, { freeEnv: string; freeDefault: number; proEnv: string; proDefault: number }> = {
  hashtags: { freeEnv: "HASHTAGS_MONTHLY_CAP_FREE", freeDefault: 25, proEnv: "HASHTAGS_MONTHLY_CAP_PRO", proDefault: 300 },
  remix: { freeEnv: "REMIX_MONTHLY_CAP_FREE", freeDefault: 25, proEnv: "REMIX_MONTHLY_CAP_PRO", proDefault: 300 },
};

export function getCap(action: MeteredAction, isPro: boolean): number {
  const c = CAPS[action];
  return isPro ? envNumber(c.proEnv, c.proDefault) : envNumber(c.freeEnv, c.freeDefault);
}

export interface MeteredResult {
  allowed: boolean;
  count: number;
  cap: number;
  /** Roll the counter back by one — call if the AI call fails downstream. */
  rollback: () => Promise<void>;
}

/**
 * Atomically increment the monthly counter for a metered action and check it
 * against the cap. Mirrors the monthly_usage upsert+rollback pattern so a
 * blocked or failed request never permanently consumes the user's allowance.
 */
export async function consumeMeteredAction(
  identity: string,
  action: MeteredAction,
  isPro: boolean,
): Promise<MeteredResult> {
  const cap = getCap(action, isPro);
  const yearMonth = getYearMonth();
  const noopRollback = async () => {};

  // cap <= 0 disables the action entirely.
  if (cap <= 0) {
    return { allowed: false, count: 0, cap, rollback: noopRollback };
  }

  const result = await db.execute(
    sql`INSERT INTO metered_action_usage (user_id, year_month, action, count)
        VALUES (${identity}, ${yearMonth}, ${action}, 1)
        ON CONFLICT (user_id, year_month, action)
        DO UPDATE SET count = metered_action_usage.count + 1
        RETURNING count`
  );
  const count = (result.rows[0] as { count: number }).count;

  const rollback = async () => {
    await db
      .execute(
        sql`UPDATE metered_action_usage SET count = GREATEST(0, count - 1)
            WHERE user_id = ${identity} AND year_month = ${yearMonth} AND action = ${action}`
      )
      .catch(() => {});
  };

  if (count > cap) {
    // Over the limit — undo our increment and deny.
    await rollback();
    return { allowed: false, count: cap, cap, rollback: noopRollback };
  }

  return { allowed: true, count, cap, rollback };
}

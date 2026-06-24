/**
 * Cost guardrails: per-call AI cost recording + the master spend-cap
 * circuit breaker.
 *
 * Goal: the app can never run up an AI bill the owner can't cover. Every
 * Claude call records its real token usage and computed dollar cost, and
 * before each call we check accumulated spend against owner-configured
 * daily / monthly ceilings. If we're over the cap, the request is paused
 * gracefully (the route returns a friendly 503) instead of calling the AI.
 */
import { db } from "@workspace/db";
import { aiCostEvents } from "@workspace/db/schema";
import { sql } from "drizzle-orm";
import type { Request } from "express";

export type AiAction = "generate" | "regenerate" | "hashtags" | "remix";
export type Tier = "free" | "pro" | "guest";

/**
 * Per-model pricing in USD per 1,000,000 tokens. THIS IS THE ONE PLACE to
 * update when Anthropic changes prices. Source: Anthropic public pricing.
 *
 *  - claude-haiku-4-5  (FREE tier model):  $1 in / $5 out per MTok
 *  - claude-sonnet-4-6 (PRO tier model):   $3 in / $15 out per MTok
 */
export const MODEL_PRICING: Record<string, { inputPerMTok: number; outputPerMTok: number }> = {
  "claude-haiku-4-5": { inputPerMTok: 1, outputPerMTok: 5 },
  "claude-sonnet-4-6": { inputPerMTok: 3, outputPerMTok: 15 },
};

// If a model id ever slips through unmapped, price it at the most expensive
// known rate so we over-estimate (and trip the cap early) rather than under.
const FALLBACK_PRICING = { inputPerMTok: 3, outputPerMTok: 15 };

const MICROS_PER_USD = 1_000_000;

// Default spend ceilings (USD). Override via env. A maxed-out month of Pro
// users costs only a few dollars each (see COST_MARGINS.md), so these are
// generous safety ceilings, not normal-operation limits.
const DEFAULT_DAILY_CAP_USD = 25;
const DEFAULT_MONTHLY_CAP_USD = 300;

function envNumber(key: string, fallback: number): number {
  const raw = process.env[key];
  if (raw == null || raw.trim() === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/** Daily spend cap in micro-dollars, or null if explicitly disabled (cap=0 → disabled). */
export function dailyCapMicros(): number | null {
  const usd = envNumber("AI_DAILY_SPEND_CAP_USD", DEFAULT_DAILY_CAP_USD);
  return usd <= 0 ? null : Math.round(usd * MICROS_PER_USD);
}

/** Monthly spend cap in micro-dollars, or null if explicitly disabled. */
export function monthlyCapMicros(): number | null {
  const usd = envNumber("AI_MONTHLY_SPEND_CAP_USD", DEFAULT_MONTHLY_CAP_USD);
  return usd <= 0 ? null : Math.round(usd * MICROS_PER_USD);
}

export function computeCostMicros(model: string, inputTokens: number, outputTokens: number): number {
  const p = MODEL_PRICING[model] ?? FALLBACK_PRICING;
  const usd = (inputTokens / 1_000_000) * p.inputPerMTok + (outputTokens / 1_000_000) * p.outputPerMTok;
  return Math.round(usd * MICROS_PER_USD);
}

export function resolveTier(identity: string, isPro: boolean): Tier {
  if (identity.startsWith("guest_")) return "guest";
  return isPro ? "pro" : "free";
}

// ── UTC window boundaries (must match getYearMonth() semantics elsewhere) ──
function startOfUtcDay(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
function startOfUtcMonth(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

// ── In-memory spend accumulator ────────────────────────────────────────────
// Summing the whole table on every request would be wasteful. We cache the
// day/month totals and refresh from the DB at most every TTL ms; recorded
// costs bump the cache immediately so the breaker reacts in real time even
// between refreshes.
interface SpendCache {
  dayKey: string; // YYYY-MM-DD (UTC)
  monthKey: string; // YYYY-MM (UTC)
  dayMicros: number;
  monthMicros: number;
  fetchedAt: number;
}
let spendCache: SpendCache | null = null;
const CACHE_TTL_MS = 15_000;

function dayKey(): string {
  return startOfUtcDay().toISOString().slice(0, 10);
}
function monthKey(): string {
  return startOfUtcMonth().toISOString().slice(0, 7);
}

async function refreshSpendCache(): Promise<SpendCache> {
  const dayStart = startOfUtcDay();
  const monthStart = startOfUtcMonth();

  const [dayRows, monthRows] = await Promise.all([
    db.execute(
      sql`SELECT COALESCE(SUM(cost_micros), 0)::bigint AS total FROM ai_cost_events WHERE created_at >= ${dayStart}`
    ),
    db.execute(
      sql`SELECT COALESCE(SUM(cost_micros), 0)::bigint AS total FROM ai_cost_events WHERE created_at >= ${monthStart}`
    ),
  ]);

  const dayMicros = Number((dayRows.rows[0] as { total: string | number }).total);
  const monthMicros = Number((monthRows.rows[0] as { total: string | number }).total);

  spendCache = {
    dayKey: dayKey(),
    monthKey: monthKey(),
    dayMicros,
    monthMicros,
    fetchedAt: Date.now(),
  };
  return spendCache;
}

async function getFreshCache(): Promise<SpendCache> {
  const now = Date.now();
  if (
    spendCache &&
    spendCache.dayKey === dayKey() &&
    spendCache.monthKey === monthKey() &&
    now - spendCache.fetchedAt < CACHE_TTL_MS
  ) {
    return spendCache;
  }
  return refreshSpendCache();
}

export interface SpendSnapshot {
  dayMicros: number;
  monthMicros: number;
  dailyCapMicros: number | null;
  monthlyCapMicros: number | null;
}

export async function getSpendSnapshot(): Promise<SpendSnapshot> {
  const cache = await getFreshCache();
  return {
    dayMicros: cache.dayMicros,
    monthMicros: cache.monthMicros,
    dailyCapMicros: dailyCapMicros(),
    monthlyCapMicros: monthlyCapMicros(),
  };
}

export interface CapStatus {
  blocked: boolean;
  scope?: "daily" | "monthly";
}

/**
 * Circuit breaker. Returns blocked=true when the current window's spend has
 * reached the configured ceiling. Call this BEFORE charging credits or the
 * AI so a blocked request consumes nothing.
 *
 * Fails OPEN: if the spend lookup errors, we allow the request (a transient
 * DB hiccup must not take the whole app down) but log the failure upstream.
 */
export async function checkSpendCap(): Promise<CapStatus> {
  const daily = dailyCapMicros();
  const monthly = monthlyCapMicros();
  if (daily == null && monthly == null) return { blocked: false };

  const cache = await getFreshCache();
  if (monthly != null && cache.monthMicros >= monthly) return { blocked: true, scope: "monthly" };
  if (daily != null && cache.dayMicros >= daily) return { blocked: true, scope: "daily" };
  return { blocked: false };
}

export interface RecordCostArgs {
  identity: string;
  action: AiAction;
  tier: Tier;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Persist a single AI call's cost and bump the in-memory accumulator so the
 * breaker stays accurate between cache refreshes. Best-effort: never throws.
 * Returns the computed cost in micro-dollars (0 on failure).
 */
export async function recordAiCost(args: RecordCostArgs, req?: Request): Promise<number> {
  const costMicros = computeCostMicros(args.model, args.inputTokens, args.outputTokens);
  try {
    await db.insert(aiCostEvents).values({
      userId: args.identity,
      action: args.action,
      tier: args.tier,
      model: args.model,
      inputTokens: args.inputTokens,
      outputTokens: args.outputTokens,
      costMicros,
    });

    // Bump the live accumulator (only if it's for the current window).
    if (spendCache && spendCache.dayKey === dayKey() && spendCache.monthKey === monthKey()) {
      spendCache.dayMicros += costMicros;
      spendCache.monthMicros += costMicros;
    }
  } catch (err) {
    req?.log.error({ err, action: args.action }, "Failed to record AI cost");
  }
  return costMicros;
}

/** Pull usage from an Anthropic message response defensively. */
export function extractUsage(message: { usage?: { input_tokens?: number; output_tokens?: number } }): {
  inputTokens: number;
  outputTokens: number;
} {
  return {
    inputTokens: message.usage?.input_tokens ?? 0,
    outputTokens: message.usage?.output_tokens ?? 0,
  };
}

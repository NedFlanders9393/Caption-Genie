# CaptionAI — Cost & Margin Review

_Last reviewed: June 24, 2026._

This document explains the unit economics behind CaptionAI's AI spend and the
guardrails that keep the app profitable. It is the reference for setting the
spend caps, per-action monthly caps, and pricing.

## 1. What an AI call actually costs

Every Claude call records real token usage and a computed dollar cost in
`ai_cost_events` (see `lib/db/src/schema/ai_cost.ts`). Cost is computed from
Anthropic's published per-token pricing in **one place**:
`artifacts/api-server/src/services/costGuard.ts` → `MODEL_PRICING`.

| Tier | Model | Input ($/MTok) | Output ($/MTok) |
| ---- | ----- | -------------- | --------------- |
| Free / guest | `claude-haiku-4-5` | $1 | $5 |
| Pro | `claude-sonnet-4-6` | $3 | $15 |

> If Anthropic changes prices, update `MODEL_PRICING` — nothing else needs to change.

### Estimated cost per action

Token counts are approximate, based on the deep prompt system (large system
prompt + niche/platform context in, 3 captions or 30 hashtags out).

| Action | Approx in / out tokens | Free (haiku) | Pro (sonnet) |
| ------ | ---------------------- | ------------ | ------------ |
| Generate (3 captions) | ~2,500 / ~900 | ~$0.0070 | ~$0.0210 |
| Regenerate (1 caption) | ~2,500 / ~350 | ~$0.0043 | ~$0.0128 |
| Hashtags (30 tags) | ~1,800 / ~700 | ~$0.0053 | ~$0.0159 |
| Remix (1 caption) | ~1,200 / ~350 | ~$0.0030 | ~$0.0090 |

These are estimates for planning. The dashboard (`/api/admin/costs`) shows the
**actual** measured spend.

## 2. Per-tier monthly economics

### Free tier
- 10 free generations/month (existing limit).
- Hashtags + remix are free-of-credit but now **metered**: default 25/month each.
- Worst-case AI cost for a maxed-out free user:
  - 10 generations × $0.0070 = **$0.070**
  - 25 hashtags × $0.0053 = **$0.13**
  - 25 remixes × $0.0030 = **$0.075**
  - **≈ $0.28/month** — fully covered by conversion + ads headroom. A free user
    can never run up a meaningful bill.

### Pro tier ($9.99/month, 150 credits)
- 150 generations × $0.0210 = **$3.15** worst case.
- Hashtags + remix metered at 300/month each:
  - 300 × $0.0159 (hashtags) = $4.77
  - 300 × $0.0090 (remix) = $2.70
- Absolute worst case (every allowance maxed): **≈ $10.62/month**, which is just
  above the $9.99 price. **In practice almost no user maxes all three buckets**,
  and median usage is a small fraction of these caps, so blended margin stays
  comfortably positive. The metered caps exist precisely to bound this tail.

### Credit packs (one-time, never expire)
| Pack | Price | $/credit | AI cost/credit (sonnet) | Gross margin |
| ---- | ----- | -------- | ----------------------- | ------------ |
| 10 | $1.99 | $0.199 | ~$0.021 | ~89% |
| 20 | $3.99 | $0.200 | ~$0.021 | ~89% |
| 50 | $8.99 | $0.180 | ~$0.021 | ~88% |
| 200 | $24.99 | $0.125 | ~$0.021 | ~83% |

All packs retain strong gross margin even at the heaviest model.

## 3. Master spend cap (circuit breaker)

A global ceiling protects against runaway cost (bug, abuse, viral spike). Before
every AI call, `checkSpendCap()` compares accumulated spend in the current
UTC day/month window against owner-configured limits. Over the cap → the request
is paused with a friendly 503 and **no** credits/allowance are consumed.

| Env var | Default | Meaning |
| ------- | ------- | ------- |
| `AI_DAILY_SPEND_CAP_USD` | `25` | Daily ceiling. `0` disables. |
| `AI_MONTHLY_SPEND_CAP_USD` | `300` | Monthly ceiling. `0` disables. |

Rationale: at the per-action costs above, $25/day and $300/month represent
thousands of Pro-grade calls — far beyond expected legitimate load early in
launch, but low enough that a runaway loop can't drain the budget. Raise these
as paid usage grows.

## 4. Per-action metered caps

Hashtags and remix don't cost a credit (keeps the "free hashtags" promise) but
are AI-backed, so they have per-user monthly caps to stop unlimited abuse.

| Env var | Default |
| ------- | ------- |
| `HASHTAGS_MONTHLY_CAP_FREE` | `25` |
| `HASHTAGS_MONTHLY_CAP_PRO` | `300` |
| `REMIX_MONTHLY_CAP_FREE` | `25` |
| `REMIX_MONTHLY_CAP_PRO` | `300` |

`0` disables the action entirely. Counts reset on the 1st (UTC) and a failed AI
call rolls the count back.

## 5. Pricing decision

**No price change applied.** Current pricing ($9.99 Pro / 150 credits, packs as
above) holds positive margins under realistic usage once the metered caps bound
the heavy tail. The levers to pull if blended margin slips:

1. Lower the Pro metered caps (hashtags/remix) — biggest tail-cost reduction.
2. Raise Pro price or lower included credits.
3. Shift heavy free-tier actions to haiku only (already the case).

Re-run this review whenever Anthropic pricing changes or the dashboard shows
blended monthly cost approaching revenue.

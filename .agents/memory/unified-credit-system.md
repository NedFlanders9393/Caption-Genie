---
name: Unified credit system (Captly)
description: How free/Pro/guest monthly credits are granted and the two traps when enforcing the credit ledger as the primary gate.
---

# Unified credit system

Single source of truth is the credit ledger (`user_credits`), enforced server-side.
`CREDITS_ENFORCED` defaults ON (env `=false` is only a kill-switch). Free = 10
credits/month, Pro = 150/month, 1 credit per caption set, no rollover (the
subscription bucket is SET, not added, each month).

## Trap 1 — flipping enforcement ON silently breaks guest mode
Guests use a device-derived identity `guest_<deviceId>` (from the `X-Device-Id`
header) and **never** call `claimFreeCredits` (that route requires auth). Under
the old `monthly_usage` gate they still got free generations; under the credit
gate a fresh guest row is created at 0 and gets hard-blocked with HTTP 402.

**Rule:** `ensureMonthlyFreeAllowance` must grant guests their free allowance
*directly* off their identity — initial grant on first row creation + reset each
new calendar month — WITHOUT requiring a `device_free_credits` claim row. The
guest identity already embeds the device, so it is inherently
one-allowance-per-device. Signed-in users still get their initial grant via
`claimFreeCredits` (device-fingerprint anti-farm) and only get *renewals* here.

**Why:** core caption features must work signed-out (Apple Guideline 5.1.1).

## Trap 2 — RevenueCat outage can clobber a Pro balance
A boolean `isPro` collapses "definitely free" and "couldn't reach RevenueCat"
into the same `false`. If a Pro user hits a month boundary during an RC outage,
a boolean-driven free-reset overwrites their 150 with 10 — and a `> free
allowance` guard alone does NOT save a Pro user who has already spent down to
<=10 credits.

**Rule:** Pro detection must be tri-state — `getProStatus -> "pro" | "free" |
"unknown"`. `"unknown"` is returned on any RC fetch error / non-OK response. The
monthly free reset only mutates credits when status is a CONFIDENT `"free"`;
`"pro"` and `"unknown"` are both skipped. Guests short-circuit to `"free"` (they
can never be Pro, and it also avoids a Clerk getUser call that throws on the
synthetic guest id). No-RC-configured is a confident `"free"`. Keep the legacy
`isRevenueCatPro` boolean as a thin `=== "pro"` wrapper for model-selection /
messaging callers; the `> FREE_MONTHLY_CREDITS` guard stays as defense-in-depth.

**Why:** "assume free on error" silently downgrades paying users — fail safe by
never mutating credits when entitlement is uncertain.

## How to apply
Keep all three sync points aligned (server FREE_MONTHLY_CREDITS=10, mobile
profile display constant, PRO_MONTHLY_CREDITS=150). Mobile surfaces an out-of-
credits 402 as `InsufficientCreditsError` → open the paywall, never a generic
error. Do not re-introduce a local client-side generation cap; the server is the
only gate (the local counter/`isOverLimit` are dormant for old-build compat).

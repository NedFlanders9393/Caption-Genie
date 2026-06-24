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
`isRevenueCatPro` returns `false` on any fetch error. If a Pro user hits a month
boundary during an RC outage, the free-reset path would overwrite their 150 with
10.

**Rule:** never reset a subscription bucket whose balance is greater than the
free allowance — a free account never exceeds FREE_MONTHLY_CREDITS, so a larger
balance means a (possibly mis-detected) Pro user. This guard is defense-in-depth
on top of the `isPro` early-return.

## How to apply
Keep all three sync points aligned (server FREE_MONTHLY_CREDITS=10, mobile
profile display constant, PRO_MONTHLY_CREDITS=150). Mobile surfaces an out-of-
credits 402 as `InsufficientCreditsError` → open the paywall, never a generic
error. Do not re-introduce a local client-side generation cap; the server is the
only gate (the local counter/`isOverLimit` are dormant for old-build compat).

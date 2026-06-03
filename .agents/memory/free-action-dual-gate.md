---
name: Free actions across the dual usage gate
description: How "free" (cost=0) features must be handled across the server's two-gate usage model AND the mobile client, so they aren't wrongly blocked/counted.
---

# Free actions (cost=0) must be free on BOTH layers

The caption API gates usage through `enforceUsageLimit(userId, req, res, creditCost)`
which has TWO gates selected by `CREDITS_ENFORCED`:
- Path A (credits ledger) — used when `CREDITS_ENFORCED=true`.
- Path B (legacy `monthly_usage` counter) — used when `false` (the mode current
  TestFlight builds run against).

**The trap:** Path B unconditionally increments + checks `monthly_usage` regardless
of `creditCost`. So passing `cost=0` (e.g. hashtags) is NOT enough to make a feature
free — it still counted against the monthly limit and could 429 once exhausted.

**Rule:** a `cost=0` action must short-circuit to `{ allowed:true }` BEFORE either
path runs. Add/keep the early `if (creditCost === 0) return …` at the top of
`enforceUsageLimit`.

**Client must match server.** The mobile Hashtags screen separately enforced a
local AsyncStorage free-caption limit (`isOverLimit` → Paywall) and called
`consumeGeneration()` per hashtag run — directly contradicting the server's free
intent and double-counting against captions. Whenever the server cost model for an
action changes, audit the mobile screen that calls it: a feature is only truly free
if the server short-circuits cost=0 AND the client neither blocks (`isOverLimit`)
nor decrements (`consumeGeneration`).

**Why:** monetization lives in two places (server gate + mobile local quota); they
drift independently. A backend "this is free" decision silently does nothing if the
client still paywalls/consumes, and vice-versa.

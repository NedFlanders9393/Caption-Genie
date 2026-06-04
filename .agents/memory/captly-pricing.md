---
name: Captly credit pack & Pro pricing model
description: How CaptionAI/Captly credit packs and Pro subscription are priced/gated, and the sync points that must move together.
---

# Captly pricing & credit model

**Strategy (the why):** the owner wants RECURRING revenue, not one-and-done sales.
Packs are deliberately small "top-ups" priced *higher per credit* than the Pro
subscription, so any regular poster is nudged to subscribe ($9.99/mo). Don't "fix"
packs to be a better per-credit deal than Pro — that would cannibalize the subscription.

**Economics:** 1 credit = 1 generation = 3 captions. Pro = 150 credits/month.
Packs: 20 / 50 / 100 credits at $3.99 / $8.99 / $14.99.

**Legacy product-ID trap:** the App Store consumable IDs are
`com.captionai.app.credits.50/.200/.500`. Apple product IDs can't be renamed once
created, so the number in the ID is now a LEGACY LABEL and does NOT equal the granted
amount (.50→20, .200→50, .500→100). Never infer grant size from the ID suffix.

**Three sync points must change together** whenever pack credits/prices change:
- `artifacts/api-server/src/routes/revenuecatWebhook.ts` → `CREDIT_PACK_PRODUCTS` (the authoritative grant amounts)
- `artifacts/captionai-mobile/components/Paywall.tsx` → `TOP_UP_PACKS` (displayed credits/price; needs a new iOS build to reach users)
- `scripts/src/seedRevenueCat.ts` → `CREDIT_PACKS` (RevenueCat product labels/prices)
Plus the real store prices live in App Store Connect (owner edits by hand).

**Two Pro gates — keep both at 150:** `captions.ts` has Path A (credit ledger, live
when env `CREDITS_ENFORCED=true`) and Path B legacy `monthly_usage` gate
(`PRO_MONTHLY_LIMIT`). Keep `PRO_MONTHLY_LIMIT` == `PRO_MONTHLY_CREDITS` (150) so Pro
can't silently revert to the old 500/month if the flag is ever unset, which would also
contradict the "150/month" wording in legal copy (mobile privacy-policy.tsx/terms.tsx,
web legal.tsx).
**Deploy note:** production must have `CREDITS_ENFORCED=true` for the credit gate to be live.

---
name: Captly credit pack & Pro pricing model
description: How CaptionAI/Captly credit packs and Pro subscription are priced/gated, and the sync points that must move together.
---

# Captly pricing & credit model

**Strategy (the why):** the owner wants RECURRING revenue, not one-and-done sales.
Packs are deliberately small "top-ups" priced *higher per credit* than the Pro
subscription, so any regular poster is nudged to subscribe ($9.99/mo). Don't "fix"
packs to be a better per-credit deal than Pro — that would cannibalize the subscription.

**Economics:** 1 credit = 1 generation = 3 captions. Pro = 150 credits/month for $9.99.
Packs: 10 / 20 / 50 / 200 credits at $1.99 / $3.99 / $8.99 / $24.99. The 10/$1.99
is a 4th "impulse" tier on a NEW product ID `com.captionai.app.credits.10` (its
number actually matches the grant). A 500/$49.99 pack was rejected — 500 credits
lasts an active poster ~a year, which cannibalizes the recurring sub at the top end.

**Pack sanity rule (learned):** the small packs must be both *cheaper* and *smaller*
than the monthly sub so they read as no-commitment top-ups (a pack that costs MORE
for FEWER credits than Pro looks broken — that's why 100/$14.99 was dropped). The one
"big stash" pack (200) is allowed to be bigger than the sub, but only if its per-credit
price stays clearly above the sub's (~12¢ vs ~7¢) so Pro is still the best deal.
Owner declined keeping Pro at $14.99 — wants $9.99 to maximize launch signups/reviews,
raise later.

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

**Annual Pro plan (added):** $59.99/yr, SAME 150 credits/month as monthly (do NOT bump
annual credits — at ~$0.021/gen, 200/mo annual is break-even/loss after Apple's cut; 150
keeps a margin). Webhook already grants 150 for any Pro purchase, so no server change. The
real gap is store config: RC `$rc_annual` package points at a PLACEHOLDER store id
(`captionai_pro_annual`), not a real ASC product — so annual won't load until you (1) create
the ASC auto-renew sub `com.captionai.app.pro.yearly` ($59.99/yr) in the existing "Captly Pro
Monthly" group, and (2) re-point the RC annual product to that id. A brand-new subscription is
reviewed with an app binary, so it ships with the next build. Paywall.tsx already shows
monthly+annual (annual default) and self-hides annual when the package is absent.

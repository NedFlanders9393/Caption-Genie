---
name: RevenueCat iOS purchase validation credential
description: Why iOS purchases can fail to complete even when prices display and the offering is fully wired.
---

# RevenueCat iOS app needs an App Store credential or purchases fail validation

For an iOS app in RevenueCat, the offering/packages/products/entitlement can all be
correct AND prices can still display on device (StoreKit fetches prices client-side),
yet **purchases fail at validation** if the RevenueCat iOS app has no App Store
credential configured.

Check via v2 API: `GET /v2/projects/{projectId}/apps/{appId}` → `app_store.subscription_key_configured`
and `app_store.app_store_connect_api_key_configured`. If BOTH are `false`, no validation
credential is set.

**Fix (user action — agent cannot, the secret is Apple-generated):** add ONE of
- **In-App Purchase Key** (recommended): ASC → Users and Access → Integrations → In-App Purchase → generate key → upload .p8 + Key ID + Issuer ID into RevenueCat iOS app.
- **App-Specific Shared Secret** (quick): ASC → app → App Information → App-Specific Shared Secret → paste into RevenueCat iOS app.

**Why:** RevenueCat must verify the StoreKit purchase with Apple's servers; without a
key it cannot, so the buy errors out and entitlement/credits are never granted.

**How to apply:** When the user reports "Buy does nothing" / purchases don't complete
on TestFlight despite the Paid Apps Agreement being Active, check these two flags first.

## Project specifics (CaptionAI / Captly)
- RC project `projafe0b89d`, offering `default` (current) has packages
  `$rc_monthly`, `$rc_annual`, `credits_50/200/500`, entitlement `pro`.
- iOS app id `app1de8a3917f` (bundle `com.captionai.app`). It maps `$rc_monthly`→`com.captionai.app.pro`,
  credit packs→`com.captionai.app.credits.50/200/500`, `$rc_annual`→legacy `captionai_pro_annual`.
- Project has 3 apps (iOS, Android, Test Store) with duplicate/legacy products
  (old `captionai_pro_monthly/annual` ids alongside new `com.captionai.app.*`). Not breaking; cleanup candidate.

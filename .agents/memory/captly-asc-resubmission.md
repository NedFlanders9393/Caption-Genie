---
name: Captly App Store resubmission flow (after rejection)
description: How to resubmit the Captly iOS app for App Review via ASC REST API, including attaching IAPs so they actually get reviewed.
---

# Captly — resubmitting for App Review after a rejection

Context: Apple's 2.1(b) rejection ("IAPs never submitted") happens when the
in-app purchases exist and are READY_TO_SUBMIT with review screenshots, but were
never added as items to the review submission. IAPs are NOT auto-included — you
must add each one as a `reviewSubmissionItem` alongside the app version.

## The flow (all via ASC REST API, ES256 JWT — see captly-asc-api.md)
1. The new binary must be processed in ASC and **attached** to the editable
   appStoreVersion first (PATCH `appStoreVersions/{id}/relationships/build`). A
   build being in TestFlight does NOT attach it. Find it via
   `/v1/builds?filter[app]=&filter[version]=<buildNumber>` once processing finishes.
2. There can be only one open `reviewSubmission` per app/platform. After a
   rejection the old one sits in state `UNRESOLVED_ISSUES`; it must be cleared
   (DELETE the open reviewSubmission, or cancel it) before/so a fresh one can be
   created with `POST /v1/reviewSubmissions` ({platform:IOS, app relationship}).
3. Add items with `POST /v1/reviewSubmissionItems` — one item per resource:
   - the `appStoreVersion`
   - EACH consumable IAP (type `inAppPurchaseV2`)
   - the auto-renewable subscription (type `subscription`)
4. Submit: PATCH `reviewSubmissions/{id}` with `{submitted:true}`.

## Captly's IAP product IDs (state was READY_TO_SUBMIT, review screenshots COMPLETE)
- Consumables: `com.captionai.app.credits.10 / .50 / .200 / .500`
  (note: ASC display names don't match the productId number — legacy labels).
- Subscription: `com.captionai.app.pro` in subscription group "Captly Pro Monthly".

## 2.3.7 pricing-screenshot fix
- The APP_IPHONE_65 set had 5 shots (1–5.png); 4.png was the pricing screenshot
  ("Fair pricing. Credits never expire"). DELETE `/v1/appScreenshots/{id}` (204).
  Min screenshots is satisfied by the remaining 4. Do NOT re-upload the pricing one.

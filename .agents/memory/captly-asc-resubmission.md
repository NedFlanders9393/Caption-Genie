---
name: Captly App Store resubmission flow (after rejection)
description: How to resubmit the Captly iOS app for App Review via ASC REST API, and why the FIRST IAPs/subscription can only be submitted from the App Store Connect website.
---

# Captly — resubmitting for App Review after a rejection

Context: Apple's 2.1(b) rejection ("IAPs never submitted") happens when the
in-app purchases exist and are READY_TO_SUBMIT with review screenshots, but were
never attached to the version that went to review. IAPs are NOT auto-included.

## CRITICAL: the FIRST IAPs/subscription cannot be submitted via the API
- ASC returns `STATE_ERROR.FIRST_CONSUMABLE_MUST_BE_SUBMITTED_ON_VERSION`:
  "The first Consumable In-App Purchase for this app must be submitted for review
  at the same time that you submit an app version." Same rule covers the first
  auto-renewable subscription.
- `reviewSubmissionItems` does **NOT** accept IAPs or subscriptions. Its only valid
  content relationships are `appStoreVersion`, `appStoreVersionExperiment`,
  `appCustomProductPageVersion`, `appEvent` (`inAppPurchaseV2`/`subscription` are
  rejected as "unknown relationship"). The earlier note claiming you add IAPs as
  reviewSubmissionItems was WRONG.
- The dedicated endpoints `POST /v1/inAppPurchaseSubmissions` (rel `inAppPurchaseV2`
  → `inAppPurchases`) and `POST /v1/subscriptionSubmissions` (rel `subscription`)
  only work for **subsequent** purchases AFTER the first batch is approved. For the
  first batch they 409 with FIRST_CONSUMABLE_MUST_BE_SUBMITTED_ON_VERSION.
  CONFIRMED WORKING for subsequent subs: the yearly sub (first sub already approved)
  submitted standalone with a bare POST /v1/subscriptionSubmissions → 201, state
  READY_TO_SUBMIT → WAITING_FOR_REVIEW. No build/version needed.
- **Website version submits do NOT auto-include new READY_TO_SUBMIT subscriptions.**
  After any version submission, verify each new IAP/sub state via API — a version can
  be approved & live while a new sub silently stays READY_TO_SUBMIT (unpurchasable).
- **Therefore the first submission with IAPs/subscription MUST be done on the App
  Store Connect website**: app version page → "In-App Purchases and Subscriptions"
  section → "Select In-App Purchases or Subscriptions" → pick all packs + the
  subscription → Done → Submit for Review. The website attaches them to the version
  and submits everything together atomically; the public API cannot do this atomic
  first bundling. No app rebuild is needed for this — it is pure ASC metadata.

## What the API CAN do to prep the website handoff
1. Attach the processed build to the editable appStoreVersion: PATCH
   `appStoreVersions/{id}/relationships/build`. (TestFlight presence ≠ attached.)
   Verify with GET `.../relationships/build` — the `include=build` field on the
   version often reads NONE even when a build IS attached; trust the relationship
   endpoint.
2. Leave the version in an editable state (PREPARE_FOR_SUBMISSION / REJECTED /
   DEVELOPER_REJECTED) with metadata/screenshots ready.

## Cleanup gotchas
- `reviewSubmissions` does not allow DELETE (403). PATCH `{canceled:true}` only
  works once a submission is SUBMITTED/in-review; a never-submitted
  `READY_FOR_REVIEW` draft returns 409 "Resource is not in cancellable state" and
  cannot be canceled — even after you empty it.
- You CAN remove an item from a draft submission: DELETE
  `/v1/reviewSubmissionItems/{itemId}` (204). Emptying the draft does not detach
  the build. An empty READY_FOR_REVIEW submission is harmless — it acts as the
  active "cart" the website will reuse.

## Captly's IAP product IDs (state READY_TO_SUBMIT, review screenshots COMPLETE)
- Consumables: `com.captionai.app.credits.10 / .50 / .200 / .500`
  (ASC display names don't match the productId number — legacy labels).
- Subscription: `com.captionai.app.pro` in subscription group "Captly Pro Monthly".

## Subscription/IAP compliance checklist (recurring rejection causes)
A resubmission can be rejected for MORE than 5.1.1. A real rejection bundled four:
- **2.3.2 (promoted-IAP image):** if you "promote" an IAP, its App Store
  promotional image cannot be an app screenshot or have hard-to-read text. Safest:
  promote NOTHING — `GET /v1/apps/{id}/promotedPurchases` must return count 0 and
  each IAP's `/v2/inAppPurchases/{id}/images` must be 0. Then 2.3.2 is moot.
- **5.1.1(v):** captions AND purchases must work signed-out (paywall has no
  sign-in gate; calls `purchase()` directly). See captly-guest-mode.md.
- **2.1(a) password bug:** "unable to set any password during account creation" =
  the missing `<View nativeID="clerk-captcha" />` on the sign-up screen. See
  captly-clerk-signup-captcha.md. MUST be live-tested on TestFlight before resubmit.
- **3.1.2(c) auto-renew subscription disclosure** has TWO sides, both required:
  (1) App Store metadata: a functional Terms of Use (EULA) link AND Privacy Policy
  link in the description (privacyPolicyUrl also set on appInfoLocalizations). The
  standard Apple EULA link is https://www.apple.com/legal/internet-services/itunes/dev/stdeula/ .
  (2) In-app on the paywall: subscription title, length (monthly), price (+per-unit),
  and tappable Privacy Policy + Terms of Use links. Apple also asks for a screen
  recording of this in the resubmission reply / App Review notes.

## 2.3.7 pricing-screenshot fix
- The APP_IPHONE_65 set had 5 shots (1–5.png); 4.png was the pricing screenshot
  ("Fair pricing. Credits never expire"). DELETE `/v1/appScreenshots/{id}` (204).
  Min screenshots is satisfied by the remaining 4. Do NOT re-upload the pricing one.

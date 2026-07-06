---
name: Captly App Store Connect REST API
description: How to read/write App Store listing metadata for Captly via the ASC REST API from Node.
---

# Captly — App Store Connect REST API

Used to inspect and fill the App Store listing programmatically (release readiness checks,
description/keywords/URLs, attaching a build) without the ASC web UI.

## Auth (the non-obvious part)
- Reconstruct the .p8 PEM from `ASC_API_KEY_CONTENT` first (secret stores it with newlines
  stripped) — see captly-eas-builds.md. Then `crypto.createPrivateKey(pem)`.
- Sign the ASC JWT with `crypto.sign("sha256", data, { key, dsaEncoding: "ieee-p1363" })`.
  **Why:** `ieee-p1363` yields the raw r||s signature JOSE/ES256 expects — no manual DER→JOSE
  conversion. Header `{alg:"ES256",kid:keyId,typ:"JWT"}`, payload `{iss:issuerId,iat,exp(<=20min),aud:"appstoreconnect-v1"}`.
- Secrets are only in bash env, not the code_execution sandbox — run these scripts via bash.

## Where each listing field lives
- **Description / keywords / promotionalText / supportUrl / marketingUrl** → PATCH
  `appStoreVersionLocalizations/{id}` (per-locale, under the editable appStoreVersion).
- **privacyPolicyUrl** → PATCH `appInfoLocalizations/{id}` (under `apps/{id}/appInfos`, NOT the
  version). Easy to miss because it is a different resource than the other URLs.
- **Attach a build** → PATCH `appStoreVersions/{id}/relationships/build` with
  `{data:{type:"builds",id}}`. Find the build via `/v1/builds?filter[app]=&filter[version]=<buildNumber>`
  (filter[version] = build number string). A build being in TestFlight does NOT auto-attach it to
  the App Store version — must be done explicitly.
- Keywords field max 100 chars (comma-separated), promotionalText max 170, description max 4000.

## Subscriptions — clearing MISSING_METADATA via API
- A new auto-renewable sub needs ALL of: localization (name+description), a review screenshot,
  availability (territories), AND a price **in every available territory** — not just the base.
- **The silent blocker:** setting one base price (e.g. USA $59.99) leaves the sub at
  MISSING_METADATA because it has 1 price while it's available in ~175 territories. The ASC UI
  auto-equalizes; the API does NOT. Fix: GET `/v1/subscriptionPricePoints/{basePointId}/equalizations?include=territory`
  then POST `/v1/subscriptionPrices` (one per territory, `{startDate:null, preserveCurrentPrice:false}`,
  rel: subscription + subscriptionPricePoint). Compare price COUNT vs the live/approved sibling sub
  (same group) to detect this — a healthy sub shows ~175 prices, the broken one shows 1.
- Review screenshot upload = 3 steps: POST `/v1/subscriptionAppStoreReviewScreenshots` (reserve with
  fileName+fileSize+subscription rel) → PUT bytes to each `uploadOperations` url with its requestHeaders
  → PATCH `{uploaded:true, sourceFileChecksum:<md5 hex>}`. Reuse an existing 1284×2778 paywall PNG.
- **State string lags:** after bulk price + screenshot writes, `subscriptions.state` can stay
  MISSING_METADATA for many minutes even though every field is present and matches the approved sibling.
  Don't trust the cached string — compare field-by-field against the approved sub instead.
- First-time sub submission must be finished on the ASC website (can't submit the FIRST review of a
  sub via API) — see captly-asc-resubmission.md. Stage everything via API, leave the final submit to the human.

## Editable appInfo for subtitle/name
- `subtitle`/`name` PATCH on `appInfoLocalizations` returns 409 INVALID_STATE against the
  READY_FOR_SALE appInfo. Creating the new appStoreVersion spawns a SECOND appInfo in
  PREPARE_FOR_SUBMISSION — re-query `apps/{id}/appInfos?include=appInfoLocalizations` and PATCH the
  editable one's localization. So: create the version FIRST, then set subtitle.

## Gotcha
- Limits/age rating: `inAppPurchasesV2` and `ageRatingDeclaration` return 404 when nothing is set
  up yet — treat 404 as "not configured", not an error.
- New appStoreVersion copies forward the previous version's description, keywords, screenshots,
  support/marketing URLs — only whatsNew (and any intentional edits) need setting.

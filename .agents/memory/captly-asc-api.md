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

## Gotcha
- Limits/age rating: `inAppPurchasesV2` and `ageRatingDeclaration` return 404 when nothing is set
  up yet — treat 404 as "not configured", not an error.

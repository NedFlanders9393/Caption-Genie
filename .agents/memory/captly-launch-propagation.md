---
name: App Store "not available in your country or region" after approval
description: How to diagnose the post-approval "App Not Available in your country or region" popup on a freshly-released iOS app.
---

# "App Not Available in your country or region" right after Ready for Distribution

Seen on Captly's first release: version state `READY_FOR_SALE` ("Ready for Distribution"),
`downloadable: true`, yet tapping the apps.apple.com link shows the popup
"This app is currently not available in your country or region" for 24–48h+.

**This is almost always propagation, not a misconfiguration.** First-release propagation
to the storefront CDN can take up to ~72h even after the version flips to READY_FOR_SALE.

## How to verify territory config via ASC API (what actually works)
- `appAvailabilityV2` is a real app relationship, BUT `/v2/appAvailabilities/{appId}` and
  `/v1/apps/{id}/appAvailabilityV2` return 404, and `?filter[app]=` returns 403 with our
  limited-role key. The availability resource has its OWN uuid (not the app id) and our key
  can't list it. A 404/403 here is NOT evidence of a problem.
- Instead read the **price schedule** (always readable):
  - `/v1/appPriceSchedules/{appId}/baseTerritory` → should be `USA`
  - `/v1/appPriceSchedules/{appId}/manualPrices?include=territory` → confirms USA price row
  - `/v1/appPriceSchedules/{appId}/automaticPrices` → ~174 other territories
  If base territory = USA and a USA price row exists, the app IS offered in the US.

## Other real causes (rule out before "just wait")
- **Device Apple-Account region mismatch**: the popup appears verbatim if the signed-in
  Apple Account's country ≠ a territory the app is sold in. Check Settings → [name] →
  Media & Purchases → View Account → Country/Region.
- Future-dated `earliestReleaseDate` (was null here) or releaseType not AFTER_APPROVAL.

## When to escalate
If config is confirmed correct and it's still unavailable after ~72h from READY_FOR_SALE,
contact Apple (App Store Connect → Contact Us) — at that point it's an Apple-side issue.

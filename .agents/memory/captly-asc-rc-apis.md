---
name: ASC + RevenueCat API quirks (Captly)
description: Non-obvious endpoint/field gotchas for reading App Store Connect IAPs and RevenueCat v2 offerings/entitlements.
---

# App Store Connect IAP REST quirks

- **List IAPs:** `GET /v1/apps/{appId}/inAppPurchasesV2` (note the `/v1/` prefix on this
  collection). The intuitive `GET /v2/apps/{appId}/inAppPurchasesV2` returns **404** and
  the `filter[productId]` variant on that path also 404s — do NOT conclude "no IAPs exist"
  from a 404 here; you are on the wrong path.
- **Per-IAP detail / price / review screenshot:** `GET /v2/inAppPurchases/{id}?include=iapPriceSchedule,appStoreReviewScreenshot,inAppPurchaseLocalizations`.
  Price lives via the priceSchedule → manualPrices → inAppPurchasePricePoint chain; review
  screenshot included type is `inAppPurchaseAppStoreReviewScreenshots` (state `COMPLETE`).
- **Product IDs are permanent.** A `POST /v2/inAppPurchases` for an existing/previously-used
  product ID returns 409 `ATTRIBUTE.INVALID.DUPLICATE` even when the wrong list path made it
  look absent. Never assume an ID is free.

# RevenueCat v2 API quirks

- **Auth:** the env `REVENUECAT_SECRET_KEY` is a **legacy** key and is rejected by API v2
  ("trying to use a legacy API key to access API v2"). Use the Replit connector token instead
  (`listConnections('revenuecat')[0].settings.access_token`, same source as
  `getUncachableRevenueCatClient`). Project id `projafe0b89d`; App Store app `app1de8a3917f`.
- **Package products field:** list packages with
  `GET /projects/{proj}/offerings/{off}/packages?expand=items.product`; the attached products
  are under `package.products.items[].product` — NOT `package.items[]`. Reading `items` shows
  0 and falsely looks empty. The nested `.../packages/{id}/products` sub-path 404s; the single
  `.../offerings/{off}/packages/{id}` GET also 404s — only the **list+expand** form works.
- **Entitlement products:** `GET /projects/{proj}/entitlements/{id}/products` (the
  `expand=items.product` on the entitlements list returns undefined product fields).

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

# Creating a NEW ASC subscription via API (2nd+ in an existing group)

- Works via REST (the first-ever sub needed the website, but a 2nd in an existing group is fine):
  `POST /v1/subscriptions` {name, productId, subscriptionPeriod ONE_MONTH/ONE_YEAR, familySharable}
  + `relationships.group` → then `POST /v1/subscriptionLocalizations` (name+description) → set price
  → set availability. New sub starts `MISSING_METADATA`.
- **Price points are per-subscription** and ephemeral: you MUST create the sub first, then
  `GET /v1/subscriptions/{id}/pricePoints?filter[territory]=USA&limit=200` and PAGINATE
  (links.next) to find the customerPrice you want (e.g. "59.99"). Re-fetch the point id
  immediately before `POST /v1/subscriptionPrices` ({preserveCurrentPrice:false} + rels
  subscription + subscriptionPricePoint) — a stale point id 409s `RELATIONSHIP.INVALID`.
- **Availability:** `POST /v1/subscriptionAvailabilities` {availableInNewTerritories:true} +
  `relationships.availableTerritories` = full list from `GET /v1/territories?limit=200` (~175).
- **`MISSING_METADATA` is expected pre-build** — the only missing item is the first-time review
  screenshot, which Apple requires attached *with the app binary at submission*. Don't try to
  "fix" it before the build; it ships with the build.

# RevenueCat v2 API quirks

- **Auth:** the env `REVENUECAT_SECRET_KEY` is a **legacy** key and is rejected by API v2
  ("trying to use a legacy API key to access API v2"). Use the Replit connector token instead
  (`listConnections('revenuecat')[0].settings.access_token`, same source as
  `getUncachableRevenueCatClient`). Project id `projafe0b89d`; App Store app `app1de8a3917f`.
- **`store_identifier` is IMMUTABLE** — `POST /projects/{proj}/products/{id}` rejects it
  ("Additional properties are not allowed"). To re-point a package from a placeholder store id
  to a real one you must CREATE a new product + swap, not patch. `display_name` IS unique per
  app, so first rename the old placeholder (POST products/{id} {display_name}) to free the name,
  then create the real product, then archive the placeholder (POST products/{id}/actions/archive).
- **Package/entitlement wiring endpoints:** attach/detach are `actions/` sub-paths, NOT REST
  verbs on the products collection: `POST /packages/{id}/actions/attach_products`
  {products:[{product_id, eligibility_criteria}]} and `.../actions/detach_products`
  {product_ids:[...]}; `POST /entitlements/{id}/actions/attach_products` /
  `detach_products` {product_ids:[...]}. (`DELETE .../packages/{id}/products/{pid}` 404s,
  `POST .../packages/{id}/products` 405s.) A package holds ONE product per app, so detach the
  old before attaching the new; an entitlement can hold many.
- **Package products field:** list packages with
  `GET /projects/{proj}/offerings/{off}/packages?expand=items.product`; the attached products
  are under `package.products.items[].product` — NOT `package.items[]`. Reading `items` shows
  0 and falsely looks empty. The nested `.../packages/{id}/products` sub-path 404s; the single
  `.../offerings/{off}/packages/{id}` GET also 404s — only the **list+expand** form works.
- **Entitlement products:** `GET /projects/{proj}/entitlements/{id}/products` (the
  `expand=items.product` on the entitlements list returns undefined product fields).

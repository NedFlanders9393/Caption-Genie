# Captly — Next App Store Update (batch everything into ONE build)

_Last updated: June 30, 2026._

**Goal:** ship all pending iOS changes in a single new build + App Store review,
instead of submitting a separate build for each change.

---

## What's going in this build

### 1. New Annual subscription plan
- **Captly Pro Annual — $59.99/year**
- Same benefit as monthly: **150 credits every month** (refreshed monthly), `pro`
  entitlement, advanced AI.
- ~50% cheaper than paying monthly ($9.99 × 12 = $119.88 → $59.99).
- Paywall now shows **Monthly + Annual side by side**, Annual pre-selected with a
  **"SAVE 50%"** badge. _(App code done — `components/Paywall.tsx`.)_

### 2. App Store listing (ASO) — metadata, applied at submission
Live-version metadata can't change without a review, so these go in with this build.

- **Subtitle** (currently EMPTY → fill it):
  ```
  AI Captions & Hashtag Maker
  ```
- **Keywords** (100-char field):
  - OLD: `caption,captions,AI captions,instagram,hashtags,social media,content,marketing,creator`
  - NEW: `ai,caption,captions,hashtag,generator,social,media,instagram,tiktok,reels,post,content,creator,bio`
  - Why: removes the duplicate word "caption", drops wasted spaces after commas,
    and adds higher-traffic terms (generator, tiktok, reels, post, bio).

### 3. Version bump (at build time)
- `app.json`: version `1.0.1` → `1.0.2`, iOS `buildNumber` `37` → `38`.

---

## Store setup — DONE ✅ (staged, awaiting the build to submit)

1. **App Store Connect** — annual auto-renewable subscription **created** inside the
   existing **"Captly Pro Monthly"** group (group id `22067313`):
   - Product ID: `com.captionai.app.pro.yearly` (ASC id `6785966112`)
   - Price: **$59.99/year** (USA base), available in all 175 territories.
   - en-US localization: name "Captly Pro", desc "150 AI caption credits every month, billed yearly".
   - State: `MISSING_METADATA` — this is expected. The only missing item is the
     first-time **review screenshot**, which Apple requires to be attached *with the
     app binary* at submission. A brand-new subscription is reviewed alongside the
     build, so it ships with this build.
2. **RevenueCat** — the `$rc_annual` package and `pro` entitlement now point at the
   real Apple product `com.captionai.app.pro.yearly` (new RC product
   `prodf4b52d349a`). The old placeholder (`captionai_pro_annual`) was renamed and
   archived.
   - The webhook already grants 150 credits for any Pro purchase/renewal — no
     change needed there.
   - Note: the annual option stays hidden in the app until Apple approves the
     subscription (RC returns no price for an unapproved product, and the paywall is
     hardened to require a real priced product). It goes live automatically once the
     build is approved.

---

## Already LIVE (not part of this build — web only)
- Web app rebranded to Captly + "Try it free in browser" fixed (guest device-id).
  Published at https://captura.replit.app.

---

## The one build (needs your go-ahead)
When you approve, the sequence is: finalize the store setup above → bump the version
→ run a **single** EAS production build → submit it with the new subtitle/keywords.
That's the only build needed to ship the annual plan **and** the listing
improvements together.

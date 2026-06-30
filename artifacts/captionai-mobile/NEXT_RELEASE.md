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

## Store setup required before the build (no app build needed for these)
Done in App Store Connect + RevenueCat, then submitted **with** the build:

1. **App Store Connect** → create the annual auto-renewable subscription inside the
   existing **"Captly Pro Monthly"** group (group id `22067313`):
   - Product ID: `com.captionai.app.pro.yearly`
   - Price: **$59.99/year**
   - Same display name family + `pro` entitlement as monthly.
   - Note: a brand-new subscription is reviewed alongside an app binary, so it
     ships with this build.
2. **RevenueCat** → point the existing `$rc_annual` package's Apple product at
   `com.captionai.app.pro.yearly` (it currently points at a placeholder
   `captionai_pro_annual`, which is why the annual option doesn't load yet).
   - The webhook already grants 150 credits for any Pro purchase/renewal — no
     change needed there.

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

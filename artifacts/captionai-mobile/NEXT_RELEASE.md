# Captly — Next App Store Update (batch everything into ONE build)

_Last updated: July 5, 2026._

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

### 2. New "Business / Personal" mode toggle
- A toggle at the top of the Generate screen lets people use Captly **without a
  business**. _(App code done — `app/(tabs)/generate.tsx`, `lib/api.ts`; server
  `artifacts/api-server/src/routes/captions.ts`.)_
- **Business** mode: unchanged — captions tuned to your industry + brand voice.
- **Personal** mode: everyday captions for any photo/moment. Hides the Industry,
  Post Type, and Brand Voice options; uses a separate, non-salesy AI writing style.
- Server is already live (no build needed for the backend); the toggle UI ships
  with this build.

### 3. Onboarding slide for the new toggle
- New first-launch slide ("Business or Personal") explains the two modes so new
  users know they can post without a business. _(App code done — `app/onboarding.tsx`.)_

### 4. App Store listing (ASO) — metadata, applied at submission
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

### 5. Four "quick win" caption features (competitor-inspired)
Small, high-value additions to the Generate screen + each caption card:
1. **Character count + platform limit** — every caption shows a live character
   count against the platform's real limit (e.g. Twitter/X 280, Instagram 2,200),
   turning red when it runs over. _(App code — `components/CaptionCard.tsx`.)_
2. **Edit before copying** — a pencil on each caption lets people tweak the text
   (and hashtags) right in the app before copying/sharing. _(`components/CaptionCard.tsx`.)_
3. **"Must-include" words** — an optional field on the Generate screen where users
   type words/phrases (product, location, sale, @handle) that the AI weaves into
   every caption. _(App `app/(tabs)/generate.tsx` + `lib/api.ts`; server
   `artifacts/api-server/src/routes/captions.ts`; spec `lib/api-spec/openapi.yaml`.)_
4. **Copy caption / copy hashtags separately** — the top copy button still copies
   everything; new footer chips copy just the caption, or just the hashtags (for
   the "hashtags in the first comment" trick). _(`components/CaptionCard.tsx`.)_
- Onboarding "How it works" slide updated to mention must-have words + editing.
- Server change for #3 is already live (no build needed for backend); the UI ships
  with this build.

### 6. Personal-mode upgrades (occasions + stronger anti-ad guardrails)
Makes the "Personal" side sharper and keeps it from ever sounding like an ad:
- **Occasion presets** (personal mode only): an optional picker with 18 everyday
  occasions (Birthday, Vacation/Travel, Milestone, Food, Selfie/Outfit, Throwback,
  Pet, Friends/Night Out, Relationship, Family, Fitness, Gratitude, Rant/Vent,
  Funny/Meme, Nature, Holiday/Seasonal, Big News, Everyday Moment). Each steers the
  caption's structure + vibe — the personal equivalent of business "Post Type".
- **Stronger "never sound like an ad" rules**: personal prompt now hard-blocks
  prices, discounts, promo codes, product/brand names, "link in bio", and sales CTAs,
  and reframes anything sellable as the person's own life moment. Expanded the
  forbidden-phrase list too. (Verified: a "candles on sale, 20% off, link in bio"
  description came back as personal maker's-pride captions with zero ad language.)
- Server changes are already live (no build needed for the backend); the Occasion
  picker UI ships with this build.

### 7. Six new tones (Business + Personal)
Added to the shared tone list (now 18 total, still pick up to 3): **Nostalgic,
Grateful, Excited, Relatable, Sarcastic, Romantic**. Each has a real behavior
definition in the tone engine so it shapes the caption, not just a label. Available
in both Business and Personal modes. (Verified live: Nostalgic, Sarcastic, and
Romantic each produced distinct, on-tone captions.) Server change is already live;
the new tone chips ship with this build.
- **iOS Share Extension** tone quick-picker updated to the full 18-tone list so it
  matches the main app.
- **Onboarding slides** updated to reflect the new options (Personal occasions +
  personal tones, and "occasion" added to the "How it works" step).

### 8. Version bump (at build time)
- `app.json`: version `1.0.1` → `1.0.2`, iOS `buildNumber` `37` → `38`.

---

## Store setup — FULLY STAGED ✅ (July 6, 2026 — only the final Submit remains)

**Version 1.0.2 is created and staged in App Store Connect** (id `01cdbeb8-…`):
- Build **38** attached (processingState VALID).
- **What's New** written, **Subtitle** set to "AI Captions & Hashtag Maker",
  **Keywords** updated to the new 98-char string. Description + 5 iPhone screenshots
  carried forward from 1.0.1 automatically.

1. **App Store Connect** — annual auto-renewable subscription inside the existing
   **"Captly Pro Monthly"** group (group id `22067313`) is now fully populated:
   - Product ID: `com.captionai.app.pro.yearly` (ASC id `6785966112`)
   - Price: **$59.99/year** — now equalized across **all 175 territories** (was only the
     USA base price, which is what kept it stuck; the API doesn't auto-equalize like the UI).
   - en-US localization: name "Captly Pro", desc "150 AI caption credits every month, billed yearly".
   - **Review screenshot uploaded** (1284×2778 paywall) — asset processing COMPLETE.
   - State may still read `MISSING_METADATA` for a few minutes — that's the ASC state
     string lagging behind the writes; every required field is present and matches the
     live/approved monthly sub. It will flip to Ready and Chris includes it at submit.
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

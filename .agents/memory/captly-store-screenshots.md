---
name: Captly App Store screenshots
description: How to render App Store screenshots headlessly and the ASC dimension/format gotchas.
---

# Rendering App Store screenshots in this env

There is no sharp / puppeteer / chromium installed at the repo root, but Replit
exposes a Chromium binary via env var `REPLIT_PLAYWRIGHT_CHROMIUM_EXECUTABLE`,
and ImageMagick (`magick`/`convert`) is available.

**Working pipeline:** `npm i puppeteer-core` in a throwaway dir (e.g. /tmp), launch
with `executablePath: process.env.REPLIT_PLAYWRIGHT_CHROMIUM_EXECUTABLE` + args
`--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage`, set viewport to the
exact target pixels with `deviceScaleFactor: 1`, `page.setContent(html)`, screenshot
PNG. Build screens as marketing HTML (headline + CSS phone mockup) using the real app
design tokens + Nunito via Google Fonts `<link>`.

**Gotchas:**
- `setContent(..., {waitUntil:"networkidle0"})` HANGS on the Google Fonts socket
  (works once then times out). Use `waitUntil:"domcontentloaded"` then
  `await Promise.race([document.fonts.ready, timeout(~9s)])` + a short paint delay.
- ASC screenshot slots reject wrong pixel sizes. The "iPhone 6.5" Display" slot
  accepts 1242×2688 or 1284×2778 — it does NOT accept 1290×2796 (that's the 6.9"
  size). Render to the size the slot actually lists.
- Flatten alpha before upload: `magick in.png -background white -alpha remove -alpha off -strip out.png`.
  ASC can choke on RGBA; deliver flat sRGB.
- Name re-exported files with the size baked in (e.g. `-1284x2778.png`) so the user's
  Downloads folder doesn't collide old/new batches under the same name.

# ASC submission facts (Captly, app 6766227449)
- App Privacy CANNOT be set via API (appDataUsages endpoints 404) — must use ASC web UI.
- Accurate privacy declaration: Email Address / User ID / Purchase History = collected,
  App Functionality, linked=Yes, tracking=No. Crash Data = App Functionality, linked=No,
  tracking=No. User-typed post text is NOT declared (not stored against identity).

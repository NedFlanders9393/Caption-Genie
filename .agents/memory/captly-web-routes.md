---
name: Captly web artifact route layout
description: Where the marketing page vs the actual web app live, and the backend coupling that breaks if you move them
---

# Captly web (`artifacts/captionai`) route layout

- `/` = marketing **LandingPage** (Captly amber/cream brand, Nunito). This is the URL marketing traffic + the App Store "marketing URL" point at.
- `/app` = the real PWA caption generator (`CaptionAIApp`). It used to live at `/`.
- `/privacy-policy`, `/terms`, `/support` = legal pages. Catch-all `/*` → LandingPage.

**Why it matters / coupling to remember:**
- The Stripe web-checkout success/cancel URLs are built in `artifacts/api-server` and must return to wherever `CaptionAIApp` is mounted (now `/app?checkout=success|cancel`), because only that component reads the `checkout` query param and calls `/api/stripe/verify-session`. If the app is moved again, update those return URLs in lockstep or web Pro upgrades silently fail.
- Backend change → only reaches the live site after the API server is **republished**.
- The `/app` generator still uses the OLD purple "CaptionAI" styling; only the landing page + index.html/PWA metadata were rebranded to amber Captly. Rebranding the generator screen is an open follow-up.

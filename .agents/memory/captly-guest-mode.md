---
name: Captly guest mode (Apple 5.1.1 compliance)
description: Why Captly's core caption features must remain usable without sign-in, and how guests are identified.
---

# Captly guest mode — Apple 5.1.1(v)

**Rule:** core caption generation (generate, regenerate, remix, hashtags) MUST
work for signed-out users. Do not put a hard sign-in gate in front of them.

**Why:** Apple rejected the app under Guideline 5.1.1(v) — an app may not force
account creation to access features that aren't account-based. Captly's captions
aren't account-based, so they must be free to guests. Only purchases (Pro
subscription / credit packs) may require an account.

**How to apply:**
- Server identifies the caller via `resolveIdentity(req)`: Clerk `userId` if
  signed in, else `guest_<X-Device-Id header>`, else 401. Guests fall through to
  FREE_MODEL and are rate-limited by device id.
- Mobile sends `X-Device-Id` on AI requests (see `aiHeaders`) and never blocks
  the generate flow on auth — only the local free-limit paywall applies.
- The Paywall and profile account sections (edit/credits/brand-voice/sign-out/
  delete) are gated behind `isSignedIn`; purchases route guests to sign-in.
- The sign-in screen must stay dismissible (router.canGoBack close button) so a
  guest pushed there is never trapped.

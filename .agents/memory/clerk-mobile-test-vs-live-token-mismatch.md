---
name: Mobile (pk_test) vs published API (live Clerk) token mismatch
description: Why authenticated API calls can fail in a TestFlight/production mobile build even when the server is correct
---

# Clerk test-key mobile app vs live-key published API

Replit-managed Clerk has TWO isolated environments (dev/prod) with separate user
stores. Test keys (`pk_test`/`sk_test`) are auto-swapped to live keys
(`pk_live`/`sk_live`) **when the project is published**.

- The **published API server** (NODE_ENV=production) validates tokens against the
  **live** Clerk instance.
- A **mobile build** uses whatever `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` is baked in
  at build time (eas.json / build config). There is NO automatic swap for the
  mobile binary — if it's `pk_test`, the app authenticates against the **dev**
  Clerk instance and issues dev tokens.

**Failure mode:** mobile app (dev token) → published API (live Clerk) → token
rejected → authed endpoints fail (e.g. credits balance) even though the route and
DB are correct. Often shows as an auth redirect (302 to `/`) or 401.

## How to apply
- A production/TestFlight mobile build that talks to the published API must be
  built with the **live** publishable key (`pk_live...`), not `pk_test`.
- Decisive test: hit an authed prod endpoint from the real app with a real token.
  Server-side curl can't prove it (no valid token). If it still fails after the
  server is confirmed correct, suspect this mismatch.
- Fixing it requires a NEW mobile build (gated by user approval in this project).

## The fix (verified)
- Set the production EAS profile's `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` to the
  **live** key. Check production `CLERK_PROXY_URL`: if unset (no proxy), do NOT set
  `EXPO_PUBLIC_CLERK_PROXY_URL` — the live key already encodes the FAPI domain
  (e.g. `clerk.<deployment-domain>`), so the app connects directly.
- `eas.json` env values are baked into the native binary; the live `pk_live` is a
  PUBLIC key, safe to commit there. `build.js` only governs the hosted Expo Go
  static deploy, not the EAS native build.

## How to obtain pk_live without it being readable in dev
- `viewEnvVars({environment:"production"})` returns secrets as booleans only —
  cannot read the live key value that way.
- Reliable source: fetch the **deployed mobile Expo bundle** (build.js bakes
  `CLERK_PUBLISHABLE_KEY`=pk_live into it in prod). GET the artifact root with an
  `expo-platform: ios` header → manifest JSON → `launchAsset.url` → fetch that
  bundle → regex `pk_live_[A-Za-z0-9]+`. The deployed web SPA homepage usually
  does NOT contain it (lazy-chunked).

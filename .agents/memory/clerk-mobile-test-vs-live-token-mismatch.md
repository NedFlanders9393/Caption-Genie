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

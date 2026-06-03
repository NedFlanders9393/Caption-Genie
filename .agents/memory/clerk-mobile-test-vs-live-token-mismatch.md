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

## The fix (verified) — pk_live AND the proxy are BOTH required
- Set the production EAS profile's `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` to the
  **live** key AND `EXPO_PUBLIC_CLERK_PROXY_URL` to
  `https://<deployment-domain>/api/__clerk`. BOTH are required together.
- **Do NOT trust `viewEnvVars` showing `CLERK_PROXY_URL` as unset to mean "no
  proxy."** Replit-managed Clerk in production routes the frontend API through a
  server proxy at `/api/__clerk`. The live key encodes a FAPI domain like
  `clerk.<deployment-domain>` that is NOT publicly resolvable (curl → connection
  refused / 000), so pk_live ALONE makes ClerkProvider hang forever → if the app
  gates UI on `<ClerkLoaded>`, the result is a permanent WHITE SCREEN on launch.
- Verify the proxy exists: `curl https://<domain>/api/__clerk/v1/environment` → 200.
- The clerk-auth skill says `proxyUrl` must be passed UNCONDITIONALLY; the same
  wiring runs in dev (env empty) and prod (env populated). Don't gate on NODE_ENV.
- `eas.json` env values are baked into the native binary; `pk_live` and the proxy
  URL are PUBLIC, safe to commit. `build.js` governs only the hosted Expo Go static
  deploy, but it is the source of truth for the EXACT prod values (pk + proxy) —
  mirror what it bakes.

## How to obtain pk_live without it being readable in dev
- `viewEnvVars({environment:"production"})` returns secrets as booleans only —
  cannot read the live key value that way.
- Reliable source: fetch the **deployed mobile Expo bundle** (build.js bakes
  `CLERK_PUBLISHABLE_KEY`=pk_live into it in prod). GET the artifact root with an
  `expo-platform: ios` header → manifest JSON → `launchAsset.url` → fetch that
  bundle → regex `pk_live_[A-Za-z0-9]+`. The deployed web SPA homepage usually
  does NOT contain it (lazy-chunked).

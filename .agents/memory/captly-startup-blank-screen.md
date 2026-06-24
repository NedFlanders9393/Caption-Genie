---
name: Captly startup blank-screen gap
description: Why a blank white screen appears between the animated splash and the first screen at launch, and the rule that prevents it.
---

# Startup blank-screen gap (mobile)

At launch the order is: native splash (held via `preventAutoHideAsync`) → fonts load → `AnimatedSplash` (spinning bolt) overlay → `<ClerkLoaded>` children (real screens).

**The trap:** `<ClerkLoaded>` renders **nothing** until Clerk finishes its session restore (a network round-trip through the Clerk proxy / published deployment, ~5–7s on cold start). If `AnimatedSplash` dismisses on its hard cap *before* `clerkReady`, the bolt fades to a **blank white screen** until Clerk resolves.

**Rule:** the branded splash must stay up until Clerk is actually ready, and there must always be a non-white fallback underneath.
- Keep `AnimatedSplash` `maxDurationMs` well above realistic Clerk-restore time (safety net only — it should normally fade on `ready={clerkReady}`).
- Always render `<ClerkLoading><BrandedLoader/></ClerkLoading>` (cream `#FFFDF9` + amber spinner) so the screen can never fall through to white even if the splash dismisses first.

**Why:** `ClerkLoaded` is an all-or-nothing gate; a blank between two loaders reads as "app is broken," not "loading."

**Actual-latency lever (not just visual):** the ~5–7s itself is Clerk's restore through `EXPO_PUBLIC_CLERK_PROXY_URL` (the published `captura.replit.app` deployment). A cold/sleeping deployment cold-starts on the first Clerk call. Genuine speedups = keep that deployment warm (min instances) or move Clerk off the proxy to direct FAPI — both are risky/cost changes and require a new iOS build to verify. Don't change Clerk proxy config blindly.

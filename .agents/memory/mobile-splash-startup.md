---
name: Mobile cold-start splash / launch perceived latency
description: Why CaptionAI/Captly felt slow to reach Home, and the rule for splash dismissal.
---

# Splash should track real readiness, not a fixed timer

The app felt ~7s slow from animation to Home because the launch showed **two
loaders back to back**: a custom `AnimatedSplash` (components/AnimatedSplash.tsx)
ran on a hardcoded timer (1800ms hold + 400ms fade) that waited for nothing, then
faded to a SECOND `ActivityIndicator` in `app/(tabs)/_layout.tsx` while Clerk
restored the session (network) and the onboarding AsyncStorage check ran, before the
`(tabs)` → `(tabs)/home` redirect.

**Fix applied:** AnimatedSplash now takes `ready` + `minDurationMs` (700) +
`maxDurationMs` (4500) and fades only once the app is ready AND a short minimum has
elapsed, with a hard max fallback so it can never hang. Root layout passes
`ready={clerkReady}` where `clerkReady` comes from a tiny `ClerkReadySignal`
(`useAuth().isLoaded`) mounted directly under ClerkProvider. This merges the two
loaders into one continuous bolt splash that covers the real Clerk load.

**Why:** the dominant launch cost is Clerk session restore (network), not the
animation. Padding the splash with a fixed timer and THEN showing a second spinner
doubled the perceived wait. A splash that dismisses on readiness (with a min floor +
max ceiling) feels fast and never strands the user on a blank/hung screen.

**How to apply:** for any RN/Expo launch splash, drive dismissal off an app-ready
signal with a minimum display floor and a max-timeout escape hatch — never a pure
fixed delay. Watch for a second loader downstream (auth/onboarding gate) that
re-introduces the wait.

**Deploy note:** JS-only change — visible in Expo dev preview immediately, but only
reaches TestFlight users on the next EAS build.

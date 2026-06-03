---
name: Expo Router typed routes regenerate on workflow restart
description: Why a brand-new screen file fails typecheck with a Href union error until the expo dev server restarts
---

When you add a new screen file under `artifacts/captionai-mobile/app/`, `router.push("/new-route")` will FAIL typecheck with a TS2345 "not assignable to Href union" error even though the file exists.

**Why:** Expo Router generates the typed-routes union (`.expo/types`) at dev-server runtime, not at typecheck time. A freshly created route is not yet in the generated union.

**How to apply:** After creating a new screen, restart the `artifacts/captionai-mobile: expo` workflow once (it regenerates route types), then re-run `pnpm --filter @workspace/captionai-mobile run typecheck`. Do NOT reach for `as any` casts — the restart is the correct fix.

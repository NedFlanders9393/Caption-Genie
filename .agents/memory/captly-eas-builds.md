---
name: Captly EAS iOS build process
description: How to successfully queue an EAS iOS build + TestFlight auto-submit from this Replit environment (gotchas that cause silent failures)
---

# Running an EAS iOS build (Captly mobile)

Run from `artifacts/captionai-mobile`. Standing directive: **never build/submit without explicit user approval.**

## The command that works
```
EAS_NO_VCS=1 eas build --platform ios --profile production --auto-submit --non-interactive --no-wait
```
- Builds + auto-submits to TestFlight (App Store Connect) in the cloud; returns after queueing.

## Non-obvious gotchas (each caused a failure)
- **`EAS_NO_VCS=1` is required.** Without it, EAS tries to touch `.git/index.lock` and the sandbox blocks it with "Destructive git operations are not allowed in the main agent" → build never queues. NO_VCS makes EAS archive the working dir directly (uncommitted changes like a build-number bump are included — desirable).
- **Run in the FOREGROUND.** Backgrounding with `nohup ... &` gets the child killed when the bash tool returns — no build queues, log is empty.
- **`/tmp` is cleared between tool calls.** The ASC API key file (`/tmp/AuthKey_<KeyID>.p8`, written from the `ASC_API_KEY_CONTENT` secret) must be re-staged in the SAME bash call that runs the build, or auto-submit can't find it.
- **`.git/index.lock` may be left stale** after a blocked attempt; the main agent cannot remove it (sandbox blocks rm too). The platform's end-of-task commit clears it.

## Build number
- `app.json` → `expo.ios.buildNumber` (eas.json `appVersionSource: "local"`). Bump it before every build or App Store Connect rejects the duplicate. Version string stays `1.0.0`; only buildNumber increments.

## Auth
- `EXPO_TOKEN` secret authenticates EAS CLI non-interactively. iOS signing credentials are already stored on EAS.

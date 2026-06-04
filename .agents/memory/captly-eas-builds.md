---
name: Captly EAS iOS build process
description: How to successfully queue an EAS iOS build + TestFlight auto-submit from this Replit environment (gotchas that cause silent failures)
---

# Running an EAS iOS build (Captly mobile)

Run from `artifacts/captionai-mobile`. Standing directive: **never build/submit without explicit user approval.**

## The command that works
- **Isolated task environment (git allowed):** commit the buildNumber bump first, then run the git-based build WITHOUT NO_VCS:
  ```
  eas build --platform ios --profile production --auto-submit --non-interactive --no-wait
  ```
  Here `EAS_NO_VCS=1` is wrong: it omits the monorepo root `pnpm-lock.yaml` so EAS falls back to `yarn install --frozen-lockfile` and fails at "Install dependencies". Let EAS use git (archives the committed tree).
- **Main agent sandbox (git blocked):** use `EAS_NO_VCS=1` (see gotchas) since git index ops are blocked there.
- Both build + auto-submit to TestFlight (App Store Connect) in the cloud; return after queueing.

## Non-obvious gotchas (each caused a failure)
- **`EAS_NO_VCS=1` is required.** Without it, EAS tries to touch `.git/index.lock` and the sandbox blocks it with "Destructive git operations are not allowed in the main agent" → build never queues. NO_VCS makes EAS archive the working dir directly (uncommitted changes like a build-number bump are included — desirable).
- **Run in the FOREGROUND.** Backgrounding with `nohup ... &` gets the child killed when the bash tool returns — no build queues, log is empty.
- **`/tmp` is cleared between tool calls.** The ASC API key file (`/tmp/AuthKey_<KeyID>.p8`, written from the `ASC_API_KEY_CONTENT` secret) must be re-staged in the SAME bash call that runs the build, or auto-submit can't find it.
- **`.git/index.lock` may be left stale** after a blocked attempt; the main agent cannot remove it (sandbox blocks rm too). The platform's end-of-task commit clears it.

## Build number
- `app.json` → `expo.ios.buildNumber` (eas.json `appVersionSource: "local"`). Bump it before every build or App Store Connect rejects the duplicate. Version string stays `1.0.0`; only buildNumber increments.

## Auth
- `EXPO_TOKEN` secret authenticates EAS CLI non-interactively. iOS signing credentials are already stored on EAS.

## ASC API key (.p8) staging — CRITICAL
- The `ASC_API_KEY_CONTENT` secret stores the .p8 with its **newlines stripped** (it keeps the `BEGIN/END` markers but the base64 body is one run with no line breaks). Writing it verbatim to `/tmp/AuthKey_<KeyID>.p8` produces a malformed PEM.
- A malformed .p8 makes the EAS iOS **submit** (fastlane pilot / spaceship) crash with `invalid curve name (OpenSSL::PKey::ECError)` in `spaceship/connect_api/token.rb` → submission ERRORED even though the **build FINISHED**. The build is fine; only the upload-to-Apple step dies.
- Fix before staging: extract the base64 between the BEGIN/END markers, strip all whitespace, re-wrap at 64 chars, write back as proper PEM. Verify with `crypto.createPrivateKey(pem)` (Node) — it throws if still malformed.
- A bare `eas submit --platform ios --id <BUILD_ID> --profile production --non-interactive` (no git needed) re-uploads an already-FINISHED build to TestFlight; no rebuild required. Works from the main agent sandbox (submit doesn't touch git), but the correctly-formatted key file must be staged in the SAME bash call (`/tmp` clears between calls).

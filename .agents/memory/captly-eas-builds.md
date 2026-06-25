---
name: Captly EAS iOS build process
description: How to successfully queue an EAS iOS build + TestFlight auto-submit from this Replit environment (gotchas that cause silent failures)
---

# Running an EAS iOS build (Captly mobile)

Run from `artifacts/captionai-mobile`. Standing directive: **never build/submit without explicit user approval.**

## The command that works (CORRECTED)
The reliable command from the **main agent sandbox** is the git-based build WITHOUT NO_VCS, run on a **clean, committed working tree**:
```
eas build --platform ios --profile production --non-interactive --no-wait
```
**Why git, not NO_VCS:** `EAS_NO_VCS=1` archives only `artifacts/captionai-mobile`, omitting the monorepo root `pnpm-lock.yaml` + `pnpm-workspace.yaml`, so EAS falls back to `yarn install --frozen-lockfile` and ERRORS at "Install dependencies" (this app depends on `workspace:*`/`catalog:` and can't install standalone). The git path archives the whole committed repo tree → pnpm install works.

**Why a clean tree matters:** the old "git is blocked in the main agent / must use NO_VCS" note was wrong-ish. Git **read-only** ops (`git archive`/`ls-files`) work fine here. So: do NOT bump buildNumber in the same turn (that's an uncommitted edit). Reuse the current committed buildNumber if the last build with that number ERRORED (it never reached Apple, so the number is free). If you must bump, the bump has to be committed first (e.g. let the platform's end-of-turn checkpoint commit it, then build next turn).

## CRITICAL: prefix the build command with `GIT_OPTIONAL_LOCKS=0`
```
GIT_OPTIONAL_LOCKS=0 EAS_SKIP_AUTO_FINGERPRINT=1 eas build --platform ios --profile production --non-interactive --no-wait
```
EAS runs an internal `git status` to check the tree, which tries to **write** `.git/index.lock` to refresh git's cached stat data. The sandbox blocks that write ("Destructive git operations are not allowed in the main agent ... .git/index.lock") — this fires AFTER the 172 MB upload succeeds, so the upload looks fine then the command dies and NO build queues. It's **intermittent**: git only writes the lock when the index needs refreshing (file mtimes changed since the last index write, e.g. after a typecheck/prebuild touched files); right after a fresh checkpoint the index is clean so status is a pure read and the build queues without the flag — which is why some builds queued and others didn't. `GIT_OPTIONAL_LOCKS=0` (the env-var form of `--no-optional-locks`) makes ALL git subprocesses skip the optional index-refresh write, so the build queues reliably regardless of mtime state. A pre-existing stale `index.lock` is harmless with this flag (read-only `git archive` and lock-free `git status` don't need it).

## Non-obvious gotchas (each caused a failure)
- **The "Computing project fingerprint" step is slow** and can exceed a short bash timeout, killing the command before the build queues (looks like a hang with no output, esp. when piped to `tail`). Give it the full ~120s and stream output (no `| tail`). Set `EAS_SKIP_AUTO_FINGERPRINT=1` to skip it and queue faster.
- **Archive is ~172 MB** (no `.easignore`); upload still only takes a few seconds, fingerprint is the slow part.
- **Run in the FOREGROUND.** Backgrounding with `nohup ... &` gets the child killed when the bash tool returns — no build queues, log is empty.
- **`/tmp` is cleared between tool calls.** The ASC API key file (`/tmp/AuthKey_<KeyID>.p8`, written from the `ASC_API_KEY_CONTENT` secret) must be re-staged in the SAME bash call that runs the build, or auto-submit can't find it.
- **`.git/index.lock` may be left stale** after a blocked attempt; the main agent cannot remove it (sandbox blocks rm too). The platform's end-of-task commit clears it.

## Build number
- `app.json` → `expo.ios.buildNumber` (eas.json `appVersionSource: "local"`). Bump it before every build or App Store Connect rejects the duplicate. Version string stays `1.0.0`; only buildNumber increments.

## Auth
- `EXPO_TOKEN` secret authenticates EAS CLI non-interactively. iOS signing credentials are already stored on EAS.

## Build ↔ backend coupling (easy to forget)
- The production EAS profile (`eas.json` env) points the app at the **deployed prod backend** (`captura.replit.app`), NOT dev. So any backend change a new TestFlight build depends on (e.g. the guest `/api/credits/balance` endpoint) is invisible to testers until the API server is **republished** (Publish button / `suggestDeploy`). Committing the backend change is not enough. Whenever a build relies on new server behavior, ship the build AND publish the backend together, or the feature 401s/breaks in TestFlight while looking fine in dev.

## ASC API key (.p8) staging — CRITICAL
- The `ASC_API_KEY_CONTENT` secret stores the .p8 with its **newlines stripped** (it keeps the `BEGIN/END` markers but the base64 body is one run with no line breaks). Writing it verbatim to `/tmp/AuthKey_<KeyID>.p8` produces a malformed PEM.
- A malformed .p8 makes the EAS iOS **submit** (fastlane pilot / spaceship) crash with `invalid curve name (OpenSSL::PKey::ECError)` in `spaceship/connect_api/token.rb` → submission ERRORED even though the **build FINISHED**. The build is fine; only the upload-to-Apple step dies.
- Fix before staging: extract the base64 between the BEGIN/END markers, strip all whitespace, re-wrap at 64 chars, write back as proper PEM. Verify with `crypto.createPrivateKey(pem)` (Node) — it throws if still malformed.
- A bare `eas submit --platform ios --id <BUILD_ID> --profile production --non-interactive` (no git needed) re-uploads an already-FINISHED build to TestFlight; no rebuild required. Works from the main agent sandbox (submit doesn't touch git), but the correctly-formatted key file must be staged in the SAME bash call (`/tmp` clears between calls).

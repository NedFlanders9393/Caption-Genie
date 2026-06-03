---
name: EAS iOS build/submit gotchas (captionai-mobile)
description: Why an EAS iOS submission errors right after "Scheduled", plus how to run long EAS commands and query App Store Connect
---

# EAS iOS build & submit gotchas

## Duplicate build number → submission ERRORS after "Scheduled iOS submission"
- `eas.json` `cli.appVersionSource = "local"` means EAS uses `expo.ios.buildNumber`
  from `app.json` verbatim and does NOT auto-increment.
- If that build number already exists on App Store Connect (even from a prior
  TestFlight upload), `eas submit` uploads then fails with a generic
  "Something went wrong when submitting your app to Apple App Store Connect."
  The EAS GraphQL `submission.error` is often `null` and `logsUrl` is `NONE`, so
  the generic message is all the CLI shows.
- CFBundleVersion is baked into the binary at build time, so you cannot re-submit
  the existing binary — you must bump `app.json` `ios.buildNumber` and REBUILD.
- **Why:** Apple rejects duplicate (version, build number) pairs.
- **How to apply:** before submitting, check existing ASC build numbers; bump
  `ios.buildNumber` above the max. Consider `autoIncrement: true` on the profile
  to prevent recurrence (but it overshoots if combined with a manual bump).

## Running long EAS commands on Replit
- Detached shells (`nohup`/`setsid` + `&`) get KILLED when the bash tool call
  returns — they do not survive across tool calls. The local upload step alone
  exceeds the 2-min bash cap.
- Use a temporary **workflow** (configureWorkflow, outputType "console") to run
  `eas build/submit ... --no-wait`; it persists, then read getWorkflowStatus
  output for the build/submission URL. Remove the workflow when done.
- `npx -y eas-cli@latest` works; first run is slow (download), cache warms after.

## Querying App Store Connect directly (confirm existing build numbers)
- See `asc-api-key-submit.md` for the `.p8` PEM reconstruction (the secret stores
  it without proper newlines). After building the PEM, sign an ES256 JWT (aud
  `appstoreconnect-v1`, iss = issuerId, kid = keyId) with
  `crypto.sign("SHA256", data, { key, dsaEncoding: "ieee-p1363" })` (JOSE r||s,
  not DER), then GET
  `api.appstoreconnect.apple.com/v1/builds?filter[app]=<ascAppId>&sort=-uploadedDate`
  to list existing build numbers before submitting.
- The JS code_execution sandbox does NOT expose `process.env` secrets; run these
  curl/Node calls from the bash tool where `$EXPO_TOKEN` etc. are available.

---
name: Captly iOS pod install — Google/Clerk modular headers
description: Why EAS iOS builds fail at "Install pods" with a Swift-static-library error, and the config-plugin fix.
---

# iOS "Install pods" failure: Google pods can't link as static libraries

## Symptom
EAS iOS build reaches the **INSTALL_PODS** phase then errors:
`pod install exited with non-zero code: 1`, with the real CocoaPods message:
> [!] The following Swift pods cannot yet be integrated as static libraries:
> The Swift pod `AppCheckCore` depends upon `GoogleUtilities` and `RecaptchaInterop`, which do not define modules.

`eas build:view --json` only shows a generic "see Install pods logs" — get the real error by fetching `logFiles[0]` (a signed GCS URL) from the Expo GraphQL API: `query{builds{byId(buildId:$id){status logFiles}}}` against `https://api.expo.dev/graphql` with `Authorization: Bearer $EXPO_TOKEN`, then `fetch` the URL and read the tail.

## Root cause
`@clerk/expo` (>=3.2.x) ships a **native Google Sign-In module** — `ios/ClerkGoogleSignIn.podspec` with `s.dependency 'GoogleSignIn', '~> 9.0'` and `s.static_framework = true`. That transitively pulls the Google Obj-C pod chain (GoogleUtilities, RecaptchaInterop, GTM*, AppCheckCore). Those Obj-C pods don't define Clang modules, so the Swift Google pods can't `import` them under the default static-library linkage. The app doesn't even use native Google sign-in (email-code flow), but the pod is autolinked anyway and there's no clean per-podspec exclude.

## Fix (the low-blast-radius one)
Config plugin `plugins/withGoogleModularHeaders.js` (registered in `app.json` plugins) uses `withDangerousMod('ios')` to inject into the generated Podfile, right after `use_expo_modules!`:
```ruby
pod 'GoogleUtilities', :modular_headers => true
pod 'RecaptchaInterop', :modular_headers => true
pod 'GTMSessionFetcher', :modular_headers => true
pod 'GTMAppAuth', :modular_headers => true
pod 'AppAuth', :modular_headers => true
```
This is exactly the CocoaPods error's own second suggestion. **Why not the alternatives:** global `use_modular_headers!` risks breaking RN/Hermes pods; `expo-build-properties` `useFrameworks: "static"` changes linkage for *every* pod (broad risk). Only the Obj-C Google pods get modular headers; RN/Hermes/Reanimated linkage is untouched. Do NOT list the Swift pods (GoogleSignIn, AppCheckCore) — modular_headers is an Obj-C concept.

**Why:** introduced when Clerk added the native Google module; older builds (pre-Clerk-bump) didn't have these pods, which is why earlier FINISHED builds didn't hit it.

## Can't verify locally
`expo prebuild` touches the git index → blocked in the main agent sandbox (`.git/index.lock` "Destructive git operations not allowed"). Rely on the EAS worker's clean prebuild to apply the plugin. `ios/`/`android/` are gitignored, so a local prebuild attempt won't dirty the tree (but it leaves a stale `index.lock` that the end-of-turn checkpoint clears).

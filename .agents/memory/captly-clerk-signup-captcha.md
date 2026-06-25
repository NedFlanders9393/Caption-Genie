---
name: Captly Clerk sign-up captcha node
description: Why Captly's Expo sign-up was failing for every password, and the one node that fixes it.
---

# Clerk Expo sign-up — the required clerk-captcha node

**Symptom:** Apple reviewer (and any user) "unable to set any password during
account creation due to an error" — sign-up failed for EVERY password attempt,
not just weak ones. (Apple Guideline 2.1(a).)

**Root cause:** the sign-up screen was missing `<View nativeID="clerk-captcha" />`.
Clerk's bot/sign-up protection is ON by default; without this node Clerk has
nowhere to mount its CAPTCHA challenge, so `signUp.password()` errors out every
time. The Clerk API usage itself (`signUp.password` /
`verifications.sendEmailCode` / `verifyEmailCode` / `finalize`, the v6 "Future
API") was already CORRECT and matches the official Replit-managed Clerk Expo
reference — do not "fix" the API calls.

**Why this is easy to miss:** the captcha node renders nothing visible, so the
form looks complete. The official skill reference
(`.local/skills/clerk-auth/references/custom-ui/expo-sdk-email-password.md`)
marks it "Required for sign-up flows" but it's a single easy-to-drop line.

**How to apply:** any custom Clerk Expo sign-up form must include
`<View nativeID="clerk-captcha" />` somewhere in the credentials view. Also add a
client-side min-8-char password check so policy rejections give a clear message
instead of a generic server error.

---
name: Clerk Expo new-device email verification
description: Why sign-in on a fresh device returns needs_second_factor even though MFA is "off"
---

# Clerk Expo (Future API) — new-device sign-in requires an email code

When a user signs in from a brand-new / untrusted device (e.g. a fresh TestFlight
install), Clerk's Future API returns `signIn.status === "needs_second_factor"` (or
`"needs_client_trust"`) **after `signIn.password()` already succeeded**. This is NOT
traditional MFA — Replit-managed Clerk does not support MFA. It is Clerk's
new-device / client-trust verification, satisfied with an **email verification code**.

**The bug it causes:** sign-in code that only handles `status === "complete"`
dead-ends with a confusing error ("Sign-in incomplete (status: needs_second_factor)")
on real devices, even though the password was correct. It will pass in the dev
client (trusted) and only fail on TestFlight / new devices.

**How to handle (canonical Future API):**
1. After `signIn.password(...)`, if status is `needs_second_factor` / `needs_client_trust`:
   call `signIn.mfa.sendEmailCode()`, show a code-entry step.
2. `signIn.mfa.verifyEmailCode({ code })`, then if `status === "complete"` call `signIn.finalize()`.

**Why:** discovered when TestFlight builds failed sign-in with `needs_second_factor`
while dev worked. Canonical reference:
`.local/skills/clerk-auth/references/custom-ui/expo-sdk-email-password.md`.

**Related conventions for this Future API (@clerk/expo v3 → clerk-js v6):**
- Activate the session with `signIn.finalize()` / `signUp.finalize()`, NOT `clerk.setActive({session})`.
- Gate completion on `status === "complete"` only — do NOT also require `createdSessionId` (it can be absent pre-finalize).
- Resend a sign-up code with `signUp.verifications.sendEmailCode()`, not by re-calling `password()`.

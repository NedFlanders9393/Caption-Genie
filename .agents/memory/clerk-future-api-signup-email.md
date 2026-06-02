---
name: Clerk Future API sign-up requires explicit sendEmailCode
description: Sign-up email verification codes never send unless you explicitly call verifications.sendEmailCode() after password()
---

# Clerk v6 "Future API" sign-up: must explicitly send the email code

After `signUp.password({ emailAddress, password })` succeeds and status is NOT
`complete`, you MUST explicitly call `await signUp.verifications.sendEmailCode()`
before showing the code-entry screen. `password()` does NOT auto-dispatch the
verification email.

**Why:** A sign-up handler assumed `password()` auto-sent the code and jumped
straight to the verify screen. Result: account reaches pending state, the verify
UI shows, but no email is ever sent — user "never receives the code." Sign-IN was
unaffected because it already called `mfa.sendEmailCode()` explicitly.

**How to apply:** Mirror the canonical pattern (clerk-auth skill,
references/custom-ui/expo-sdk-email-password.md). Sign-up = `verifications.sendEmailCode()`;
sign-in new-device = `mfa.sendEmailCode()`. Always capture `{ error }` from the
send call and surface it — a silent skip looks identical to an email-delivery
failure and wastes hours chasing spam folders / DNS.

**Diagnostic note:** Pending (unverified) sign-ups do NOT appear in the Clerk
`/v1/users` list — only fully created/verified users do. So an empty user store
does not prove the sign-up call failed.

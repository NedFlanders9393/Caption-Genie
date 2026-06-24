---
name: Clerk "app name" in emails (Replit-managed)
description: How to rebrand the name shown in Clerk verification/sign-in emails when you can't reach the Clerk dashboard.
---

# Changing the name Clerk shows in its emails

## The problem
Clerk's system emails (verification code, new-device sign-in, password reset, magic links, etc.) display the **application name** via the `{{app.name}}` template variable. On a Replit-managed Clerk tenant there is **no dashboard access**, and the Backend API `GET/PATCH /v1/instance` does **not** expose or let you change the application name. So a stale app name (e.g. left over from an earlier project name) keeps appearing in every auth email.

## The fix that works (no dashboard, no app rebuild)
This is purely a Clerk server-side setting — **no new mobile build / TestFlight upload needed**; it takes effect for all future emails immediately.

Use the Clerk Backend API with `CLERK_SECRET_KEY` (available as an env var in the bash shell, NOT in the code_execution sandbox where `process.env` is undefined):
1. `GET /v1/templates/email` → list all template slugs.
2. For each, `GET /v1/templates/email/{slug}`, then `PUT` it back with:
   - `subject`, `body`, `markup` → `replaceAll("{{app.name}}", "<NewName>")`
   - `from_email_name: "<NewName>"` (controls the sender display name)
   - echo back `name`, `delivered_by_clerk`, `reply_to_email_name`.
3. Verify: re-GET and assert 0 occurrences of `{{app.name}}` and the old name.

## Gotchas
- **Billing/commerce templates are locked**: `billing_*` and `commerce_gateway_*` PUTs return 400 `"Template body cannot be modified"`. Skip them — they're irrelevant if the app uses RevenueCat/Stripe (not Clerk billing) and will never be sent.
- Template editing is **not** plan-gated on the Replit-managed dev instance (PUT returns 200).
- Hardcoding the name (vs `{{app.name}}`) is the tradeoff for not being able to set the real app name; fine since the app name itself isn't changeable via available tools.
- The Replit docs answer for "app name in emails" wrongly points at `<ClerkProvider>` `appearance`/`localization` props — those affect the hosted UI, not email `{{app.name}}`. Edit the email templates instead.

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

## The dev-vs-prod instance trap (most common reason "we already fixed this" fails)
Replit-managed Clerk has **two separate instances**: development (`*.clerk.accounts.dev`, `pk_test`/`sk_test`) and production (`clerk.<app>.replit.app`, `pk_live`/`sk_live`). They have **independent** email templates and application names — editing one does NOT touch the other. `GET /v1/instance` reports `environment_type` so you can tell which one your `CLERK_SECRET_KEY` points at; in the dev workspace it is the **development** instance.

A native build made with the EAS `production` profile (pk_live) sends auth emails from the **production** instance. So if you only ran the template rebrand from the dev workspace, TestFlight/App Store users still see the old name. The production secret (`sk_live`) is **not** present in the dev environment — Replit injects it only into the **deployed** server (it auto-swaps test→live keys on publish).

To fix production without a dashboard or the prod secret in hand: run the rebrand **from inside the deployed server**, which has `sk_live` as `process.env.CLERK_SECRET_KEY`. An idempotent boot-time pass (`rebrandClerkEmails()` wired in `api-server/src/index.ts`, only PUTs templates that still contain an old name) does this safely; the owner just has to Republish once, then confirm via deployment logs (`Clerk email rebrand complete environment:"production" changed:N`). It is a no-op on every later boot.

## Gotchas
- **Billing/commerce templates are locked**: `billing_*` and `commerce_gateway_*` PUTs return 400 `"Template body cannot be modified"`. Skip them — they're irrelevant if the app uses RevenueCat/Stripe (not Clerk billing) and will never be sent.
- Template editing is **not** plan-gated on the Replit-managed dev instance (PUT returns 200).
- Hardcoding the name (vs `{{app.name}}`) is the tradeoff for not being able to set the real app name; fine since the app name itself isn't changeable via available tools.
- The Replit docs answer for "app name in emails" wrongly points at `<ClerkProvider>` `appearance`/`localization` props — those affect the hosted UI, not email `{{app.name}}`. Edit the email templates instead.

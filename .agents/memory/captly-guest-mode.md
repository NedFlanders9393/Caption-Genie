---
name: Captly guest mode (Apple 5.1.1 compliance)
description: Why Captly's core caption features AND purchases must work without sign-in, and how guest identity flows through RevenueCat + the credit ledger.
---

# Captly guest mode — Apple 5.1.1(v)

**Rule:** core caption generation (generate, regenerate, remix, hashtags) AND
all purchases (Pro subscription + consumable credit packs) MUST work for
signed-out users. Do not put a hard sign-in gate in front of any of them.

**Why:** Apple rejected the app under Guideline 5.1.1(v) — an app may not force
account creation to access features (or purchases) that aren't account-based.
A first rejection covered captions; a later rejection covered the Paywall, which
had a `requireSignIn()` gate routing guests to sign-in before purchasing. Both
gates had to go. Subscription cross-device restore rides the Apple ID via
"Restore Purchases", so an in-app account is never required to buy.

**How guest identity flows (the part that's easy to get wrong):**
- Server `resolveIdentity(req)`: Clerk `userId` if signed in, else
  `guest_<X-Device-Id header>`, else 401.
- Mobile configures RevenueCat with `appUserID = guest_<deviceId>` (NOT
  anonymous) so a guest purchase's webhook `app_user_id` matches the exact
  credit-ledger row the server reads for that device. On sign-in,
  `linkRevenueCatIdentity()` calls `Purchases.logIn(clerkUserId)` to alias.
  Init is async (awaits getDeviceId), so linkRevenueCatIdentity buffers the
  clerk id if it arrives before configure() finishes (pendingLinkUserId), or it
  would be silently dropped.
- `getProStatus()` must NOT short-circuit `guest_*` to "free" — a guest who
  subscribes has an active "pro" RC entitlement under `guest_<deviceId>`, so the
  RevenueCat REST lookup has to run for guests too. Trade-off: every guest AI
  action now does one RC REST call (same as signed-in free users already do).
- On an RC outage `getProStatus()` must fail OPEN to "free" for guests but
  "unknown" for signed-in users. Why: a guest's free monthly allowance is only
  granted when status is exactly "free" (ensureMonthlyFreeAllowance skips
  "unknown"), so returning "unknown" for a guest hard-blocks generation with a
  402 on zero credits. Signed-in users return "unknown" instead, so a paying
  user is never mis-reset to free. A guest who actually subscribed is still
  protected from a balance clobber by the >FREE_MONTHLY_CREDITS guard.

**Known gap (accepted for launch, not an approval blocker):** consumable credits
bought as a guest live on `guest_<deviceId>`; there is NO ledger merge into
`user_<clerkId>` on sign-in (webhook treats TRANSFER as a no-op). A guest who
buys then signs in mid-cycle strands those credits. Pro status itself follows
correctly because RC TRANSFER moves the entitlement and getProStatus re-checks RC.

**Also keep:** the sign-in screen must stay dismissible (router.canGoBack close
button) so a guest who navigates there is never trapped.

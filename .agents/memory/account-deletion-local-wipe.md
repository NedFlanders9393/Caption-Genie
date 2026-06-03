---
name: Account deletion must wipe local AsyncStorage too
description: Cross-account data contamination risk when deleting an account on a shared device
---

Deleting a user account requires clearing BOTH server rows AND local AsyncStorage (history, favorites, hashtag history) on the device.

**Why:** `AppContext.loadData()` merges local-only history/favorites and re-uploads them to whatever account signs in next (union-merge + `saveFavoriteEntry`/`saveHistoryEntry`). If only the server is wiped, a different user signing in on the same device inherits the deleted user's captions/favorites — a privacy leak and Apple-compliance gap.

**How to apply:** The account-delete flow must call a full local wipe (`wipeAllUserData` in AppContext) after the server `DELETE /api/account`, before sign-out. Any future per-user local cache added to storage must also be cleared there.

**Known non-blocking follow-up:** RevenueCat webhook / credit-grant paths can still create `user_credits` rows for a deleted Clerk userId if a subscription renews post-deletion (deletion does not cancel the App Store subscription). These rows are orphaned (no one can authenticate as the dead userId) — not a cross-user leak. A tombstone/"deleted users" guard in the webhook would close it but touches sensitive payment code, so it was deferred.

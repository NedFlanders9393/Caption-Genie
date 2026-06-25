import { Router, type IRouter } from "express";
import { requireAuth, getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { creditTransactions } from "@workspace/db/schema";
import { desc, eq } from "drizzle-orm";
import { getBalance, claimFreeCredits, ensureMonthlyFreeAllowance } from "../services/credits.js";
import { getProStatus } from "./captions.js";
import { clerkClient } from "@clerk/express";

const router: IRouter = Router();

/**
 * GET /api/credits/balance
 * Returns current credit balance for the authenticated user.
 */
router.get("/credits/balance", async (req, res) => {
  // Guest-accessible (Apple 5.1.1(v)): guests buy packs + get a free monthly
  // allowance, so they must be able to see their balance. Identity resolves to
  // the Clerk userId when signed in, else a `guest_<deviceId>` key from the
  // stable X-Device-Id header — the same scheme caption generation uses.
  const authedUserId = getAuth(req).userId;
  const deviceId = req.header("x-device-id")?.trim();
  const userId = authedUserId ?? (deviceId ? `guest_${deviceId}` : null);
  if (!userId) {
    return res.status(401).json({ error: "unauthorized" });
  }

  try {
    // Refresh the monthly free allowance so a free user sees their fresh 10
    // at the start of a new month even before they generate (no-op for Pro,
    // and a safe no-op when RevenueCat status is unknown).
    const proStatus = await getProStatus(userId);
    await ensureMonthlyFreeAllowance(userId, proStatus);
    const balance = await getBalance(userId);
    return res.json({
      subscription: balance.subscription,
      purchased: balance.purchased,
      total: balance.total,
      monthlyCreditsResetAt: balance.monthlyCreditsResetAt.toISOString(),
      lifetimeUsed: balance.lifetimeUsed,
      lifetimePurchased: balance.lifetimePurchased,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch credit balance");
    return res.status(500).json({ error: "failed_to_fetch_balance" });
  }
});

/**
 * GET /api/credits/transactions?limit=50
 * Returns the most recent credit transactions for the authenticated user.
 */
router.get("/credits/transactions", requireAuth(), async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const limitParam = Number(req.query.limit ?? 50);
  const limit = Math.min(Math.max(Number.isFinite(limitParam) ? limitParam : 50, 1), 200);

  try {
    const rows = await db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.userId, userId))
      .orderBy(desc(creditTransactions.createdAt))
      .limit(limit);

    return res.json({
      transactions: rows.map((r) => ({
        id: r.id,
        delta: r.delta,
        reason: r.reason,
        bucket: r.bucket,
        source: r.source,
        balanceAfter: r.balanceAfter,
        metadata: r.metadata,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch credit transactions");
    return res.status(500).json({ error: "failed_to_fetch_transactions" });
  }
});

/**
 * POST /api/credits/claim-free
 * Claim the one-time free signup bonus for this device.
 * Body: { deviceId: string }
 *
 * Each physical device may only claim credits once, regardless of how many
 * Clerk accounts are created on it. Idempotent — safe to call on every sign-in.
 */
router.post("/credits/claim-free", requireAuth(), async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const body = (req.body ?? {}) as { deviceId?: unknown };
  const deviceId = typeof body.deviceId === "string" ? body.deviceId.trim() : "";

  if (!deviceId) {
    return res.status(400).json({ error: "deviceId is required" });
  }

  try {
    // Fetch email from Clerk for disposable-email check
    let userEmail: string | undefined;
    try {
      const clerkUser = await clerkClient.users.getUser(userId);
      userEmail = clerkUser.emailAddresses?.[0]?.emailAddress;
    } catch {
      // Non-fatal — proceed without email check
    }

    const result = await claimFreeCredits(userId, deviceId, userEmail);

    req.log.info({ userId, deviceId, ...result }, "claim-free-credits");

    return res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to claim free credits");
    return res.status(500).json({ error: "failed_to_claim_credits" });
  }
});

export default router;

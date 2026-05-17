import { Router, type IRouter } from "express";
import { requireAuth, getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { creditTransactions } from "@workspace/db/schema";
import { desc, eq } from "drizzle-orm";
import { getBalance } from "../services/credits.js";

const router: IRouter = Router();

/**
 * GET /api/credits/balance
 * Returns current credit balance for the authenticated user.
 */
router.get("/credits/balance", requireAuth(), async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "unauthorized" });
  }

  try {
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

export default router;

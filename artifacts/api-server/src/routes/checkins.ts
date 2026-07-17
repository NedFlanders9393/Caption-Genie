import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { getCheckinStatus, claimDailyCheckin } from "../services/checkins.js";

const router: IRouter = Router();

/**
 * Identity: Clerk userId when signed in, else `guest_<deviceId>` from the
 * stable X-Device-Id header — the exact same scheme as the credit ledger, so
 * check-in rewards flow into whichever balance the user actually spends from
 * (guest-accessible per Apple 5.1.1).
 */
function resolveIdentity(req: Parameters<typeof getAuth>[0]): string | null {
  const authedUserId = getAuth(req).userId;
  const deviceId = (req as { header(name: string): string | undefined }).header("x-device-id")?.trim();
  return authedUserId ?? (deviceId ? `guest_${deviceId}` : null);
}

/**
 * GET /api/checkins/status
 * Calendar + streak state for the daily check-in screen.
 */
router.get("/checkins/status", async (req, res) => {
  const userId = resolveIdentity(req);
  if (!userId) {
    return res.status(401).json({ error: "unauthorized" });
  }
  try {
    const status = await getCheckinStatus(userId);
    return res.json(status);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch check-in status");
    return res.status(500).json({ error: "failed_to_fetch_checkin_status" });
  }
});

/**
 * POST /api/checkins/claim
 * Claim today's check-in reward. Server clock (UTC) decides the day —
 * idempotent per day, safe against double-taps and clock tampering.
 */
router.post("/checkins/claim", async (req, res) => {
  const userId = resolveIdentity(req);
  if (!userId) {
    return res.status(401).json({ error: "unauthorized" });
  }
  try {
    const result = await claimDailyCheckin(userId);
    if (result.alreadyClaimed) {
      return res.status(409).json({
        error: "already_claimed",
        message: "You've already claimed today's reward. Come back tomorrow!",
        streakDay: result.streakDay,
      });
    }
    req.log.info(
      { userId, granted: result.granted, streakDay: result.streakDay },
      "daily-checkin-claimed"
    );
    const status = await getCheckinStatus(userId);
    return res.json({
      granted: result.granted,
      streakDay: result.streakDay,
      balanceAfter: result.balanceAfter,
      status,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to claim daily check-in");
    return res.status(500).json({ error: "failed_to_claim_checkin" });
  }
});

export default router;

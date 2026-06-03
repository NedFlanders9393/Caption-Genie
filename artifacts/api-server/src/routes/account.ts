import { Router, type IRouter, type Request, type Response } from "express";
import { requireAuth, getAuth, clerkClient } from "@clerk/express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";

const router: IRouter = Router();

router.use("/account", requireAuth({ signInUrl: "/api/unauthorized" }));

/**
 * DELETE /api/account
 *
 * Permanently deletes the authenticated user's account and all associated
 * server-side data. Required by Apple App Store Guideline 5.1.1(v): any app
 * that supports account creation must let users delete their account from
 * within the app.
 *
 * Order: clear all data rows first, then delete the Clerk user. If the Clerk
 * deletion fails the request errors so the client can retry. Each table delete
 * tolerates a missing relation (caption_history / user_favorites are created
 * lazily on first use and may not exist yet).
 *
 * Note: deleting the account does NOT cancel an active App Store subscription —
 * Apple manages that separately. The client warns the user accordingly.
 */
router.delete("/account", async (req: Request, res: Response) => {
  const log = req.log;
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const deletes: { table: string; run: () => Promise<unknown> }[] = [
    { table: "caption_history", run: () => db.execute(sql`DELETE FROM caption_history WHERE user_id = ${userId}`) },
    { table: "user_favorites", run: () => db.execute(sql`DELETE FROM user_favorites WHERE user_id = ${userId}`) },
    { table: "monthly_usage", run: () => db.execute(sql`DELETE FROM monthly_usage WHERE user_id = ${userId}`) },
    { table: "credit_transactions", run: () => db.execute(sql`DELETE FROM credit_transactions WHERE user_id = ${userId}`) },
    { table: "user_credits", run: () => db.execute(sql`DELETE FROM user_credits WHERE user_id = ${userId}`) },
    { table: "device_free_credits", run: () => db.execute(sql`DELETE FROM device_free_credits WHERE user_id = ${userId}`) },
    { table: "processed_rc_events", run: () => db.execute(sql`DELETE FROM processed_rc_events WHERE user_id = ${userId}`) },
    { table: "bug_reports", run: () => db.execute(sql`DELETE FROM bug_reports WHERE user_id = ${userId}`) },
    { table: "users", run: () => db.execute(sql`DELETE FROM users WHERE id = ${userId}`) },
  ];

  for (const d of deletes) {
    try {
      await d.run();
    } catch (err: any) {
      // 42P01 = undefined_table — lazily-created tables may not exist yet.
      if (err?.code === "42P01") continue;
      log.error({ err, table: d.table, userId }, "Account deletion: failed to clear table");
      res.status(500).json({ error: "Failed to delete account data. Please try again." });
      return;
    }
  }

  try {
    await clerkClient.users.deleteUser(userId);
  } catch (err) {
    log.error({ err, userId }, "Account deletion: Clerk user delete failed");
    res.status(500).json({ error: "Failed to delete account. Please try again." });
    return;
  }

  log.info({ userId }, "Account deleted");
  res.json({ ok: true });
});

export default router;

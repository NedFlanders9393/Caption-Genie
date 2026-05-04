import { Router, type IRouter, type Request, type Response } from "express";
import { requireAuth, getAuth } from "@clerk/express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";

const router: IRouter = Router();

async function ensureTable() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS user_favorites (
      id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      saved_at BIGINT NOT NULL,
      data JSONB NOT NULL,
      PRIMARY KEY (id, user_id)
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS user_favorites_user_idx
    ON user_favorites (user_id, saved_at DESC)
  `);
}

let tableReady = false;
async function withTable(fn: () => Promise<void>, res: Response) {
  try {
    if (!tableReady) {
      await ensureTable();
      tableReady = true;
    }
    await fn();
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Internal server error" });
  }
}

router.use("/favorites", requireAuth({ signInUrl: "/api/unauthorized" }));

router.get("/favorites", async (req: Request, res: Response) => {
  await withTable(async () => {
    const { userId } = getAuth(req);
    const result = await db.execute(sql`
      SELECT data FROM user_favorites
      WHERE user_id = ${userId}
      ORDER BY saved_at DESC
    `);
    const entries = (result.rows as { data: unknown }[]).map((r) => r.data);
    res.json({ entries });
  }, res);
});

router.post("/favorites", async (req: Request, res: Response) => {
  await withTable(async () => {
    const { userId } = getAuth(req);
    const entry = req.body;
    if (!entry?.id || typeof entry.id !== "string") {
      res.status(400).json({ error: "Missing entry.id" });
      return;
    }
    const savedAt: number = typeof entry.savedAt === "number" ? entry.savedAt : Date.now();
    await db.execute(sql`
      INSERT INTO user_favorites (id, user_id, saved_at, data)
      VALUES (${entry.id}, ${userId}, ${savedAt}, ${JSON.stringify(entry)}::jsonb)
      ON CONFLICT (id, user_id) DO UPDATE SET data = EXCLUDED.data
    `);
    res.json({ ok: true });
  }, res);
});

router.delete("/favorites/:id", async (req: Request, res: Response) => {
  await withTable(async () => {
    const { userId } = getAuth(req);
    const { id } = req.params;
    await db.execute(sql`
      DELETE FROM user_favorites
      WHERE id = ${id} AND user_id = ${userId}
    `);
    res.json({ ok: true });
  }, res);
});

export default router;

import { Router, type IRouter, type Request, type Response } from "express";
import { requireAuth, getAuth } from "@clerk/express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";

const router: IRouter = Router();

async function ensureTable() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS caption_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at BIGINT NOT NULL,
      data JSONB NOT NULL
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS caption_history_user_idx
    ON caption_history (user_id, created_at DESC)
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

router.use("/history", requireAuth({ signInUrl: "/api/unauthorized" }));

router.get("/history", async (req: Request, res: Response) => {
  await withTable(async () => {
    const { userId } = getAuth(req);
    const result = await db.execute(sql`
      SELECT data FROM caption_history
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 200
    `);
    const entries = (result.rows as { data: unknown }[]).map((r) => r.data);
    res.json({ entries });
  }, res);
});

router.post("/history", async (req: Request, res: Response) => {
  await withTable(async () => {
    const { userId } = getAuth(req);
    const entry = req.body;
    if (!entry?.id || typeof entry.id !== "string") {
      res.status(400).json({ error: "Missing entry.id" });
      return;
    }
    const createdAt: number = typeof entry.createdAt === "number" ? entry.createdAt : Date.now();
    await db.execute(sql`
      INSERT INTO caption_history (id, user_id, created_at, data)
      VALUES (${entry.id}, ${userId}, ${createdAt}, ${JSON.stringify(entry)}::jsonb)
      ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data
    `);
    res.json({ ok: true });
  }, res);
});

router.delete("/history/all", async (req: Request, res: Response) => {
  await withTable(async () => {
    const { userId } = getAuth(req);
    await db.execute(sql`
      DELETE FROM caption_history WHERE user_id = ${userId}
    `);
    res.json({ ok: true });
  }, res);
});

router.delete("/history/:id", async (req: Request, res: Response) => {
  await withTable(async () => {
    const { userId } = getAuth(req);
    const { id } = req.params;
    await db.execute(sql`
      DELETE FROM caption_history
      WHERE id = ${id} AND user_id = ${userId}
    `);
    res.json({ ok: true });
  }, res);
});

export default router;

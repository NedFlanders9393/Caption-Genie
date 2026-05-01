import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { bugReports } from "@workspace/db";
import { sql, desc } from "drizzle-orm";

const bugsRouter: IRouter = Router();

async function ensureTable() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS bug_reports (
      id SERIAL PRIMARY KEY,
      user_id TEXT,
      user_email TEXT,
      description TEXT NOT NULL,
      expected_behavior TEXT,
      screen TEXT,
      app_version TEXT,
      platform TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

ensureTable().catch(() => {});

bugsRouter.post("/api/bugs", async (req, res) => {
  try {
    const auth = getAuth(req);
    const { description, expectedBehavior, screen, appVersion, platform, userEmail } = req.body as {
      description?: string;
      expectedBehavior?: string;
      screen?: string;
      appVersion?: string;
      platform?: string;
      userEmail?: string;
    };

    if (!description || description.trim().length < 5) {
      res.status(400).json({ error: "Please provide a description of the bug." });
      return;
    }

    await db.insert(bugReports).values({
      userId: auth?.userId ?? null,
      userEmail: userEmail?.trim() ?? null,
      description: description.trim(),
      expectedBehavior: expectedBehavior?.trim() ?? null,
      screen: screen?.trim() ?? null,
      appVersion: appVersion?.trim() ?? null,
      platform: platform?.trim() ?? null,
      status: "open",
    });

    res.json({ success: true, message: "Bug report submitted. Thank you!" });
  } catch (err) {
    req.log?.error({ err }, "Failed to save bug report");
    res.status(500).json({ error: "Failed to submit bug report. Please try again." });
  }
});

bugsRouter.get("/api/bugs", async (req, res) => {
  try {
    const { status = "open", limit = "50" } = req.query as { status?: string; limit?: string };
    const reports = await db
      .select()
      .from(bugReports)
      .where(status !== "all" ? sql`status = ${status}` : sql`1=1`)
      .orderBy(desc(bugReports.createdAt))
      .limit(Math.min(parseInt(limit, 10) || 50, 100));

    res.json({ reports, count: reports.length });
  } catch (err) {
    req.log?.error({ err }, "Failed to fetch bug reports");
    res.status(500).json({ error: "Failed to fetch bug reports." });
  }
});

export default bugsRouter;

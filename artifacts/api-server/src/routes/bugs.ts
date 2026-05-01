import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { bugReports } from "@workspace/db";
import { sql, desc } from "drizzle-orm";
import { getResendClient } from "../resendClient";

const OWNER_EMAIL = "Nedflanders9393@gmail.com";

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

bugsRouter.post("/bugs", async (req, res) => {
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

    // Fire emails in the background — don't block the response
    sendBugEmails({
      description: description.trim(),
      expectedBehavior: expectedBehavior?.trim(),
      platform: platform?.trim(),
      appVersion: appVersion?.trim(),
      userEmail: userEmail?.trim(),
    }).catch(() => {});

    res.json({ success: true, message: "Bug report submitted. Thank you!" });
  } catch (err) {
    req.log?.error({ err }, "Failed to save bug report");
    res.status(500).json({ error: "Failed to submit bug report. Please try again." });
  }
});

bugsRouter.get("/bugs", async (req, res) => {
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

// ── Email helpers ─────────────────────────────────────────────────────────────

interface BugEmailPayload {
  description: string;
  expectedBehavior?: string;
  platform?: string;
  appVersion?: string;
  userEmail?: string;
}

async function sendBugEmails(payload: BugEmailPayload) {
  const { client, fromEmail } = await getResendClient();
  const { description, expectedBehavior, platform, appVersion, userEmail } = payload;

  const platformLine = platform ? `<p><strong>Platform:</strong> ${platform}${appVersion ? ` v${appVersion}` : ""}</p>` : "";
  const expectedLine = expectedBehavior ? `<p><strong>Expected behavior:</strong> ${expectedBehavior}</p>` : "";
  const userLine = userEmail ? `<p><strong>From:</strong> ${userEmail}</p>` : "<p><strong>From:</strong> Anonymous user</p>";

  // 1) Notify the owner
  await client.emails.send({
    from: fromEmail,
    to: OWNER_EMAIL,
    subject: "🐛 New Bug Report — Inkwell",
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:auto;color:#3A3129;">
        <div style="background:#3A3129;padding:24px 32px;border-radius:12px 12px 0 0;">
          <h1 style="color:#E8B669;margin:0;font-size:22px;">New Bug Report</h1>
          <p style="color:#C4B09A;margin:6px 0 0;font-size:14px;">Someone submitted a report in Inkwell</p>
        </div>
        <div style="background:#FFFDF9;border:1px solid #F0E3D3;border-top:none;padding:24px 32px;border-radius:0 0 12px 12px;">
          ${userLine}
          <p><strong>Description:</strong></p>
          <blockquote style="border-left:3px solid #E8B669;margin:0 0 16px;padding:10px 16px;background:#F8EFE4;border-radius:4px;">
            ${description}
          </blockquote>
          ${expectedLine}
          ${platformLine}
          <hr style="border:none;border-top:1px solid #F0E3D3;margin:20px 0;" />
          <p style="font-size:12px;color:#8C7A6B;">
            Status: <strong>Open</strong> — ask the agent to review and fix this report any time.
          </p>
        </div>
      </div>
    `,
  });

  // 2) Auto-reply to the user (only if they have an email)
  if (userEmail) {
    await client.emails.send({
      from: fromEmail,
      to: userEmail,
      subject: "We got your report — Inkwell",
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:auto;color:#3A3129;">
          <div style="background:#3A3129;padding:24px 32px;border-radius:12px 12px 0 0;">
            <h1 style="color:#E8B669;margin:0;font-size:22px;">Thanks for reaching out ✨</h1>
          </div>
          <div style="background:#FFFDF9;border:1px solid #F0E3D3;border-top:none;padding:24px 32px;border-radius:0 0 12px 12px;">
            <p>Hi there,</p>
            <p>We received your bug report and we're on it. Every submission gets reviewed personally — we take this seriously.</p>
            <p><strong>Your report:</strong></p>
            <blockquote style="border-left:3px solid #E8B669;margin:0 0 16px;padding:10px 16px;background:#F8EFE4;border-radius:4px;">
              ${description}
            </blockquote>
            <p>We'll reach out if we need more details. Thanks for helping make Inkwell better!</p>
            <p style="margin-top:24px;">— The Inkwell Team</p>
            <hr style="border:none;border-top:1px solid #F0E3D3;margin:20px 0;" />
            <p style="font-size:12px;color:#8C7A6B;">You're receiving this because you submitted a bug report in the Inkwell app.</p>
          </div>
        </div>
      `,
    });
  }
}

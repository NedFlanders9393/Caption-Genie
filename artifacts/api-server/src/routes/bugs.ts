import { Router, type IRouter, type Request } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { db } from "@workspace/db";
import { bugReports } from "@workspace/db";
import { sql, desc } from "drizzle-orm";
import { getResendClient } from "../resendClient";
import { logger } from "../lib/logger";

const OWNER_EMAIL = "nedflanders9393@gmail.com";

const bugsRouter: IRouter = Router();

const isProd = process.env.NODE_ENV === "production";

// Owner-only allowlist for reading submissions (bug reports + suggestions can
// contain user emails and free-text PII, so the GET endpoint must not be public).
function adminAllowlist(): string[] {
  return [process.env.PRO_OVERRIDE_EMAILS, process.env.ADMIN_EMAILS]
    .filter((v): v is string => !!v)
    .flatMap((v) => v.split(","))
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

async function isAuthorizedReader(req: Request): Promise<boolean> {
  const emails = adminAllowlist();
  if (emails.length > 0) {
    try {
      const { userId } = getAuth(req);
      if (userId) {
        const user = await clerkClient.users.getUser(userId);
        const email = user.emailAddresses?.[0]?.emailAddress?.toLowerCase();
        if (email && emails.includes(email)) return true;
      }
    } catch {
      /* fall through to deny */
    }
  }
  // Nothing configured: allow in dev for local debugging, deny in prod.
  if (emails.length === 0) return !isProd;
  return false;
}

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
  // Add type column if it doesn't exist yet (crash vs. bug)
  await db.execute(sql`
    ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'bug'
  `);
}

ensureTable().catch(() => {});

bugsRouter.post("/bugs", async (req, res) => {
  try {
    const auth = getAuth(req);
    const { description, expectedBehavior, screen, appVersion, platform, userEmail, type } = req.body as {
      description?: string;
      expectedBehavior?: string;
      screen?: string;
      appVersion?: string;
      platform?: string;
      userEmail?: string;
      type?: "bug" | "crash" | "suggestion";
    };

    if (!description || description.trim().length < 5) {
      res.status(400).json({ error: "Please provide a description." });
      return;
    }

    const reportType =
      type === "crash" ? "crash" : type === "suggestion" ? "suggestion" : "bug";

    await db.execute(sql`
      INSERT INTO bug_reports (user_id, user_email, description, expected_behavior, screen, app_version, platform, status, type)
      VALUES (
        ${auth?.userId ?? null},
        ${userEmail?.trim() ?? null},
        ${description.trim()},
        ${expectedBehavior?.trim() ?? null},
        ${screen?.trim() ?? null},
        ${appVersion?.trim() ?? null},
        ${platform?.trim() ?? null},
        'open',
        ${reportType}
      )
    `);

    // Fire emails in the background — don't block the response
    sendBugEmails({
      description: description.trim(),
      expectedBehavior: expectedBehavior?.trim(),
      platform: platform?.trim(),
      appVersion: appVersion?.trim(),
      userEmail: userEmail?.trim(),
      type: reportType,
    }).catch((emailErr) => {
      logger.error({ err: emailErr }, "Failed to send bug report emails");
    });

    res.json({ success: true, message: "Bug report submitted. Thank you!" });
  } catch (err) {
    req.log?.error({ err }, "Failed to save bug report");
    res.status(500).json({ error: "Failed to submit bug report. Please try again." });
  }
});

bugsRouter.get("/bugs", async (req, res) => {
  try {
    if (!(await isAuthorizedReader(req))) {
      res.status(403).json({ error: "Not authorized." });
      return;
    }
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
  type?: "bug" | "crash" | "suggestion";
}

async function sendBugEmails(payload: BugEmailPayload) {
  logger.info("Sending bug report emails via Resend...");
  const { client, fromEmail } = await getResendClient();
  logger.info({ fromEmail }, "Resend client ready");
  const { description, expectedBehavior, platform, appVersion, userEmail, type } = payload;
  const isCrash = type === "crash";
  const isSuggestion = type === "suggestion";

  const platformLine = platform
    ? `<p><strong>Platform:</strong> ${platform}${appVersion ? ` v${appVersion}` : ""}</p>`
    : "";
  const userLine = userEmail
    ? `<p><strong>From:</strong> ${userEmail}</p>`
    : "<p><strong>From:</strong> Anonymous user</p>";

  const headerBg = isCrash ? "#8B0000" : isSuggestion ? "#1F3A2E" : "#3A3129";
  const accentColor = isCrash ? "#FF6B6B" : isSuggestion ? "#7CD9A6" : "#E8B669";
  const blockquoteBg = isCrash ? "#FFF0F0" : isSuggestion ? "#EFF8F2" : "#F8EFE4";
  const emoji = isCrash ? "🚨" : isSuggestion ? "💡" : "🐛";
  const title = isCrash ? "Crash Report" : isSuggestion ? "New Suggestion" : "New Bug Report";
  const subtitle = isCrash
    ? "The app crashed automatically — no user action needed"
    : isSuggestion
    ? "Someone shared an idea in Captly"
    : "Someone submitted a report in Captly";
  const subject = isCrash
    ? `🚨 App Crash — Captly`
    : isSuggestion
    ? `💡 New Suggestion — Captly`
    : `🐛 New Bug Report — Captly`;

  const stackSection = isCrash && expectedBehavior
    ? `<p><strong>Stack trace:</strong></p>
       <pre style="background:#F5F5F5;padding:12px;border-radius:4px;font-size:11px;overflow:auto;white-space:pre-wrap;">${expectedBehavior}</pre>`
    : expectedBehavior
    ? `<p><strong>Expected behavior:</strong> ${expectedBehavior}</p>`
    : "";

  const screenLine = isCrash
    ? ""  // screen is used as context in crash reports, included in description
    : "";

  const result = await client.emails.send({
    from: fromEmail,
    to: OWNER_EMAIL,
    subject,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:auto;color:#3A3129;">
        <div style="background:${headerBg};padding:24px 32px;border-radius:12px 12px 0 0;">
          <h1 style="color:${accentColor};margin:0;font-size:22px;">${emoji} ${title}</h1>
          <p style="color:#C4B09A;margin:6px 0 0;font-size:14px;">${subtitle}</p>
        </div>
        <div style="background:#FFFDF9;border:1px solid #F0E3D3;border-top:none;padding:24px 32px;border-radius:0 0 12px 12px;">
          ${userLine}
          ${platformLine}
          <p><strong>${isCrash ? "Error:" : isSuggestion ? "Suggestion:" : "Description:"}</strong></p>
          <blockquote style="border-left:3px solid ${accentColor};margin:0 0 16px;padding:10px 16px;background:${blockquoteBg};border-radius:4px;font-family:${isCrash ? "monospace" : "inherit"};">
            ${description.replace("[CRASH] ", "")}
          </blockquote>
          ${stackSection}
          ${screenLine}
          <hr style="border:none;border-top:1px solid #F0E3D3;margin:20px 0;" />
          <p style="font-size:12px;color:#8C7A6B;">
            Status: <strong>Open</strong> — ask the agent to review and fix this report any time.
          </p>
        </div>
      </div>
    `,
  });

  logger.info({ resendId: result.data?.id, resendError: result.error }, "Bug/crash email result");
}

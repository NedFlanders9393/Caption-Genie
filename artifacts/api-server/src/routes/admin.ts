/**
 * Owner-only cost dashboard.
 *
 * Two surfaces:
 *   GET /api/admin/costs       — HTML dashboard (open in a browser)
 *   GET /api/admin/costs.json  — raw JSON for the same data
 *
 * Access control (fails CLOSED in production):
 *   - A signed-in Clerk user whose email is in PRO_OVERRIDE_EMAILS or
 *     ADMIN_EMAILS, OR
 *   - a ?token=... query param matching COST_DASHBOARD_TOKEN.
 *   - In development, if neither allowlist nor token is configured, access is
 *     allowed so the owner can see it locally without setup. In production an
 *     unconfigured dashboard is locked.
 */
import { Router, type IRouter, type Request, type Response } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { getSpendSnapshot } from "../services/costGuard.js";

const adminRouter: IRouter = Router();

const isProd = process.env.NODE_ENV === "production";

function allowlist(): string[] {
  return [process.env.PRO_OVERRIDE_EMAILS, process.env.ADMIN_EMAILS]
    .filter((v): v is string => !!v)
    .flatMap((v) => v.split(","))
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

async function isAuthorized(req: Request): Promise<boolean> {
  const token = process.env.COST_DASHBOARD_TOKEN;
  const provided = (req.query.token as string | undefined)?.trim();
  if (token && provided && provided === token) return true;

  const emails = allowlist();
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

  // Nothing configured at all: allow in dev, deny in prod.
  if (!token && emails.length === 0) return !isProd;
  return false;
}

function usd(micros: number): string {
  return `$${(micros / 1_000_000).toFixed(2)}`;
}

interface CostSummary {
  spend: Awaited<ReturnType<typeof getSpendSnapshot>>;
  today: { action: string; tier: string; calls: number; costMicros: number }[];
  month: { action: string; tier: string; calls: number; costMicros: number }[];
  topUsersMonth: { userId: string; calls: number; costMicros: number }[];
  recent: { createdAt: string; action: string; tier: string; model: string; costMicros: number }[];
}

async function buildSummary(): Promise<CostSummary> {
  const spend = await getSpendSnapshot();

  const dayStart = (() => {
    const n = new Date();
    return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
  })();
  const monthStart = (() => {
    const n = new Date();
    return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), 1));
  })();

  const [todayRows, monthRows, topRows, recentRows] = await Promise.all([
    db.execute(sql`
      SELECT action, tier, COUNT(*)::int AS calls, COALESCE(SUM(cost_micros),0)::bigint AS cost
      FROM ai_cost_events WHERE created_at >= ${dayStart}
      GROUP BY action, tier ORDER BY cost DESC`),
    db.execute(sql`
      SELECT action, tier, COUNT(*)::int AS calls, COALESCE(SUM(cost_micros),0)::bigint AS cost
      FROM ai_cost_events WHERE created_at >= ${monthStart}
      GROUP BY action, tier ORDER BY cost DESC`),
    db.execute(sql`
      SELECT user_id AS "userId", COUNT(*)::int AS calls, COALESCE(SUM(cost_micros),0)::bigint AS cost
      FROM ai_cost_events WHERE created_at >= ${monthStart}
      GROUP BY user_id ORDER BY cost DESC LIMIT 10`),
    db.execute(sql`
      SELECT created_at AS "createdAt", action, tier, model, cost_micros AS cost
      FROM ai_cost_events ORDER BY created_at DESC LIMIT 25`),
  ]);

  const num = (v: unknown) => Number(v ?? 0);
  return {
    spend,
    today: todayRows.rows.map((r: Record<string, unknown>) => ({
      action: String(r.action), tier: String(r.tier), calls: num(r.calls), costMicros: num(r.cost),
    })),
    month: monthRows.rows.map((r: Record<string, unknown>) => ({
      action: String(r.action), tier: String(r.tier), calls: num(r.calls), costMicros: num(r.cost),
    })),
    topUsersMonth: topRows.rows.map((r: Record<string, unknown>) => ({
      userId: String(r.userId), calls: num(r.calls), costMicros: num(r.cost),
    })),
    recent: recentRows.rows.map((r: Record<string, unknown>) => ({
      createdAt: new Date(r.createdAt as string).toISOString(), action: String(r.action),
      tier: String(r.tier), model: String(r.model), costMicros: num(r.cost),
    })),
  };
}

adminRouter.get("/admin/costs.json", async (req: Request, res: Response) => {
  if (!(await isAuthorized(req))) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  try {
    res.json(await buildSummary());
  } catch (err) {
    req.log.error({ err }, "Cost dashboard JSON failed");
    res.status(500).json({ error: "Failed to load cost summary" });
  }
});

function pct(part: number, whole: number | null): string {
  if (!whole || whole <= 0) return "—";
  return `${((part / whole) * 100).toFixed(1)}%`;
}

function renderHtml(s: CostSummary): string {
  const esc = (v: string) => v.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
  const row = (cols: string[]) => `<tr>${cols.map((c) => `<td>${c}</td>`).join("")}</tr>`;

  const dailyCap = s.spend.dailyCapMicros;
  const monthlyCap = s.spend.monthlyCapMicros;
  const dayOver = dailyCap != null && s.spend.dayMicros >= dailyCap;
  const monthOver = monthlyCap != null && s.spend.monthMicros >= monthlyCap;

  return `<!doctype html><html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>CaptionAI · Cost Dashboard</title>
<style>
  :root { --p:#7C3AED; --bg:#0f0b1e; --card:#1a1430; --line:#2c2347; --txt:#ece9f5; --mut:#a89fce; --ok:#34d399; --bad:#f87171; }
  * { box-sizing:border-box; } body { margin:0; background:var(--bg); color:var(--txt); font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Inter,sans-serif; }
  .wrap { max-width:1000px; margin:0 auto; padding:32px 20px 80px; }
  h1 { font-size:22px; margin:0 0 4px; } .sub { color:var(--mut); margin:0 0 28px; font-size:13px; }
  .cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:16px; margin-bottom:32px; }
  .card { background:var(--card); border:1px solid var(--line); border-radius:14px; padding:18px; }
  .card .label { color:var(--mut); font-size:12px; text-transform:uppercase; letter-spacing:.06em; }
  .card .big { font-size:30px; font-weight:700; margin:6px 0 2px; }
  .card .cap { font-size:13px; color:var(--mut); }
  .bar { height:8px; border-radius:6px; background:#2c2347; overflow:hidden; margin-top:12px; }
  .bar > span { display:block; height:100%; background:var(--p); }
  .bar > span.over { background:var(--bad); }
  .badge { display:inline-block; font-size:11px; padding:2px 8px; border-radius:999px; background:#26203f; color:var(--mut); }
  .badge.ok { color:var(--ok); } .badge.bad { color:var(--bad); }
  h2 { font-size:15px; margin:28px 0 10px; color:var(--mut); text-transform:uppercase; letter-spacing:.06em; }
  table { width:100%; border-collapse:collapse; background:var(--card); border:1px solid var(--line); border-radius:12px; overflow:hidden; }
  th,td { text-align:left; padding:10px 14px; border-bottom:1px solid var(--line); font-size:13px; }
  th { color:var(--mut); font-weight:600; text-transform:uppercase; font-size:11px; letter-spacing:.05em; }
  tr:last-child td { border-bottom:none; } td:last-child, th:last-child { text-align:right; }
  .mono { font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:12px; color:var(--mut); }
</style></head><body><div class="wrap">
  <h1>CaptionAI · Cost Dashboard</h1>
  <p class="sub">AI spend guardrails · UTC windows · generated ${new Date().toISOString()}</p>

  <div class="cards">
    <div class="card">
      <div class="label">Today's spend</div>
      <div class="big">${usd(s.spend.dayMicros)}</div>
      <div class="cap">${dailyCap != null ? `of ${usd(dailyCap)} cap · ${pct(s.spend.dayMicros, dailyCap)}` : "no daily cap set"}</div>
      ${dailyCap != null ? `<div class="bar"><span class="${dayOver ? "over" : ""}" style="width:${Math.min(100, (s.spend.dayMicros / dailyCap) * 100).toFixed(1)}%"></span></div>` : ""}
      <div style="margin-top:10px"><span class="badge ${dayOver ? "bad" : "ok"}">${dayOver ? "CAP REACHED" : "OK"}</span></div>
    </div>
    <div class="card">
      <div class="label">This month's spend</div>
      <div class="big">${usd(s.spend.monthMicros)}</div>
      <div class="cap">${monthlyCap != null ? `of ${usd(monthlyCap)} cap · ${pct(s.spend.monthMicros, monthlyCap)}` : "no monthly cap set"}</div>
      ${monthlyCap != null ? `<div class="bar"><span class="${monthOver ? "over" : ""}" style="width:${Math.min(100, (s.spend.monthMicros / monthlyCap) * 100).toFixed(1)}%"></span></div>` : ""}
      <div style="margin-top:10px"><span class="badge ${monthOver ? "bad" : "ok"}">${monthOver ? "CAP REACHED" : "OK"}</span></div>
    </div>
  </div>

  <h2>This month by action &amp; tier</h2>
  <table><thead><tr><th>Action</th><th>Tier</th><th>Calls</th><th>Cost</th></tr></thead><tbody>
    ${s.month.length ? s.month.map((r) => row([esc(r.action), esc(r.tier), String(r.calls), usd(r.costMicros)])).join("") : row(["—", "—", "0", "$0.00"])}
  </tbody></table>

  <h2>Today by action &amp; tier</h2>
  <table><thead><tr><th>Action</th><th>Tier</th><th>Calls</th><th>Cost</th></tr></thead><tbody>
    ${s.today.length ? s.today.map((r) => row([esc(r.action), esc(r.tier), String(r.calls), usd(r.costMicros)])).join("") : row(["—", "—", "0", "$0.00"])}
  </tbody></table>

  <h2>Top spenders this month</h2>
  <table><thead><tr><th>User</th><th>Calls</th><th>Cost</th></tr></thead><tbody>
    ${s.topUsersMonth.length ? s.topUsersMonth.map((r) => row([`<span class="mono">${esc(r.userId)}</span>`, String(r.calls), usd(r.costMicros)])).join("") : row(["—", "0", "$0.00"])}
  </tbody></table>

  <h2>Recent calls</h2>
  <table><thead><tr><th>When (UTC)</th><th>Action</th><th>Tier</th><th>Model</th><th>Cost</th></tr></thead><tbody>
    ${s.recent.length ? s.recent.map((r) => row([`<span class="mono">${esc(r.createdAt.replace("T", " ").slice(0, 19))}</span>`, esc(r.action), esc(r.tier), `<span class="mono">${esc(r.model)}</span>`, usd(r.costMicros)])).join("") : row(["—", "—", "—", "—", "$0.00"])}
  </tbody></table>
</div></body></html>`;
}

adminRouter.get("/admin/costs", async (req: Request, res: Response) => {
  if (!(await isAuthorized(req))) {
    res.status(403).type("html").send("<h1>403 — Forbidden</h1><p>This dashboard is owner-only.</p>");
    return;
  }
  try {
    const summary = await buildSummary();
    res.type("html").send(renderHtml(summary));
  } catch (err) {
    req.log.error({ err }, "Cost dashboard failed");
    res.status(500).type("html").send("<h1>500</h1><p>Failed to load cost dashboard.</p>");
  }
});

export default adminRouter;

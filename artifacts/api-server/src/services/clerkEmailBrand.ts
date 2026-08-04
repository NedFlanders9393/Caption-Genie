import { logger } from "../lib/logger.js";

/**
 * One-time, idempotent rebrand of Clerk's email templates.
 *
 * Why this exists: the verification / sign-in emails Clerk sends display the
 * Clerk *application name* (a stale "Caption Genie") in both the sender name and
 * the in-email header, and there is no Clerk dashboard for a Replit-managed
 * tenant. The development instance was already rebranded to "Captly", but the
 * PRODUCTION instance is a separate copy that never received the change — and
 * its secret key only exists inside the deployed server. So we apply the rebrand
 * from here, on boot, using whatever CLERK_SECRET_KEY is injected for the
 * current environment (sk_live in production, sk_test in development).
 *
 * It is safe to run on every boot: it only rewrites a template when that
 * template still contains an old name, so after the first successful run it is a
 * no-op.
 */

const REBRAND_TO = "Captly";
// Old names (and the templated app-name variable) to scrub out of templates.
const OLD_NAMES = ["Caption Genie", "CaptionAI", "Caption AI"];
const APP_NAME_VAR = "{{app.name}}";

// Clerk partials that render the (stale, unrenamable) application name at SEND
// time, so plain text scrubbing never touches them. `{{> app_logo}}` prints the
// app name as the email's main header when no logo is uploaded; `{{> footer}}`
// prints "© <year> <app name>". We replace both partials with literal Captly
// branding so the rendered email no longer shows the old name.
const APP_LOGO_PARTIAL = "{{> app_logo}}";
const FOOTER_PARTIAL = "{{> footer}}";
const FOOTER_REPLACEMENT =
  '<p style="padding:0;margin:0;font-family:Helvetica,Arial,sans-serif;color:#9ca3af;font-size:12px;line-height:18px;">&copy; Captly</p>';

const CLERK_API = "https://api.clerk.com";

/*
 * KNOWN LIMITATION — the sender DISPLAY name in the inbox list.
 *
 * Even after every template is rebranded, the name an inbox shows as the
 * sender ("From: Caption Genie via clerk.com") comes from the Clerk
 * *application name*, not from any template field. `from_email_name` only
 * controls the local-part of the address (Captly@accounts.dev).
 *
 * As of Aug 2026 the Clerk Backend API offers NO way to rename the
 * application on a Replit-managed tenant (no dashboard access either):
 *   - GET  /v1/instance returns only { id, object, environment_type,
 *     allowed_origins } — no name field.
 *   - PATCH /v1/instance with { name } or { application_name } returns
 *     204 but is a silent no-op (verified via the Frontend API's
 *     /v1/environment display_config.application_name, which still shows
 *     the old name).
 *   - /v1/instance/settings, /v1/display_config, /v1/applications → 404.
 *
 * tryRenameApplication() below re-attempts the rename on every boot and
 * VERIFIES the result, so if Clerk ever starts honoring the field (or adds
 * a rename endpoint reachable with the same PATCH), the fix applies itself
 * and the log line flips to "application renamed". Until then it logs the
 * limitation instead of pretending the 204 meant success.
 */

/** Derive the Frontend API domain from the publishable key (pk_*_<base64 of "domain$">). */
function frontendApiDomain(): string | null {
  const pk = process.env.CLERK_PUBLISHABLE_KEY;
  if (!pk) return null;
  const b64 = pk.replace(/^pk_(test|live)_/, "");
  try {
    const decoded = Buffer.from(b64, "base64").toString("utf8");
    const domain = decoded.replace(/\$$/, "");
    return /^[a-z0-9.-]+$/i.test(domain) ? domain : null;
  } catch {
    return null;
  }
}

/** Read the live application name Clerk renders (via the public Frontend API). */
async function getApplicationName(): Promise<string | null> {
  const domain = frontendApiDomain();
  if (!domain) return null;
  try {
    const res = await fetch(`https://${domain}/v1/environment`);
    if (!res.ok) return null;
    const json = (await res.json()) as {
      display_config?: { application_name?: string };
    };
    return json.display_config?.application_name ?? null;
  } catch {
    return null;
  }
}

/**
 * Attempt to rename the Clerk application itself (the source of the inbox
 * sender display name) and verify whether the rename actually took effect.
 * Idempotent and non-fatal; see the limitation comment above.
 */
async function tryRenameApplication(environment: string): Promise<void> {
  const before = await getApplicationName();
  if (before === REBRAND_TO) {
    logger.info(
      { environment, applicationName: before },
      "Clerk application name already correct",
    );
    return;
  }

  // Send both field spellings; Clerk currently ignores them (204 no-op).
  await clerkFetch("/v1/instance", {
    method: "PATCH",
    body: JSON.stringify({ name: REBRAND_TO, application_name: REBRAND_TO }),
  });

  const after = await getApplicationName();
  if (after === REBRAND_TO) {
    logger.info(
      { environment, applicationName: after },
      "Clerk application renamed — inbox sender name now rebranded",
    );
  } else {
    logger.warn(
      { environment, applicationName: after ?? "unknown" },
      "Clerk application name NOT renameable via API (known Replit-managed " +
        "limitation) — inbox sender display name will still show the old app " +
        "name; email content itself is fully rebranded",
    );
  }
}

interface EmailTemplate {
  slug: string;
  name?: string;
  subject?: string;
  body?: string;
  markup?: string;
  from_email_name?: string;
  reply_to_email_name?: string;
  delivered_by_clerk?: boolean;
}

async function clerkFetch(
  path: string,
  init?: RequestInit,
): Promise<{ status: number; json: unknown }> {
  const key = process.env.CLERK_SECRET_KEY;
  if (!key) throw new Error("CLERK_SECRET_KEY not set");
  const res = await fetch(`${CLERK_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: res.status, json };
}

function scrub(value: string | undefined): string | undefined {
  if (typeof value !== "string") return value;
  let out = value.split(APP_LOGO_PARTIAL).join(REBRAND_TO);
  out = out.split(FOOTER_PARTIAL).join(FOOTER_REPLACEMENT);
  out = out.split(APP_NAME_VAR).join(REBRAND_TO);
  for (const old of OLD_NAMES) out = out.split(old).join(REBRAND_TO);
  return out;
}

function needsRebrand(t: EmailTemplate): boolean {
  const blob = `${t.subject ?? ""}\n${t.body ?? ""}\n${t.markup ?? ""}`;
  if (blob.includes(APP_LOGO_PARTIAL)) return true;
  if (blob.includes(FOOTER_PARTIAL)) return true;
  if (blob.includes(APP_NAME_VAR)) return true;
  if (OLD_NAMES.some((n) => blob.includes(n))) return true;
  // Enforce the sender display name on every editable template. When
  // from_email_name is empty/unset, Clerk falls back to the (stale) application
  // name, so an unset value must also be corrected — not just a mismatched one.
  if (t.from_email_name !== REBRAND_TO) return true;
  return false;
}

/**
 * Rebrand all editable Clerk email templates to REBRAND_TO. Never throws.
 */
export async function rebrandClerkEmails(): Promise<void> {
  if (!process.env.CLERK_SECRET_KEY) {
    logger.warn("Clerk email rebrand skipped — CLERK_SECRET_KEY not set");
    return;
  }

  try {
    const inst = await clerkFetch("/v1/instance");
    const environment =
      (inst.json as { environment_type?: string } | null)?.environment_type ??
      "unknown";

    // Attempt (and verify) renaming the application itself — the source of
    // the inbox sender display name. Currently a documented no-op on
    // Replit-managed tenants; self-applies if Clerk ever allows it.
    await tryRenameApplication(environment);

    const list = await clerkFetch("/v1/templates/email");
    if (list.status !== 200) {
      logger.warn(
        { status: list.status, environment },
        "Clerk email rebrand: could not list templates",
      );
      return;
    }
    const raw = list.json as EmailTemplate[] | { data?: EmailTemplate[] };
    const templates: EmailTemplate[] = Array.isArray(raw) ? raw : (raw.data ?? []);

    let changed = 0;
    let alreadyClean = 0;
    let skippedLocked = 0;
    const failures: { slug: string; status: number }[] = [];

    for (const meta of templates) {
      const slug = meta.slug;
      // billing_* and commerce_* templates are locked by Clerk and irrelevant
      // (this app uses RevenueCat, not Clerk billing).
      if (/^(billing_|commerce_)/.test(slug)) {
        skippedLocked++;
        continue;
      }

      const got = await clerkFetch(
        `/v1/templates/email/${encodeURIComponent(slug)}`,
      );
      if (got.status !== 200) {
        failures.push({ slug, status: got.status });
        continue;
      }
      const t = got.json as EmailTemplate;
      if (!needsRebrand(t)) {
        alreadyClean++;
        continue;
      }

      const payload = {
        name: t.name,
        subject: scrub(t.subject),
        markup: scrub(t.markup),
        body: scrub(t.body),
        delivered_by_clerk: t.delivered_by_clerk,
        from_email_name: REBRAND_TO,
        reply_to_email_name: t.reply_to_email_name,
      };
      const put = await clerkFetch(
        `/v1/templates/email/${encodeURIComponent(slug)}`,
        { method: "PUT", body: JSON.stringify(payload) },
      );
      if (put.status === 200) {
        changed++;
      } else {
        failures.push({ slug, status: put.status });
      }
    }

    logger.info(
      {
        environment,
        rebrandedTo: REBRAND_TO,
        changed,
        alreadyClean,
        skippedLocked,
        failures,
      },
      "Clerk email rebrand complete",
    );
  } catch (err) {
    logger.warn({ err }, "Clerk email rebrand failed (non-fatal)");
  }
}

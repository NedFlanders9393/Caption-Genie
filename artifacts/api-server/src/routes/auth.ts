import { Router, type IRouter } from "express";
import { clerkClient } from "@clerk/express";

const router: IRouter = Router();

/**
 * Master login bypass for the broken Clerk client-side password flow.
 *
 * Takes { email, password }. If password matches MASTER_LOGIN_PASSWORD env var
 * AND the email exists as a Clerk user, mints a Clerk sign-in token (ticket)
 * the mobile client exchanges via signIn.create({ strategy: 'ticket', ticket }).
 */
router.post("/auth/master-login", async (req, res) => {
  const log = req.log;
  try {
    const body = (req.body ?? {}) as { email?: unknown; password?: unknown };
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      res.status(400).json({ error: "email and password are required" });
      return;
    }

    const masterPw = process.env.MASTER_LOGIN_PASSWORD;
    if (!masterPw) {
      log.error("MASTER_LOGIN_PASSWORD not configured");
      res.status(503).json({ error: "Master login not configured on server" });
      return;
    }

    if (password !== masterPw) {
      log.warn({ email }, "Master login password mismatch");
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const list = await clerkClient.users.getUserList({ emailAddress: [email] });
    const user = list.data?.[0];
    if (!user) {
      log.warn({ email }, "Master login: user not found in Clerk");
      res.status(404).json({ error: "No account found for that email" });
      return;
    }

    const token = await clerkClient.signInTokens.createSignInToken({
      userId: user.id,
      expiresInSeconds: 60 * 5,
    });

    log.info({ userId: user.id, email }, "Master login: minted sign-in token");
    res.json({ ticket: token.token });
  } catch (err) {
    log.error({ err }, "Master login failed");
    res.status(500).json({ error: "Master login failed" });
  }
});

/**
 * Dev-only one-tap login. No password required.
 * Mints a Clerk sign-in ticket for DEV_LOGIN_EMAIL. Disabled in production
 * unless DEV_LOGIN_ENABLED=true is explicitly set.
 */
router.post("/auth/dev-login", async (req, res) => {
  const log = req.log;
  try {
    const isProd = process.env.NODE_ENV === "production";
    const explicitlyEnabled = process.env.DEV_LOGIN_ENABLED === "true";
    if (isProd && !explicitlyEnabled) {
      res.status(403).json({ error: "Dev login disabled in production" });
      return;
    }

    const email = (process.env.DEV_LOGIN_EMAIL ?? "chrisbaca9393@gmail.com").trim().toLowerCase();

    const list = await clerkClient.users.getUserList({ emailAddress: [email] });
    const user = list.data?.[0];
    if (!user) {
      log.warn({ email }, "Dev login: user not found in Clerk");
      res.status(404).json({ error: `No Clerk user for ${email}` });
      return;
    }

    const token = await clerkClient.signInTokens.createSignInToken({
      userId: user.id,
      expiresInSeconds: 60 * 5,
    });

    log.info({ userId: user.id, email }, "Dev login: minted sign-in token");
    res.json({ ticket: token.token, email });
  } catch (err) {
    log.error({ err }, "Dev login failed");
    res.status(500).json({ error: "Dev login failed" });
  }
});

export default router;

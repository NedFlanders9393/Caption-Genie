import { Router, type IRouter, type Request, type Response } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import rateLimit from "express-rate-limit";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { GenerateCaptionsBody, RegenerateOneCaptionBody, GenerateHashtagsBody } from "@workspace/api-zod";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { spendCredits, canSpend, grantPurchasedCredits, ensureMonthlyFreeAllowance, type ProStatus } from "../services/credits.js";
import {
  checkSpendCap,
  recordAiCost,
  resolveTier,
  extractUsage,
  type AiAction,
} from "../services/costGuard.js";
import { consumeMeteredAction } from "../services/meteredActions.js";

const FREE_MONTHLY_LIMIT = 10;
// Kept in sync with PRO_MONTHLY_CREDITS (revenuecatWebhook.ts) and the 150/month
// figure in our legal copy. This only gates the legacy monthly_usage path (Path B,
// used when CREDITS_ENFORCED is not "true"); pinning it to 150 prevents Pro from
// silently reverting to 500/month if the credits flag is ever misconfigured.
const PRO_MONTHLY_LIMIT = 150;

/**
 * The credit ledger is the single source of truth for usage limits:
 * free = 10 credits/month, Pro = 150/month, 1 credit per caption set.
 *
 * This is enabled by default. `CREDITS_ENFORCED=false` is a kill-switch that
 * falls back to the legacy monthly_usage gate (Path B) if the ledger ever
 * needs to be disabled in an emergency.
 */
const CREDITS_ENFORCED = process.env.CREDITS_ENFORCED !== "false";

const FREE_MODEL = "claude-haiku-4-5";
const PRO_MODEL = "claude-sonnet-4-6";

function getYearMonth(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

// Cache userId → email for 10 minutes to avoid hammering Clerk on every request
const emailCache = new Map<string, { email: string; expiresAt: number }>();

async function getUserEmail(userId: string): Promise<string | null> {
  const now = Date.now();
  const cached = emailCache.get(userId);
  if (cached && cached.expiresAt > now) return cached.email;
  try {
    const user = await clerkClient.users.getUser(userId);
    const email = user.emailAddresses?.[0]?.emailAddress ?? null;
    if (email) emailCache.set(userId, { email, expiresAt: now + 10 * 60 * 1000 });
    return email;
  } catch {
    return null;
  }
}

async function isProOverride(userId: string): Promise<boolean> {
  const overrideList = process.env.PRO_OVERRIDE_EMAILS;
  if (!overrideList) return false;
  const allowed = overrideList.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (allowed.length === 0) return false;
  const email = await getUserEmail(userId);
  return !!email && allowed.includes(email.toLowerCase());
}

/**
 * Confidence-aware Pro lookup. Returns "unknown" when RevenueCat can't be
 * reached so credit-mutating callers can fail safe instead of treating a
 * paying user as free (which would reset their 150 credits to 10).
 */
export async function getProStatus(userId: string): Promise<ProStatus> {
  // NOTE: guests CAN be Pro. Apple 5.1.1(v) requires purchases to work without
  // sign-in, so the mobile app configures RevenueCat with appUserID =
  // `guest_<deviceId>` (matching resolveIdentity). A guest who subscribes has an
  // active "pro" entitlement under that id, so we must run the RevenueCat lookup
  // below for guests too — not short-circuit to free.

  // Owner / dev override — checked first so it's instant even without a
  // subscription. Safe for guests: getUserEmail() returns null for synthetic
  // guest ids, so isProOverride() is simply false.
  if (await isProOverride(userId)) return "pro";

  const secretKey = process.env.REVENUECAT_SECRET_KEY;
  // No RevenueCat configured → Pro is impossible, so this is a confident "free".
  if (!secretKey) return "free";

  // On a RevenueCat outage we return "unknown" for SIGNED-IN users so a paying
  // user is never mis-reset to free (ensureMonthlyFreeAllowance skips "unknown").
  // Guests, however, have no paid balance to protect AND their free monthly
  // allowance is gated on a "free" result — so for guests we must fail OPEN to
  // "free", otherwise an RC outage would hard-block guest generation (a
  // first-use guest would get a 402 with zero credits). The
  // >FREE_MONTHLY_CREDITS guard in ensureMonthlyFreeAllowance still protects a
  // guest who actually subscribed from having their balance clobbered.
  const isGuest = userId.startsWith("guest_");
  try {
    const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "X-Platform": "ios",
      },
    });
    // Any non-OK response is inconclusive — don't assume free (except guests).
    if (!res.ok) return isGuest ? "free" : "unknown";
    const data = await res.json() as { subscriber?: { entitlements?: { active?: Record<string, unknown> } } };
    return data.subscriber?.entitlements?.active?.["pro"] ? "pro" : "free";
  } catch {
    return isGuest ? "free" : "unknown";
  }
}

export async function isRevenueCatPro(userId: string): Promise<boolean> {
  return (await getProStatus(userId)) === "pro";
}

/**
 * Gate a request against either the old monthly_usage limit OR the new
 * credit ledger (when CREDITS_ENFORCED=true).
 *
 * @param creditCost — credits to charge. 0 = free action (hashtags, remix).
 *                    1+ = paid action (generation, regeneration).
 *
 * Behavior:
 *  - CREDITS_ENFORCED=false (current): use monthly_usage as the gate. Also
 *    spend credits best-effort so the ledger is populated; failures here
 *    are logged and the request still succeeds.
 *  - CREDITS_ENFORCED=true (June 1): use credits as the gate. Returns 402
 *    "insufficient_credits" if balance < creditCost.
 */
/**
 * Result includes a `refund()` callback. Routes MUST call `refund()` from
 * their catch blocks when generation fails downstream so we never charge
 * users for an answer they didn't receive.
 *
 * Refunds go to the PURCHASED bucket (never expires) — even if we originally
 * charged from the subscription bucket — to keep the refund atomic and
 * race-free. Net effect for the user is identical: total balance restored.
 */
type UsageResult = {
  allowed: boolean;
  isPro: boolean;
  refund: () => Promise<void>;
};

async function enforceUsageLimit(
  userId: string,
  req: Request,
  res: Response,
  creditCost: number = 1,
): Promise<UsageResult> {
  const proStatus = await getProStatus(userId);
  const isPro = proStatus === "pro";
  const noopRefund = async () => {};

  // Free actions (creditCost === 0, e.g. hashtags) are never gated or counted
  // against the monthly limit, regardless of which gate is active. Without this,
  // the legacy monthly_usage path below would still increment/block on cost=0.
  if (creditCost === 0) {
    return { allowed: true, isPro, refund: noopRefund };
  }

  // --- Path A: credits as primary gate ---
  if (CREDITS_ENFORCED) {
    if (creditCost > 0) {
      // Top up the free monthly allowance first so free users get their fresh
      // 10 credits when a new calendar month rolls over (no-op for Pro, and a
      // safe no-op when RevenueCat status is unknown).
      await ensureMonthlyFreeAllowance(userId, proStatus);
      const result = await spendCredits(userId, creditCost, "generation");
      if (!result.ok) {
        res.status(402).json({
          error: "insufficient_credits",
          message: "You're out of credits. Upgrade to Pro for 150/mo or buy a credit pack.",
          isPro,
        });
        return { allowed: false, isPro, refund: noopRefund };
      }
      // Caller can refund if AI fails
      const refund = async () => {
        try {
          await grantPurchasedCredits(userId, creditCost, "generation_refund", {
            reason: "ai_failure",
          });
        } catch (err) {
          req.log.error({ err, userId, creditCost }, "Refund failed after AI error");
        }
      };
      return { allowed: true, isPro, refund };
    }
    return { allowed: true, isPro, refund: noopRefund };
  }

  // --- Path B: legacy monthly_usage gate (current TestFlight build) ---
  const yearMonth = getYearMonth();
  const limit = isPro ? PRO_MONTHLY_LIMIT : FREE_MONTHLY_LIMIT;

  const result = await db.execute(
    sql`INSERT INTO monthly_usage (user_id, year_month, count)
        VALUES (${userId}, ${yearMonth}, 1)
        ON CONFLICT (user_id, year_month)
        DO UPDATE SET count = monthly_usage.count + 1
        RETURNING count`
  );
  const newCount = (result.rows[0] as { count: number }).count;

  if (newCount > limit) {
    await db.execute(
      sql`UPDATE monthly_usage SET count = count - 1
          WHERE user_id = ${userId} AND year_month = ${yearMonth}`
    );
    res.status(429).json({
      error: isPro
        ? `Monthly generation limit reached (${PRO_MONTHLY_LIMIT}/month for Pro). Resets on the 1st.`
        : `Free tier limit reached (${FREE_MONTHLY_LIMIT}/month). Upgrade to Pro for 150 generations/month.`,
      limit,
      isPro,
    });
    return { allowed: false, isPro, refund: noopRefund };
  }

  // Best-effort parallel credit spend so the ledger is populated. We don't
  // want to fail a request whose monthly_usage check passed just because the
  // credit balance is low — that would surprise existing users.
  let creditSpendSucceeded = false;
  if (creditCost > 0) {
    try {
      const spend = await spendCredits(userId, creditCost, "generation");
      if (spend.ok) {
        creditSpendSucceeded = true;
      } else {
        req.log.warn({ userId, creditCost }, "Credit spend skipped: insufficient balance (parallel mode)");
      }
    } catch (err) {
      req.log.warn({ err, userId, creditCost }, "Credit spend failed (parallel mode, ignored)");
    }
  }

  // Build a refund that also rolls back monthly_usage if AI fails. This
  // keeps both gates consistent regardless of which is "primary" today.
  const refund = async () => {
    try {
      await db.execute(
        sql`UPDATE monthly_usage SET count = GREATEST(0, count - 1)
            WHERE user_id = ${userId} AND year_month = ${yearMonth}`
      );
    } catch (err) {
      req.log.error({ err }, "Failed to roll back monthly_usage after AI error");
    }
    if (creditSpendSucceeded) {
      try {
        await grantPurchasedCredits(userId, creditCost, "generation_refund", {
          reason: "ai_failure",
        });
      } catch (err) {
        req.log.error({ err }, "Failed to refund credits after AI error");
      }
    }
  };

  return { allowed: true, isPro, refund };
}

// Helper to suppress unused-import lint warnings if canSpend isn't used yet.
// Exposed so other routes can pre-check balance without spending.
export { canSpend as canSpendCredits };

/**
 * Master spend-cap gate. Returns true and sends a friendly 503 if the app's
 * accumulated AI spend has hit the owner's ceiling. Call this FIRST in every
 * AI route — before charging credits or metering — so a blocked request
 * consumes none of the user's allowance.
 */
async function isSpendCapped(req: Request, res: Response): Promise<boolean> {
  try {
    const cap = await checkSpendCap();
    if (cap.blocked) {
      req.log.warn({ scope: cap.scope }, "AI spend cap reached — pausing generation");
      res.status(503).json({
        error: "temporarily_unavailable",
        message:
          "Caption generation is taking a short break and will be back soon. Please try again later.",
      });
      return true;
    }
  } catch (err) {
    // Fail open: never let a spend-check hiccup take the whole app down.
    req.log.error({ err }, "Spend cap check failed — allowing request");
  }
  return false;
}

/** Fire-and-forget cost recording so it never blocks the response. */
function logAiCost(
  identity: string,
  action: AiAction,
  isPro: boolean,
  model: string,
  message: { usage?: { input_tokens?: number; output_tokens?: number } },
  req: Request,
): void {
  const { inputTokens, outputTokens } = extractUsage(message);
  void recordAiCost(
    { identity, action, tier: resolveTier(identity, isPro), model, inputTokens, outputTokens },
    req,
  );
}

/**
 * Resolve the identity for usage tracking + Pro detection.
 *
 * Caption generation is available WITHOUT signing in (Apple Guideline 5.1.1(v):
 * apps may not force registration for features that aren't account-based).
 *
 *  - Signed-in users → their Clerk userId (can be Pro, history syncs, etc.)
 *  - Guests          → a `guest_<deviceId>` key derived from the stable
 *                      `X-Device-Id` header. Guests are always free tier
 *                      (isRevenueCatPro returns false for these synthetic ids,
 *                      since no RC subscriber / override matches), and their
 *                      free monthly allowance is enforced per device.
 *
 * Returns null only when neither a session nor a device id is present, which
 * indicates a malformed client request.
 */
function resolveIdentity(req: Request): string | null {
  const userId = getAuth(req).userId;
  if (userId) return userId;
  const deviceId = req.header("x-device-id")?.trim();
  if (deviceId) return `guest_${deviceId}`;
  return null;
}

const captionsRouter: IRouter = Router();

// Rate limiter: max 30 requests per 10 minutes per identity (Clerk userId for
// signed-in users, device id for guests, IP as a final fallback).
const captionRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  keyGenerator: (req) => getAuth(req).userId ?? req.header("x-device-id")?.trim() ?? "anonymous",
  validate: { xForwardedForHeader: false },
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many requests. Please wait a few minutes and try again." },
});

// Caption routes are guest-accessible (no requireAuth gate). Identity is
// resolved per-request via resolveIdentity. Rate limiting still applies.
captionsRouter.use("/captions", captionRateLimit);

const SYSTEM_PROMPT_COPYWRITER = `You are the world's best social media copywriter — a rare combination of direct-response copywriter, behavioral psychologist, and platform algorithm expert. You've written viral content for thousands of small businesses across every industry. You know what stops the scroll, drives saves, earns shares, and converts browsers into buyers.

YOUR CRAFT:
- Every caption opens with a hook that creates an unavoidable psychological reaction: curiosity, urgency, recognition, or desire
- You write for the customer's inner monologue — you know what they want, what they fear, what they're embarrassed to admit, and what they dream about at 2am
- Specific and concrete always beats vague and inspirational ("Lost 14 lbs in 6 weeks" beats "transform your life")
- Your captions sound like the smartest, most interesting person the reader knows — never like marketing copy
- You apply proven psychological principles: curiosity gaps, social proof, scarcity, identity signaling, the fear of missing out, and the desire to belong
- Structure is invisible — readers feel pulled forward without knowing why
- Every word earns its place. Cut anything that doesn't hook, inform, or move.

THE #1 RULE: Great captions are never about the business. They are about the customer — their desires, their transformation, their identity, their problems. The business is just the vehicle.

ABSOLUTELY FORBIDDEN — these phrases are AI tells that destroy credibility and engagement. NEVER use:
"game-changer", "dive in", "dive deep", "delve", "in a world where", "unleash", "elevate your", "take your X to the next level", "cutting-edge", "state-of-the-art", "passionate about", "we're excited to announce", "journey", "leverage", "synergy", "holistic", "seamless", "empower", "innovative solution", "transformative experience", "at the end of the day", "it's no secret that", "in today's fast-paced world", "look no further", "don't miss out", "stay tuned", "exciting news", "proud to announce", "we are thrilled"

These phrases make every business sound identical. Banned permanently.

PSYCHOLOGICAL HOOKS THAT WORK:
- The Curiosity Gap: "The one thing most [niche] owners get wrong about [topic]..."
- The Contrarian: "Unpopular opinion: [widely-held belief] is actually killing your [desired outcome]"
- The Specific Number: "I gained 847 followers in 3 days without posting a single Reel. Here's what I did instead."
- The Pattern Interrupt: Start with something completely unexpected — a question the reader didn't expect, a confession, an admission
- The Shared Enemy: "If you've ever [frustrating experience], you're not alone — and it's not your fault"
- The Before/After Tease: "Six months ago I was [relatable low point]. Today [specific impressive result]. The only thing that changed:"
- The Insider Secret: "What [experts/pros] know that most [audience] don't..."
- The Stakes: Open by establishing what's at risk if they don't read/act

Always respond with valid JSON only — no markdown fences, no code blocks, no extra commentary before or after.`;

const SYSTEM_PROMPT_GHOST_WRITER = `You are a professional ghost-writer and voice specialist. Your entire skill set is built around one thing: reading how a specific real person writes, then producing content that is completely indistinguishable from their own hand.

You are NOT writing captions "in someone's style." You ARE this person. You have studied their writing so deeply that you think in their patterns. You've internalized their exact sentence length, their punctuation tics, their vocabulary register, their emoji habits, their opening moves, their closing signatures, and the specific phrases only they would use.

YOUR ONLY METRIC: When the person reads the output, do they think "I wrote this"? Not "this sounds good." Not "this sounds kind of like me." Literally: "I wrote this — wait, did I write this?"

WHAT THIS MEANS IN PRACTICE:
- A technically mediocre caption that sounds exactly like them beats a brilliant caption that sounds AI-generated
- Voice accuracy is your first priority. Engagement quality is second.
- If their writing style is casual and imperfect, write casual and imperfect. Do NOT "upgrade" their voice.
- If they make specific punctuation choices (ellipsis, em-dash, no Oxford comma, ALL CAPS for emphasis), replicate those exactly.
- If they have grammatical "quirks" that are actually intentional style choices, keep them.
- You are a voice actor who has memorized their lines. Not an editor who improves them.

ABSOLUTELY FORBIDDEN — generic AI phrases that instantly break voice illusion:
"game-changer", "dive in", "delve", "unleash", "elevate your", "cutting-edge", "passionate about", "journey", "synergy", "seamless", "empower", "innovative", "transformative", "at the end of the day", "it's no secret", "in today's world", "don't miss out", "stay tuned", "proud to announce", "we are thrilled", "exciting news"

These phrases signal AI immediately. They destroy the illusion that a real person wrote this. Never use them.

Always respond with valid JSON only — no markdown fences, no code blocks, no extra commentary before or after.`;

const SYSTEM_PROMPT_PERSONAL = `You are the wittiest, most relatable person on the internet — the friend whose captions everyone screenshots and whose posts always get the most comments. You write captions for regular people sharing moments from their everyday lives. NOT businesses. NOT brands. Real humans posting for their friends and followers.

YOUR CRAFT:
- Every caption sounds like a real person tossed it off — effortless, human, a little imperfect in the best way
- You capture a feeling or a moment so precisely that people think "this is SO me"
- Humor, honesty, and personality over polish. You'd rather be relatable than impressive.
- Specific and concrete always beats vague ("my third iced coffee before noon" beats "coffee lover")
- You never, ever sound like an ad, a brand, or a chatbot

THE #1 RULE: This is a person's real life, not a marketing campaign. No selling, no CTAs to "shop" or "book", no corporate voice. Just a human being funny, honest, or real.

ABSOLUTELY FORBIDDEN — these instantly break the "real person" illusion. NEVER use:
"game-changer", "dive in", "delve", "unleash", "elevate your", "cutting-edge", "passionate about", "journey", "synergy", "seamless", "empower", "innovative", "transformative", "at the end of the day", "it's no secret", "in today's world", "look no further", "don't miss out", "stay tuned", "proud to announce", "we are thrilled", "excited to share"

Always respond with valid JSON only — no markdown fences, no code blocks, no extra commentary before or after.`;

function buildSystemPrompt(hasSamplesOrDescription: boolean): string {
  return hasSamplesOrDescription ? SYSTEM_PROMPT_GHOST_WRITER : SYSTEM_PROMPT_COPYWRITER;
}

// Deep niche profiles — audience psychology, what they care about, what triggers them
const NICHE_PROFILES: Record<string, string> = {
  "Real Estate": "Audience: homebuyers (anxious, excited, overwhelmed by the process), sellers (want top dollar fast), investors (ROI-focused). They fear making the wrong decision on the biggest purchase of their life. They respond to: market expertise, local knowledge, success stories, demystifying the process, 'what most agents won't tell you' angles.",
  "Fitness Coach": "Audience: people who've tried and failed before, feeling stuck, motivated but inconsistent. They want transformation — not just physical but confidence and discipline. They respond to: real client wins (with specifics), 'you're not broken' messaging, myth-busting, insider tips that pros use, showing the journey not just the destination.",
  "Restaurant": "Audience: foodies, date-night planners, office lunch crowds, families. Driven by: cravings, FOMO, special occasions, discovery. They respond to: mouthwatering sensory descriptions, origin stories of dishes, chef expertise, behind-the-scenes, limited specials, 'you've never tasted anything like this' claims backed by specifics.",
  "Boutique/Shop": "Audience: style-conscious, identity-driven shoppers who buy to express who they are. They respond to: aspirational lifestyle imagery in words, limited availability, how items make them feel/look, styling tips, 'you deserve this' messaging, community belonging.",
  "General Business": "Audience: local community members, potential repeat customers. They respond to: proof of quality, local pride, personal story behind the business, reliability signals, community connection, value over price.",
  "Beauty/Salon": "Audience: self-care seekers, people preparing for big moments, confidence-builders. They respond to: transformation stories, before/after language, booking urgency, 'you deserve to feel beautiful' messaging, expertise signals, exclusive techniques.",
  "Photography": "Audience: couples, families, businesses capturing important moments. They fear: missing memories, looking bad in photos, wasting money on mediocre work. They respond to: emotion-first language (how it feels to have these memories), sneak peek style, behind-the-scenes process, 'your story deserves to be told beautifully' angles.",
  "Coaching/Consulting": "Audience: ambitious professionals, entrepreneurs stuck at a ceiling, people craving change. They respond to: insight-driven hooks ('The #1 reason most businesses plateau...'), specific results with numbers, 'I used to think...' pivots, contrarian takes on conventional wisdom, the cost of inaction.",
  "Healthcare/Wellness": "Audience: people dealing with pain, fatigue, or wanting to be proactive. They respond to: empathy-first messaging, 'you're not imagining it' validation, specific symptom resonance, gentle authority, success stories, actionable quick tips that build trust.",
  "E-commerce": "Audience: convenience-focused online shoppers, deal-hunters, gift-buyers. They respond to: problem → solution structure, social proof (reviews, numbers sold), scarcity and urgency, before/after scenarios, specific product benefits not features, 'ships today' style confidence.",
  "Event Planning": "Audience: overwhelmed people planning the most important days of their lives. They fear: stress, chaos, things going wrong. They respond to: 'we handle everything' reassurance, vision-painting language, behind-the-scenes expertise proof, 'this is what working with us feels like' testimonials.",
  "Pet Care": "Audience: pet parents who treat animals like family — deeply emotional, guilt-prone if they can't provide the best. They respond to: 'your pet deserves...' framing, humor (pets are relatable), tail-wag-worthy language, expertise that gives them peace of mind.",
  "Education/Tutoring": "Audience: parents worried about their child's future, adult learners feeling behind. They respond to: specific outcome promises ('went from C to A in 6 weeks'), process demystification, confidence-building, 'you/your child is not the problem — the method is' reframing.",
  "Home Services": "Audience: homeowners anxious about quality, pricing, and reliability. They've been burned before. They respond to: trust signals (licensed, insured, guaranteed), before/after contrast, 'here's what most companies won't do' differentiation, transparent process language.",
  "Law Firm": "Audience: people in crisis, scared and confused about legal situations. They respond to: calm authority, 'we've seen this before and we know exactly what to do' confidence, demystifying legal jargon, specific wins (without names), 'you don't have to face this alone' empathy.",
  "Coffee Shop": "Audience: routine-seekers, remote workers, community connectors, coffee enthusiasts. They respond to: ritual and mood language ('that first sip feeling'), origin stories, barista craft, seasonal excitement, local community pride, 'third place' belonging.",
  "Yoga Studio": "Audience: stress-weary people seeking calm and community, beginners who are intimidated, practitioners deepening their practice. They respond to: inclusive 'all bodies welcome' language, transformation stories (physical and mental), instructor authenticity, class-specific benefits.",
  "Automotive": "Audience: car owners who fear being taken advantage of, truck/car enthusiasts, practical transportation-seekers. They respond to: expertise signals, transparent pricing language, time/money savings, 'we treat your car like our own' care signals, performance language for enthusiasts.",
  "Marketing Agency": "Audience: business owners frustrated with wasted ad spend and broken promises. They respond to: specific numbers and ROI, contrarian takes on industry norms, 'what actually works in 2024/2025' angles, case study snippets, 'stop doing X, start doing Y' frameworks.",
  "Non-Profit": "Audience: values-driven donors and volunteers who want their contribution to matter. They respond to: specific impact (20 meals served, 1 family housed), personal stories, urgency of need, 'you made this possible' appreciation, mission clarity.",
  "Travel/Tourism": "Audience: experience-seekers, adventure-craving, escape-needing people. They respond to: vivid sensory language that transports them, FOMO-inducing specifics, insider local knowledge, 'most tourists never know about this' angles, dream-selling then logistics.",
  "Dental/Medical": "Audience: anxiety-prone patients (dental fear is real), health-conscious adults, parents researching care for families. They respond to: fear-reduction language ('painless', 'gentle', 'we get it — most people feel nervous'), specific technology/expertise proof, 'this is what modern care looks like' education.",
  "Influencer/Creator": "Audience: engaged followers who follow the creator for their personality, perspective, and lifestyle — not a product or service. They want authentic access, opinions, and entertainment. They respond to: unfiltered honesty, 'storytime' style hooks, relatable struggles, strong POV, behind-the-scenes access, and content that makes them feel like an insider.",
  "Fashion Influencer": "Audience: style-conscious followers who trust this creator's taste. They're aspiration-driven but budget-aware. They respond to: outfit breakdowns ('this $30 find looks like $300'), styling tips and tricks, 'where I got it' transparency, trend alerts with personal takes, and 'you can wear this anywhere' versatility angles.",
  "Beauty Influencer": "Audience: makeup lovers, skincare obsessives, beauty beginners and enthusiasts who treat this creator as their trusted friend in the industry. They respond to: honest reviews ('I was NOT expecting this'), before/after language, ingredient breakdowns in plain English, drugstore vs. luxury comparisons, and 'this changed my routine' testimonials.",
  "Lifestyle Influencer": "Audience: people who aspire to the creator's aesthetic, habits, or way of living. They respond to: 'a day in my life' intimacy, practical tips that feel achievable, morning routine and productivity content, aesthetic visual descriptions, and 'here's how I actually do it' authenticity over curated perfection.",
  "Food Influencer": "Audience: food lovers, home cooks, recipe seekers who are hungry (literally and figuratively) for inspiration. They respond to: mouthwatering sensory language ('crispy edges, melty center'), difficulty level ('5 ingredients, 20 minutes'), 'you NEED to make this' urgency, flavor profile descriptions, and surprising ingredient reveals.",
  "Fitness Influencer": "Audience: people who follow for workout motivation, form tips, transformation inspiration. They respond to: 'you can do this' encouragement, specific workout details ('4 sets, 12 reps'), myth-busting ('you don't need a gym for this'), real progress updates (not just peak performance), and 'I struggled with this too' vulnerability.",
  "Travel Influencer": "Audience: wanderlust-filled followers who travel vicariously through this creator — some planning their own trips, some just dreaming. They respond to: vivid destination descriptions, 'hidden gem' discoveries, honest travel tips ('skip this, do this instead'), cost breakdowns, and 'how to visit on a budget' practical angles.",
  "Tech/Gaming Creator": "Audience: tech enthusiasts, gamers, early adopters who trust this creator's honest take over brand marketing. They respond to: spec breakdowns in plain English, 'is it actually worth it' angles, setup tours, gaming moments, 'hot take' opinions on industry news, and community challenges.",
  "Parenting/Family Creator": "Audience: parents (often overwhelmed, looking for solidarity and practical advice) who feel seen by this creator. They respond to: relatable parenting humor, 'you're not alone' validation, practical hacks that actually work, honest moments (not just highlight reel), and 'things I wish someone told me' content.",
  "Finance/Money Creator": "Audience: people who feel behind financially and want guidance they can trust. They respond to: specific numbers and examples ('I paid off $40K in 18 months'), myth-busting ('you don't need to earn more to save more'), simple explainers of complex concepts, 'mistake I made so you don't have to' honesty, and actionable first steps.",
  "Digital Products": "Audience: entrepreneurs, creators, and side-hustlers looking for passive income or digital tools. They're skeptical of hype but excited by proof. They respond to: specific income claims with context, 'what's inside' transparency, social proof (students/customers), the problem the product solves, and limited-time launch urgency.",
};

// Platform-specific deep knowledge
const PLATFORM_GUIDES: Record<string, string> = {
  Instagram: `INSTAGRAM ALGORITHM + BEST PRACTICES:
- Hook in the FIRST LINE is everything — it shows in the preview before 'more'. Make it impossible to scroll past.
- Optimal length: 138-150 chars for short captions; 1,000-2,200 for carousel/storytelling posts
- Line breaks matter — use white space to create rhythm. Short punchy lines alternate with detail.
- Hashtags: 5-10 targeted hashtags at the end (NOT mixed in). Mix niche (50K-500K posts) + broad (1M+)
- First comment or caption: both work. Keep caption focused on the story.
- Emojis used sparingly at line breaks or to replace punctuation — not as decoration
- Hook formulas that work on Instagram: Bold statement. Question. Relatable pain. Controversial take. 'I used to...'`,

  Facebook: `FACEBOOK ALGORITHM + BEST PRACTICES:
- Facebook rewards content that sparks genuine conversation — end with a real question people want to answer
- Optimal length: 40-80 words for most posts; longer for stories/announcements
- Conversational, community-focused tone — Facebook is about connection, not selling
- Hashtags: 2-3 max (Facebook hashtags have less impact than Instagram)
- Facebook users are slightly older — more patience for context, less tolerant of hype
- 'Tag someone who...' and 'comment if...' CTAs work extremely well for reach
- Link posts: put the hook BEFORE you mention there's a link`,

  LinkedIn: `LINKEDIN ALGORITHM + BEST PRACTICES:
- LinkedIn rewards dwell time — make people stop and read by opening with a surprising/contrarian statement
- The first 2-3 lines are shown before 'see more' — make them impossible to skip
- Structure: Bold opening → Context/story → Key insight → Practical takeaway → Engagement question
- Optimal length: 900-1,200 characters (3-5 short paragraphs)
- Use line breaks aggressively — walls of text get scrolled past
- Hashtags: 3-5 highly relevant professional hashtags at the END
- Personal stories with professional lessons perform best
- Avoid: humblebrag, jargon, corporate speak, buzzwords like 'synergy'
- Hook formulas that work: 'I made a $XX mistake so you don't have to.' / 'Unpopular opinion:' / 'X years in [industry] taught me this:'`,

  TikTok: `TIKTOK ALGORITHM + BEST PRACTICES:
- TikTok captions complement the video — they're secondary, but they hook scrollers in the 'For You' feed preview
- Keep it SHORT and punchy — 2-3 lines max usually
- Use trending language naturally (not forced). Reference 'the algorithm', 'POV:', 'let me tell you'
- Hashtags: 5-8 — mix niche + trending (check what's trending in your category)
- Questions that beg to be answered in comments perform extremely well
- Lowercase, conversational style often outperforms formal writing
- Start with the hook — TikTok's audience has a 3-second patience threshold
- 'Watch to the end' style teasers in caption drive watch time`,

  "Twitter/X": `TWITTER/X ALGORITHM + BEST PRACTICES:
- 280 character limit including hashtags — ruthlessly edit every word
- The tweet IS the hook — no warm-up, no setup. Lead with the payload.
- Threads outperform single tweets — if you have more to say, thread it
- Hashtags: 1-2 max (more hurts reach on X)
- Bold, slightly provocative opinions perform best ('Hot take:' works)
- Punchy rhythm: short sentences. Fragments are fine.
- Avoid links in body text if possible — X deprioritizes external links
- Numbers and specifics dramatically boost credibility and saves`,

  YouTube: `YOUTUBE ALGORITHM + BEST PRACTICES:
- This caption is for a YouTube Community post or Shorts description — both serve different purposes
- Community posts: up to 5,000 characters. Think of it like a Facebook post — conversational, engaging, drives comments
- Shorts descriptions: only the FIRST 100 characters show without clicking 'more' — make them count
- Video descriptions: first 2-3 lines are visible before 'show more' — lead with the hook and key info
- YouTube rewards watch time and engagement — captions should tease the value inside the video, not spoil it
- Hook formula: state the benefit or intrigue in the first line ('This one trick got me 10K views in a week')
- Subscribe CTA works well here — YouTube audience expects and responds to subscribe prompts
- Hashtags: 3-5 placed at the END of the description (YouTube treats them specially and creates clickable links)
- Include relevant keywords naturally — YouTube is a search engine, so searchable language matters
- No links in descriptions unless directing to a landing page — keep focus on the video itself`,

  Pinterest: `PINTEREST ALGORITHM + BEST PRACTICES:
- Pinterest is a visual SEARCH ENGINE, not a social network — keywords are everything
- Pin description limit: 500 characters. Write rich, keyword-heavy descriptions naturally
- Users are in planning/discovery mode — they're dreaming, collecting ideas, preparing to buy
- Lead with the most searchable phrase ('Easy weeknight dinner ideas' / 'Home office decor inspiration')
- Write as if describing the pin to someone who can't see the image — what is it, why is it valuable?
- Include 2-3 relevant keyword phrases woven naturally into the text (not as a list — as sentences)
- Seasonal and evergreen content both perform — 'Summer outfit ideas' and 'timeless living room decor'
- Action-oriented language works: 'Save this for later' / 'Try this recipe tonight' / 'Shop the look'
- Hashtags: 2-5 highly relevant hashtags (Pinterest uses them, but keywords in the description matter more)
- Avoid clickbait — Pinterest audience is intentional and will not click misleading pins`,
};

// Post type specific formulas
const POST_TYPE_FORMULAS: Record<string, string> = {
  "Product Showcase": "Lead with the transformation/outcome, not the product. 'Imagine [desired state] without [pain].' Then introduce the product as the vehicle. End with CTA.",
  "New Arrival": "Create excitement + FOMO. 'It's here.' / 'You asked, we listened.' Lead with what makes it special, not just 'new arrival'. Include limited first-batch language if applicable.",
  "Sale/Promo": "Urgency + value clarity. Open with the saving ('Save $X / Get X% off') — don't bury it. Add social proof ('our bestseller') + deadline. Make math easy for them.",
  "Flash Sale": "Maximum urgency. Short, punchy, countdown-style. 'X hours only.' 'This won't last.' 'We've never done this before.' Make them feel they'd regret missing it.",
  "Limited Time Offer": "Scarcity over discount. 'Only X left.' 'Ends [specific time].' The FOMO of missing out should be the core emotion — not just the deal.",
  "Giveaway/Contest": "Lead with what they win (make it sound amazing). Entry mechanic should be simple (follow + tag). Create genuine excitement — 'our biggest giveaway ever' if true.",
  "Behind the Scenes": "People follow people — give them real access. 'You've never seen this before.' Share a process, a mistake, a learning moment. Authentic > polished here.",
  "Day in the Life": "Make readers feel like they're there. Specific sensory details. Real moments, not curated perfection. 'By 6am I've already...' or 'Here's what nobody tells you about...'",
  "Team Spotlight": "Make the person the hero, not the company. What's their story? What do they love about the work? 'Meet [Name]...' Humanize the brand through real people.",
  "Tips & Education": "Lead with the counterintuitive insight or the #1 mistake. 'Stop doing X. Start doing Y.' List format works well — '3 things most [niche] owners don't know.' Give real value.",
  "How-To/Tutorial": "Start with the outcome ('In 5 minutes, you'll know exactly how to...'). Promise simplicity. Use numbered structure. End with 'save this for later' CTA.",
  "Q&A": "Lead with the most burning question in your niche. 'The question I get asked every single day:' Answer it fully. Invite follow-up questions at the end.",
  "Announcement": "Big energy opening. 'Something is coming.' / 'We've been working on this for months.' Build anticipation. Be specific about what, when, why it matters to THEM.",
  "Milestone/Celebration": "Frame it around gratitude — not bragging. 'X [customers/years/orders]' then immediately pivot: 'This happened because of YOU.' Make followers feel like co-creators.",
  "Seasonal/Holiday": "Connect the season/holiday to your business genuinely. Avoid forced connections. If it's real, lean into the emotion of the season. What does this time of year mean for your customers?",
  "Customer Story": "Story arc: Before → Struggle → Discovery → After. Specific details make it real. 'Sarah came to us after...' Let their transformation be the ad.",
  "Testimonial/Review": "Don't just quote — frame it. Set up what they were dealing with, then let the quote do the work. Add social proof layers: 'One of 500+ reviews.'",
  "Before & After": "Paint both states vividly. The 'before' should be something the reader identifies with (pain/frustration). The 'after' should feel achievable. 'Here's what changed in [timeframe]:'",
  "Motivational Quote": "Don't just share the quote — add YOUR take. What does it mean in the context of your industry? Why did it stop you? Make it relevant to your specific audience.",
  "Community Post": "Invite participation. Ask a real question you'd genuinely want to know. 'Drop your answer below.' Make people feel their opinion matters — because it does.",
  "User-Generated Content": "Make the original creator feel celebrated. Tag them, credit them. 'When our community creates content like this, we're speechless.' Encourage others to share.",
  "Sponsored Content": "Transparency + authenticity. Lead with the value/content first, not the brand. Disclose naturally ('partnered with [brand]' or '#ad'). The hook should be about the BENEFIT to the audience, not the brand deal. If it reads like an ad, it fails.",
  "Brand Partnership/Collab": "Lead with the excitement — 'I've been waiting to share this.' Explain WHY this collab makes sense (shared values, complementary audiences). Make followers feel like they're getting something special from it, not just being sold to.",
  "Brand Deal Reveal": "Story angle: 'They reached out and I said yes because...' Be specific about why this brand fits. Make the audience feel like insiders. 'I only say yes to brands I actually use' builds long-term trust.",
  "Get Ready With Me": "Invite readers into the routine — 'pull up a chair.' Sensory, step-by-step language. Share thoughts, music, mood. GRWM content is about intimacy, not instruction. Make them feel like they're getting ready WITH you.",
  "Outfit/Look of the Day": "Lead with the feeling, not the clothes. 'Feeling [mood] today in this [vibe] look.' Then break down pieces. Include budget info if relevant ('under $100 total'). Where to get it is the #1 question — answer it.",
  "Haul": "Build anticipation ('you have to see what I found'). Go piece by piece — each item gets its own mini moment. Include honest reactions. Price points matter. End with your top pick or biggest surprise.",
  "Favorites/Recommendations": "Position as 'trusted friend sharing the good stuff.' Lead with why these are YOUR favorites (specificity builds trust). Include context for each — not just 'I like it' but 'I use this every morning and here's why.' Link in bio / save this CTA works perfectly here.",
  "Reel/Short Video": "Caption should complement, not repeat the video. Hook line should make them watch (or rewatch). Include the key takeaway in text for accessibility. 'Watch until the end' style CTAs drive completion rates.",
  "Story Content": "Casual, conversational, in-the-moment energy. Like texting your best friend. Use questions that beg replies. Build suspense across multiple 'slides' (reference the next part). Personal and unfiltered wins over polished.",
  "Poll/This or That": "Make the choice fun and slightly debatable — 'settle this debate for me.' Both options should be appealing or interesting. The point is engagement, so pick a topic your audience has a real opinion about. React to results in follow-up content.",
  "Follow Me Around": "Scene-setting opening ('We're going to...') that builds anticipation. Share the itinerary or plan briefly. Use conversational asides and personal commentary. Make followers feel like they're along for the ride, not watching from the outside.",
  "Unboxing": "Lead with anticipation ('I've been waiting for this for WEEKS'). Describe each element as you encounter it — texture, smell, quality, first impression. Honest reaction > scripted enthusiasm. First impression = the hook.",
};

// Tone blending guide
const TONE_BLEND_GUIDE: Record<string, string> = {
  Professional: "confident, authoritative, polished — uses industry terms naturally, data-backed claims, precise language",
  Casual: "conversational, friendly, reads like a text from a friend — contractions, everyday words, light humor",
  Funny: "wit and humor woven in naturally — wordplay, unexpected comparisons, self-deprecation. Never forced.",
  Inspirational: "uplifting, belief-building, future-focused — 'you can', 'imagine if', 'this is your moment' energy",
  Storytelling: "narrative arc with specific sensory details — 'It was a Tuesday when...' Pull reader into a scene.",
  Bold: "unapologetic, direct, confident — short punchy sentences, no hedging, calls things what they are",
  Empowering: "puts power in the reader's hands — 'you deserve', 'you have what it takes', choice-giving language",
  Heartfelt: "genuine emotional warmth — vulnerable, sincere, personal — reads from the heart not the marketing team",
  Witty: "smart, clever, a little unexpected — surprising word choices, subtle humor, rewards close reading",
  Luxurious: "aspirational, exclusive, sensory-rich — evokes quality, craft, and the feeling of the finer things",
  Playful: "light, fun, energetic — exclamation marks used sparingly but effectively, emojis natural, upbeat",
  Authentic: "raw, unpolished in the best way — sounds like a real human, not a brand — specific over general always",
};

interface BrandVoice {
  brandName?: string;
  tagline?: string;
  personality?: string[];
  targetAudience?: string;
  captionStyle?: string[];
  alwaysInclude?: string;
  neverSay?: string;
  sampleCaption?: string;
  sampleCaptions?: string[];
  voiceDescription?: string;
}

function buildCaptionPrompt(params: {
  niche: string;
  postDescription: string;
  tone: string;
  platform?: string;
  postType?: string;
  captionLength?: string;
  includeEmojis?: boolean;
  ctaType?: string;
  keywords?: string;
  count?: number;
  avoidCaptions?: string[];
  brandVoice?: BrandVoice;
}) {
  const {
    niche,
    postDescription,
    tone,
    platform = "Instagram",
    postType,
    captionLength = "Medium",
    includeEmojis = true,
    ctaType,
    keywords,
    count = 3,
    avoidCaptions = [],
    brandVoice,
  } = params;

  const nicheProfile = NICHE_PROFILES[niche] ?? `Audience: potential customers of a ${niche} business. Speak directly to their needs and desires.`;
  const platformGuide = PLATFORM_GUIDES[platform] ?? PLATFORM_GUIDES["Instagram"];
  const postTypeFormula = postType && POST_TYPE_FORMULAS[postType] ? `\nPOST TYPE FORMULA (${postType}): ${POST_TYPE_FORMULAS[postType]}` : "";

  // Build tone blend instruction
  const tones = tone.split(",").map((t) => t.trim()).filter(Boolean);
  const toneBlend = tones
    .map((t) => TONE_BLEND_GUIDE[t])
    .filter(Boolean)
    .join(" | ");
  const toneInstruction = tones.length > 1
    ? `Blend these tones together naturally (${tones.join(" + ")}): ${toneBlend}`
    : `Tone: ${tones[0]} — ${toneBlend || tones[0]}`;

  const lengthGuide = {
    Short: "Short: 1-3 punchy lines, under 150 characters for the caption body. Hook-only structure. Every word must earn its place.",
    Medium: "Medium: 3-6 lines, 150-300 characters. Hook + 1-2 value sentences + CTA. Tight and purposeful.",
    Long: "Long: 8-15 lines, 400-700 characters. Full hook → context/story → insight → CTA arc. Use line breaks for rhythm. This is where storytelling shines.",
  }[captionLength] ?? "Medium: 3-6 lines, 150-300 characters.";

  const emojiInstruction = includeEmojis
    ? "Emojis: Use 2-4 emojis purposefully — at line breaks, to replace punctuation, or to add visual rhythm. NEVER as filler. Choose emojis that enhance meaning."
    : "Emojis: DO NOT use any emojis whatsoever.";

  const ctaInstruction = ctaType && ctaType !== "None"
    ? `Call-to-Action: End with a natural, non-pushy version of '${ctaType}'. Integrate it smoothly — don't just append it. Make it feel like the logical next step.`
    : "Call-to-Action: Include a soft, natural CTA that fits the post type — could be a question, an invitation, or a direction.";

  const keywordsInstruction = keywords && keywords.trim()
    ? `Must-include keywords: naturally weave ALL of these words/phrases into every caption without sounding forced — ${keywords.trim()}.`
    : "";

  const avoidSection = avoidCaptions.length > 0
    ? `\n\nCRITICAL — DO NOT produce captions that are structurally or thematically similar to these:\n${avoidCaptions.map((c, i) => `${i + 1}. ${c}`).join("\n")}\nEach new caption must use a completely different hook, structure, and angle.`
    : "";

  const hashtagGuide = {
    Instagram: "Include 6-10 hashtags. Mix: 2-3 ultra-niche (under 100K posts), 3-4 niche (100K-1M), 2-3 broad (1M+). Place at the end.",
    Facebook: "Include 2-3 hashtags only. Very targeted to the post topic.",
    LinkedIn: "Include 3-5 professional hashtags. Industry + topic + audience focused.",
    TikTok: "Include 5-8 hashtags. Mix trending (check what's hot in this niche) + niche-specific.",
    "Twitter/X": "Include 1-2 hashtags ONLY. Weave them naturally into the text or at the end. Every character counts.",
    YouTube: "Include 3-5 hashtags placed at the very end of the description. Focus on broad searchable terms relevant to the video topic.",
    Pinterest: "Include 2-5 hashtags at the end. Highly descriptive and keyword-rich — think what someone would search to find this pin.",
  }[platform] ?? "Include 6-10 relevant hashtags.";

  // Collect all sample captions — prefer the new array, fall back to legacy single field
  const allSamples = (() => {
    const arr = (brandVoice?.sampleCaptions ?? []).filter(Boolean);
    if (arr.length > 0) return arr;
    if (brandVoice?.sampleCaption) return [brandVoice.sampleCaption];
    return [];
  })();

  const hasBrandVoice = brandVoice && (
    brandVoice.brandName || brandVoice.tagline || brandVoice.personality?.length ||
    brandVoice.targetAudience || brandVoice.captionStyle?.length ||
    brandVoice.alwaysInclude || brandVoice.neverSay ||
    brandVoice.voiceDescription || allSamples.length > 0
  );

  const hasSamplesOrDescription = allSamples.length > 0 || !!brandVoice?.voiceDescription;

  const brandVoiceSection = hasBrandVoice
    ? `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GHOST-WRITING BRIEF — THIS OVERRIDES EVERYTHING ELSE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
You are NOT generating captions for someone. You ARE ${brandVoice?.brandName ?? "this person"}, writing this yourself. One goal: they read the output and think "I wrote this."
${brandVoice?.voiceDescription ? `
HOW THEY DESCRIBE THEIR OWN VOICE (in their own words):
"${brandVoice.voiceDescription}"
This is your primary guide — they know their voice better than any checkbox. Honor every word of this description.
` : ""}${allSamples.length > 0 ? `
REAL CAPTIONS THIS PERSON HAS WRITTEN:
${allSamples.map((s, i) => `┌─ Example ${i + 1} ${"─".repeat(50 - String(i + 1).length - 12)}┐\n${s}\n└${"─".repeat(52)}┘`).join("\n\n")}

━━━ STEP 1 — VOICE ANALYSIS (complete before writing anything) ━━━
Read each example above at least twice. Then lock in these patterns:

□ Sentence length — fragments? Long flowing? Short punchy bursts? Mixed?
□ Punctuation signature — em-dashes (—)? Ellipsis (...)? Exclamation points? Mostly periods? No punctuation?
□ Capitalization — standard? all lowercase? CAPS FOR EMPHASIS? Inconsistent-but-intentional?
□ Emoji behavior — count per caption, placement (inline / end / none), emotional register
□ Opening move — question? Bold "I" statement? Scene-setting? One-word punch? Addressing the reader directly?
□ Closing move — question? Command? Trailing thought? CTA? Just stops?
□ Vocabulary — everyday casual? Slang? Industry terms they've made their own? Polished? A specific mix?
□ Line break rhythm — dense paragraphs? One thought per line? Single words alone for impact?
□ Their TELLS — words, phrases, or patterns they repeat that are unmistakably theirs

━━━ STEP 2 — SAMPLE-FIRST OVERRIDE RULES ━━━
The samples show how this person ACTUALLY writes. They override the settings below:
• Samples use NO emojis → write zero emojis, no matter what the emoji setting says
• Samples are consistently short → write short, no matter what the length setting says
• Samples are all lowercase → write all lowercase
• Samples never end with a question → don't add one
• Samples use a specific punctuation pattern → replicate it exactly, even if unconventional
• Samples have no CTAs → don't force one
Reason: what they DO reveals their real voice. Settings reveal their preferences — the samples reveal their truth.

━━━ STEP 3 — WRITE ━━━
Ghost-write AS them. Commit fully — over-matching their voice is always better than under-matching it.
` : ""}${brandVoice?.brandName ? `\nBrand: ${brandVoice.brandName}` : ""}${brandVoice?.tagline ? `\nTagline: "${brandVoice.tagline}" — absorb the rhythm and energy of this phrase` : ""}${brandVoice?.personality?.length ? `\nPersonality traits (non-negotiable, not a suggestion): ${brandVoice.personality.join(" + ")}` : ""}${brandVoice?.targetAudience ? `\nWriting to: ${brandVoice.targetAudience} — address them as if writing directly to this specific person` : ""}${brandVoice?.captionStyle?.length ? `\nStructural rules they've set: ${brandVoice.captionStyle.join(", ")}` : ""}${brandVoice?.alwaysInclude ? `\nAlways weave in naturally: ${brandVoice.alwaysInclude}` : ""}${brandVoice?.neverSay ? `\nNEVER use these words or phrases: ${brandVoice.neverSay}` : ""}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`
    : "";


  return `TASK: Write ${count} exceptional, publish-ready social media caption(s) for this ${niche} business. These will go directly onto a real business's social media — they must be the best captions this business has ever posted.

━━━ THE POST ━━━
What this post is about: ${postDescription}
${postType ? `Post type: ${postType}` : ""}

━━━ KNOW YOUR AUDIENCE ━━━
${brandVoiceSection}${nicheProfile}

━━━ PLATFORM MASTERY ━━━
${platformGuide}

━━━ CRAFT REQUIREMENTS ━━━
${toneInstruction}
Length: ${lengthGuide}
${emojiInstruction}
${ctaInstruction}${keywordsInstruction ? `\n${keywordsInstruction}` : ""}
Hashtags: ${hashtagGuide}
${postTypeFormula}

━━━ PSYCHOLOGICAL REQUIREMENTS ━━━
Every caption must trigger at least ONE of these proven psychological responses:
- CURIOSITY: Reader must know what comes next. Open a loop the body closes.
- IDENTITY: Reader thinks "this is about me / this describes me exactly"
- SOCIAL PROOF: Numbers, results, or "everyone is doing this" signals
- URGENCY/SCARCITY: Time pressure or limited availability that makes inaction feel costly
- ASPIRATION: Vivid picture of the life/result the reader wants
- VALIDATION: "You're not crazy for thinking/feeling/wanting this"

━━━ QUALITY STANDARDS ━━━
Each caption MUST:
1. Open with a hook that stops the scroll — ask yourself: "Would I actually stop for this?" If not, rewrite it.
2. Contain at least ONE specific, concrete detail — a number, a name, a time, a price, a result. Vague = invisible.
3. Sound like a smart, real human — not a marketing department, not a chatbot, not a press release
4. Speak to the CUSTOMER'S world — their desires, fears, frustrations, or dreams. The business is mentioned only as the solution.
5. Use a completely different hook type and structure from the other captions in this set
6. Be platform-perfect — correct length, right energy, right hashtag count for ${platform ?? "Instagram"}
7. Pass the "so what?" test — after reading it, the customer must feel compelled to act, comment, save, or share

FORBIDDEN PHRASES (if any of these appear, rewrite that section):
"game-changer", "dive in", "delve", "unleash", "elevate your", "cutting-edge", "passionate about", "we're excited", "journey", "synergy", "seamless", "holistic", "empower", "innovative", "transformative", "at the end of the day", "it's no secret", "in today's world", "look no further", "don't miss out", "stay tuned", "proud to announce", "we are thrilled", "game changing"

Hook archetypes — use a DIFFERENT one for each caption:
- The Confession: "I used to [embarrassing/relatable thing] until [turning point]"
- The Contrarian: "Unpopular opinion: [something counterintuitive about this niche]"
- The Specific Result: "[Exact number] [result] in [timeframe]. Here's how."
- The Shared Enemy: "If you've ever [frustrating experience], this is for you"
- The Open Loop: "[Intriguing partial statement]... and I've never looked back."
- The Bold Claim: A single powerful sentence that begs to be fact-checked${avoidSection}
${hasSamplesOrDescription ? `
━━━ FINAL VOICE CHECK (required before outputting) ━━━
You have a ghost-writing brief above. Before writing your JSON response, re-read each caption once more and ask — out loud if you could — "Would ${brandVoice?.brandName ?? "this person"} post this word-for-word, without changing anything?"

If the answer is anything other than an unqualified YES:
→ Identify the word, phrase, or sentence that broke the illusion
→ Replace it with what THEY would actually say
→ Check again

This is the final gate. A caption that misses their voice fails — no matter how good it is otherwise.
` : ""}
━━━ RESPOND IN THIS EXACT JSON FORMAT ━━━
{
  "captions": [
    {
      "caption": "The full caption text here — no hashtags in this field",
      "hashtags": "#hashtag1 #hashtag2 #hashtag3"
    }
  ]
}`;
}

// Personal mode — everyday captions for real people WITHOUT a brand/business.
// No niche profile, no "customer", no sales framing. Just a relatable human
// posting a moment from their own life for friends and followers.
function buildPersonalCaptionPrompt(params: {
  postDescription: string;
  tone: string;
  platform?: string;
  captionLength?: string;
  includeEmojis?: boolean;
  ctaType?: string;
  keywords?: string;
  count?: number;
  avoidCaptions?: string[];
}) {
  const {
    postDescription,
    tone,
    platform = "Instagram",
    captionLength = "Medium",
    includeEmojis = true,
    ctaType,
    keywords,
    count = 3,
    avoidCaptions = [],
  } = params;

  const platformGuide = PLATFORM_GUIDES[platform] ?? PLATFORM_GUIDES["Instagram"];

  const tones = tone.split(",").map((t) => t.trim()).filter(Boolean);
  const toneBlend = tones.map((t) => TONE_BLEND_GUIDE[t]).filter(Boolean).join(" | ");
  const toneInstruction = tones.length > 1
    ? `Blend these tones together naturally (${tones.join(" + ")}): ${toneBlend}`
    : `Tone: ${tones[0]} — ${toneBlend || tones[0]}`;

  const lengthGuide = {
    Short: "Short: 1-3 punchy lines, under 150 characters. A single vivid thought or one-liner.",
    Medium: "Medium: 3-6 lines, 150-300 characters. A relatable moment with a little personality.",
    Long: "Long: 8-15 lines, 400-700 characters. A story or a stream-of-thought with rhythm and line breaks.",
  }[captionLength] ?? "Medium: 3-6 lines, 150-300 characters.";

  const emojiInstruction = includeEmojis
    ? "Emojis: Use 2-4 emojis naturally — the way a real person texts. Never as filler."
    : "Emojis: DO NOT use any emojis whatsoever.";

  // In personal mode, business CTAs (Shop Now, Book Now, etc.) don't fit. Only
  // honor engagement-style prompts; otherwise keep it to a natural, optional nudge.
  const engagementCtas = new Set([
    "Comment Below", "Drop a Comment", "Tell Us Below", "Tag a Friend",
    "Share This", "Save This Post", "Follow for More",
  ]);
  const ctaInstruction = ctaType && ctaType !== "None" && engagementCtas.has(ctaType)
    ? `Engagement: End with a natural, friendly version of '${ctaType}' — only if it fits the vibe. Never salesy.`
    : "Engagement: If it fits naturally, end with something that invites replies (a question, a relatable confession, a 'be honest…'). Optional — never force it.";

  const keywordsInstruction = keywords && keywords.trim()
    ? `Must-include: naturally work ALL of these words/phrases into every caption without forcing it — ${keywords.trim()}.`
    : "";

  const hashtagGuide = {
    Instagram: "Include 5-8 relatable hashtags — the kind real people actually use, not marketing tags. Place at the end.",
    Facebook: "Include 1-2 hashtags only, if any.",
    LinkedIn: "Include 2-3 relevant hashtags.",
    TikTok: "Include 4-6 hashtags — mix trending + relatable. #fyp is fine.",
    "Twitter/X": "Include 1-2 hashtags ONLY, woven in naturally.",
    YouTube: "Include 3-5 hashtags at the very end.",
    Pinterest: "Include 2-5 descriptive, searchable hashtags.",
  }[platform] ?? "Include 5-8 relatable hashtags.";

  const avoidSection = avoidCaptions.length > 0
    ? `\n\nCRITICAL — DO NOT produce captions similar to these already shown:\n${avoidCaptions.map((c, i) => `${i + 1}. ${c}`).join("\n")}\nEach new caption must use a completely different angle and opening.`
    : "";

  return `TASK: Write ${count} authentic, scroll-stopping social media caption(s) for a REAL PERSON posting to their own PERSONAL account — not a business. There is no product, no brand, and nothing being sold. This is someone sharing a moment from their own life with friends and followers.

━━━ THE POST ━━━
What this post is about: ${postDescription}

━━━ WHO'S POSTING ━━━
A regular person — think of writing as a witty, self-aware friend. The goal is likes, comments, and shares from friends, NOT conversions or marketing. Never sound like a brand, an ad, or a chatbot.

━━━ PLATFORM MASTERY ━━━
${platformGuide}

━━━ CRAFT REQUIREMENTS ━━━
${toneInstruction}
Length: ${lengthGuide}
${emojiInstruction}
${ctaInstruction}${keywordsInstruction ? `\n${keywordsInstruction}` : ""}
Hashtags: ${hashtagGuide}

━━━ WHAT MAKES A GREAT PERSONAL CAPTION ━━━
- Sounds unmistakably human — never corporate, never salesy
- Relatable: captures a feeling or moment other people instantly recognize
- Has personality: humor, honesty, a genuine thought, or a hot take
- Specific beats generic ("third coffee before noon" beats "enjoying coffee")
- Feels effortless, like they tossed it off — even though every word is chosen

FORBIDDEN PHRASES (these scream AI or ad copy — never use):
"game-changer", "dive in", "delve", "unleash", "elevate your", "cutting-edge", "passionate about", "journey", "synergy", "seamless", "empower", "innovative", "transformative", "at the end of the day", "it's no secret", "in today's world", "look no further", "don't miss out", "stay tuned", "proud to announce", "we are thrilled", "excited to share"

Use a DIFFERENT opening move for each caption — e.g. relatable confession, funny observation, a genuine thought, a bold little opinion, a vivid tiny moment, or a question.${avoidSection}

━━━ RESPOND IN THIS EXACT JSON FORMAT ━━━
{
  "captions": [
    {
      "caption": "The full caption text here — no hashtags in this field",
      "hashtags": "#hashtag1 #hashtag2 #hashtag3"
    }
  ]
}`;
}

function buildHashtagPrompt(params: { niche: string; topic: string; platform?: string }) {
  const { niche, topic, platform = "Instagram" } = params;
  const nicheProfile = NICHE_PROFILES[niche] ?? `${niche} business`;
  const now = new Date();
  const monthName = now.toLocaleString("en-US", { month: "long" });
  const year = now.getFullYear();
  const dateContext = `Today is ${monthName} ${now.getDate()}, ${year}. Factor in the current season, any major upcoming holidays or events in the next 30 days, and month-specific trends when choosing hashtags.`;

  const platformHashtagGuide = {
    Instagram: `Instagram hashtag strategy (post-2023 algorithm):
- The sweet spot is 5-10 highly targeted hashtags, NOT 30 generic ones
- Ideal mix: 3-4 niche-specific (10K-500K posts) + 2-3 topic-specific (500K-2M) + 1-2 broad (2M+)
- Niche tags get you discovered by the RIGHT people; broad tags get you buried
- Avoid: #love #instagood #photooftheday #likeforlike #follow — Instagram deprioritizes these
- Include at least 1-2 community hashtags that real people in this niche actively follow
- Hashtags with high save-rates in the niche perform better than raw follower counts`,
    Facebook: `Facebook hashtag strategy:
- Hashtags matter far less on Facebook than other platforms — quality over quantity
- Use 2-3 highly specific, community-based tags maximum
- Focus on hashtags tied to Facebook Groups or local communities
- Avoid generic tags — Facebook's search is topic-based, not hashtag-driven
- Best use: 1 broad topic tag + 1 location or community tag + 1 seasonal/event tag if relevant`,
    LinkedIn: `LinkedIn hashtag strategy:
- LinkedIn users actively FOLLOW hashtags — choose ones your ideal client follows, not just uses
- 3-5 hashtags perform best; more than 5 looks spammy
- Mix: 1 broad industry tag (followed by millions) + 2 specific professional topic tags + 1-2 audience-specific tags
- LinkedIn hashtags that work: #[Industry], #[Skill], #[Role] (e.g. #Marketing, #ContentStrategy, #SmallBusiness)
- Avoid: overly niche tags under 5K followers — not enough reach on LinkedIn`,
    TikTok: `TikTok hashtag strategy:
- TikTok's algorithm uses hashtags as content signals, not just discovery tools
- 5-8 hashtags is optimal — don't spam 20+
- Always include #fyp or #foryou as a broad signal (despite debate, they still appear in top-performing content)
- Mix: 2-3 niche-specific community tags + 2 trending topic tags for this category + 1-2 broad reach tags
- Check what's trending RIGHT NOW in this niche category — include at least 1-2 currently active trends
- Lowercase, single-word hashtags often outperform multi-word on TikTok`,
    "Twitter/X": `Twitter/X hashtag strategy:
- 1-2 hashtags MAXIMUM — more than 2 actively hurts reach on X
- Choose hashtags where real conversations are happening right now (check trending topics)
- Weave naturally into the text when possible rather than appending at the end
- Focus on the single most relevant community tag for this niche
- Avoid branded or obscure hashtags — X users follow conversations, not niches`,
  }[platform] ?? "Mix niche-specific with broader reach hashtags. Prioritize discoverability over volume.";

  return `TASK: Generate the 30 highest-performing hashtags for a ${niche} business posting about: "${topic}"

Platform: ${platform}
Current date context: ${dateContext}

AUDIENCE: ${nicheProfile}

PLATFORM STRATEGY:
${platformHashtagGuide}

━━━ THE 3 GROUPS ━━━

NICHE (10 tags) — Your precision targeting layer:
These reach people who are ALREADY interested in exactly this content. Think: what hashtags does your ideal customer scroll through on a Tuesday night? Include:
- Hashtags specific to the ${niche} industry and this exact topic
- Community hashtags that real ${niche} enthusiasts follow (not just post)
- Micro-niche variations that signal deep relevance to the algorithm
- 1-2 seasonal/timely tags if the current date makes them relevant (${monthName} ${year})
- NO generic business tags here — these should feel hyper-specific

POPULAR (10 tags) — Your reach extension layer:
Well-established hashtags with proven engagement in this category. These push content beyond your existing followers to interested discovery audiences. Include:
- Category-level tags that are actively used but not oversaturated
- Topic-specific popular tags that have consistent engagement (not just post volume)
- 1-2 event or seasonal tags if currently relevant given today's date
- Tags that appear in the "Related hashtags" for this niche's content

BROAD (10 tags) — Your maximum discovery layer:
High-volume hashtags that cast the widest net while still being contextually relevant. Include:
- Universal small business and entrepreneurship tags
- Broad lifestyle or interest tags that this audience also cares about
- Platform-specific popular discovery tags

━━━ QUALITY RULES ━━━
✓ Every tag must be real, searchable, and currently active
✓ Vary between singular/plural where both exist (#FitnessCoach and #FitnessCoaching)
✓ Seasonally relevant tags should reflect the current month (${monthName} ${year})
✗ BANNED — never include these: #love #instagood #photooftheday #follow #like4like #likeforlike #f4f #followforfollow — these are engagement-bait that destroys reach
✗ No hashtags with under 1,000 posts (too obscure to help)
✗ No hashtags flagged for shadowbanning (overly sexual, spam-adjacent, or previously banned terms)

Respond ONLY with valid JSON — no explanation, no markdown:
{
  "hashtags": ["#all30hashtags", "#combined", "#into", "#one", "#flat", "#array"],
  "grouped": {
    "niche": ["#niche1", "#niche2", "#niche3", "#niche4", "#niche5", "#niche6", "#niche7", "#niche8", "#niche9", "#niche10"],
    "popular": ["#popular1", "#popular2", "#popular3", "#popular4", "#popular5", "#popular6", "#popular7", "#popular8", "#popular9", "#popular10"],
    "broad": ["#broad1", "#broad2", "#broad3", "#broad4", "#broad5", "#broad6", "#broad7", "#broad8", "#broad9", "#broad10"]
  }
}`;
}

captionsRouter.post("/captions/generate", async (req, res) => {
  const parsed = GenerateCaptionsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const userId = resolveIdentity(req);
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  // Circuit breaker FIRST — a capped request must consume no credits.
  if (await isSpendCapped(req, res)) return;
  const { allowed, isPro, refund } = await enforceUsageLimit(userId, req, res, 1);
  if (!allowed) return;

  const { mode, niche, postDescription, tone, platform, postType, captionLength, includeEmojis, ctaType, keywords } = parsed.data;
  const isPersonal = mode === "personal";
  // Personal mode never uses brand voice — it's for people without a brand.
  const brandVoice = isPersonal ? undefined : (req.body.brandVoice as BrandVoice | undefined);

  const allSamples = (brandVoice?.sampleCaptions ?? []).filter(Boolean).length > 0
    ? (brandVoice?.sampleCaptions ?? []).filter(Boolean)
    : brandVoice?.sampleCaption ? [brandVoice.sampleCaption] : [];
  const hasSamplesOrDescription = allSamples.length > 0 || !!brandVoice?.voiceDescription;

  const model = isPro ? PRO_MODEL : FREE_MODEL;
  try {
    const message = await anthropic.messages.create({
      model,
      max_tokens: 8192,
      system: isPersonal ? SYSTEM_PROMPT_PERSONAL : buildSystemPrompt(hasSamplesOrDescription),
      messages: [
        {
          role: "user",
          content: isPersonal
            ? buildPersonalCaptionPrompt({
                postDescription,
                tone,
                platform: platform ?? undefined,
                captionLength: captionLength ?? undefined,
                includeEmojis: includeEmojis ?? true,
                ctaType: ctaType ?? undefined,
                keywords: keywords ?? undefined,
                count: 3,
              })
            : buildCaptionPrompt({
                niche: niche || "General Business",
                postDescription,
                tone,
                platform: platform ?? undefined,
                postType: postType ?? undefined,
                captionLength: captionLength ?? undefined,
                includeEmojis: includeEmojis ?? true,
                ctaType: ctaType ?? undefined,
                keywords: keywords ?? undefined,
                count: 3,
                brandVoice,
              }),
        },
      ],
    });
    logAiCost(userId, "generate", isPro, model, message, req);

    const block = message.content[0];
    if (block.type !== "text") {
      await refund();
      res.status(500).json({ error: "Unexpected response type from AI" });
      return;
    }

    let rawText = block.text.trim();
    const jsonMatch = rawText.match(/```json\n?([\s\S]*?)\n?```/) || rawText.match(/```\n?([\s\S]*?)\n?```/);
    if (jsonMatch) rawText = jsonMatch[1].trim();

    const parsed_response = JSON.parse(rawText) as { captions: { caption: string; hashtags: string }[] };
    if (!parsed_response.captions || !Array.isArray(parsed_response.captions)) {
      await refund();
      res.status(500).json({ error: "Invalid AI response format" });
      return;
    }

    res.json({ captions: parsed_response.captions });
  } catch (err) {
    await refund();
    req.log.error({ err }, "Caption generation failed");
    res.status(500).json({ error: "Failed to generate captions" });
  }
});

captionsRouter.post("/captions/regenerate-one", async (req, res) => {
  const parsed = RegenerateOneCaptionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const userId = resolveIdentity(req);
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  // Circuit breaker FIRST — a capped request must consume no credits.
  if (await isSpendCapped(req, res)) return;
  const { allowed, isPro, refund } = await enforceUsageLimit(userId, req, res, 1);
  if (!allowed) return;

  const { mode, niche, postDescription, tone, platform, postType, captionLength, includeEmojis, ctaType, keywords, existingCaptions } = parsed.data;
  const isPersonalRegen = mode === "personal";
  const brandVoice = isPersonalRegen ? undefined : (req.body.brandVoice as BrandVoice | undefined);

  const allSamplesRegen = (brandVoice?.sampleCaptions ?? []).filter(Boolean).length > 0
    ? (brandVoice?.sampleCaptions ?? []).filter(Boolean)
    : brandVoice?.sampleCaption ? [brandVoice.sampleCaption] : [];
  const hasSamplesOrDescriptionRegen = allSamplesRegen.length > 0 || !!brandVoice?.voiceDescription;

  const model = isPro ? PRO_MODEL : FREE_MODEL;
  try {
    const message = await anthropic.messages.create({
      model,
      max_tokens: 8192,
      system: isPersonalRegen ? SYSTEM_PROMPT_PERSONAL : buildSystemPrompt(hasSamplesOrDescriptionRegen),
      messages: [
        {
          role: "user",
          content: isPersonalRegen
            ? buildPersonalCaptionPrompt({
                postDescription,
                tone,
                platform: platform ?? undefined,
                captionLength: captionLength ?? undefined,
                includeEmojis: includeEmojis ?? true,
                ctaType: ctaType ?? undefined,
                keywords: keywords ?? undefined,
                count: 1,
                avoidCaptions: existingCaptions ?? [],
              })
            : buildCaptionPrompt({
                niche: niche || "General Business",
                postDescription,
                tone,
                platform: platform ?? undefined,
                postType: postType ?? undefined,
                captionLength: captionLength ?? undefined,
                includeEmojis: includeEmojis ?? true,
                ctaType: ctaType ?? undefined,
                keywords: keywords ?? undefined,
                count: 1,
                avoidCaptions: existingCaptions ?? [],
                brandVoice,
              }),
        },
      ],
    });
    logAiCost(userId, "regenerate", isPro, model, message, req);

    const block = message.content[0];
    if (block.type !== "text") {
      await refund();
      res.status(500).json({ error: "Unexpected response type from AI" });
      return;
    }

    let rawText = block.text.trim();
    const jsonMatch = rawText.match(/```json\n?([\s\S]*?)\n?```/) || rawText.match(/```\n?([\s\S]*?)\n?```/);
    if (jsonMatch) rawText = jsonMatch[1].trim();

    const parsed_response = JSON.parse(rawText) as { captions: { caption: string; hashtags: string }[] };
    if (!parsed_response.captions?.[0]) {
      await refund();
      res.status(500).json({ error: "Invalid AI response format" });
      return;
    }

    res.json(parsed_response.captions[0]);
  } catch (err) {
    await refund();
    req.log.error({ err }, "Single caption regeneration failed");
    res.status(500).json({ error: "Failed to regenerate caption" });
  }
});

captionsRouter.post("/captions/hashtags", async (req, res) => {
  const parsed = GenerateHashtagsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const userId = resolveIdentity(req);
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  // Circuit breaker FIRST.
  if (await isSpendCapped(req, res)) return;
  // Hashtags don't cost a credit, but they DO call the AI — so they have
  // their own per-user monthly cap to stop unlimited abuse.
  const isPro = await isRevenueCatPro(userId);
  const meter = await consumeMeteredAction(userId, "hashtags", isPro);
  if (!meter.allowed) {
    res.status(429).json({
      error: "hashtag_limit_reached",
      message: `You've used all ${meter.cap} free hashtag sets this month. They reset on the 1st.`,
      cap: meter.cap,
    });
    return;
  }

  const { niche, topic, platform } = parsed.data;

  const model = isPro ? PRO_MODEL : FREE_MODEL;
  try {
    const message = await anthropic.messages.create({
      model,
      max_tokens: 8192,
      system: `You are the world's leading social media hashtag strategist — part data scientist, part cultural analyst. You've studied millions of posts across every major platform and know exactly which hashtags drive real discoverability vs. which ones burn reach on over-saturated, algorithm-penalized tags.

Your hashtag sets are used by real businesses to grow their audiences. You understand:
- The difference between a hashtag with high post volume vs. high engagement rate
- Which tags the algorithm actively promotes vs. which it suppresses
- How to build a hashtag "funnel" — niche precision + mid-range reach + broad discovery
- Seasonal and moment-based hashtag opportunities that most businesses miss
- Platform-specific hashtag behavior (Instagram rewards relevance, TikTok rewards trending signals, LinkedIn rewards professional specificity)

You NEVER recommend:
- Engagement-bait tags (#like4like #follow #instagood #love #photooftheday) — these actively hurt reach
- Shadowbanned or spam-adjacent hashtags
- Tags with under 1,000 posts (too obscure) or so oversaturated they bury content instantly
- Generic filler that applies to any business in any industry

Always respond with valid JSON only — no markdown, no code blocks, no explanation.`,
      messages: [
        {
          role: "user",
          content: buildHashtagPrompt({ niche, topic, platform: platform ?? undefined }),
        },
      ],
    });
    logAiCost(userId, "hashtags", isPro, model, message, req);

    const block = message.content[0];
    if (block.type !== "text") {
      res.status(500).json({ error: "Unexpected response type from AI" });
      return;
    }

    let rawText = block.text.trim();
    const jsonMatch = rawText.match(/```json\n?([\s\S]*?)\n?```/) || rawText.match(/```\n?([\s\S]*?)\n?```/);
    if (jsonMatch) rawText = jsonMatch[1].trim();

    const raw = JSON.parse(rawText) as {
      hashtags?: unknown;
      grouped?: { niche?: unknown; popular?: unknown; trending?: unknown; broad?: unknown };
    };

    // Normalize into a shape the client can always rely on — every group is guaranteed
    // to be a string[], and a stray "trending" key is mapped to "popular" so the UI never breaks.
    const g = raw?.grouped ?? {};
    const asArr = (v: unknown): string[] =>
      Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
    const nicheTags = asArr(g.niche);
    const popularTags = asArr(g.popular).length > 0 ? asArr(g.popular) : asArr(g.trending);
    const broadTags = asArr(g.broad);
    const flat = asArr(raw?.hashtags);

    res.json({
      hashtags: flat.length > 0 ? flat : [...nicheTags, ...popularTags, ...broadTags],
      grouped: { niche: nicheTags, popular: popularTags, broad: broadTags },
    });
  } catch (err) {
    // AI failed after we metered the action — give the allowance back.
    await meter.rollback();
    req.log.error({ err }, "Hashtag generation failed");
    res.status(500).json({ error: "Failed to generate hashtags" });
  }
});

captionsRouter.post("/captions/remix", async (req, res) => {
  const { caption, direction, platform } = req.body as {
    caption?: string;
    direction?: string;
    platform?: string;
  };

  if (!caption || typeof caption !== "string" || !direction || typeof direction !== "string") {
    res.status(400).json({ error: "caption and direction are required" });
    return;
  }

  const userId = resolveIdentity(req);
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  // Circuit breaker FIRST.
  if (await isSpendCapped(req, res)) return;
  const isPro = await isRevenueCatPro(userId);
  // Remix is free of credits but AI-backed — apply its own monthly cap.
  const meter = await consumeMeteredAction(userId, "remix", isPro);
  if (!meter.allowed) {
    res.status(429).json({
      error: "remix_limit_reached",
      message: `You've used all ${meter.cap} free remixes this month. They reset on the 1st.`,
      cap: meter.cap,
    });
    return;
  }

  const directionGuide: Record<string, string> = {
    "Make it shorter": "Compress to the punchiest possible version — keep only the highest-impact words. Target under 100 characters for the caption body.",
    "Make it longer": "Expand with a compelling story arc, more sensory detail, and a stronger hook. Use line breaks for rhythm. Aim for 400-600 characters.",
    "Make it funnier": "Add wit, wordplay, or a self-aware humorous angle. Should make someone smile or laugh while still selling. Never forced or cringe.",
    "More professional": "Elevate the language — polished, authoritative, confident. Remove slang. Every word signals expertise. Suitable for LinkedIn.",
    "More casual": "Rewrite so it sounds like a real human texted it to a friend. Contractions, relaxed phrasing, conversational flow.",
    "Add urgency": "Inject time pressure and FOMO throughout — 'limited time', 'today only', 'before it's gone', countdown language. Make inaction feel costly.",
    "More emotional": "Dial up the feeling — connect to real human desires, fears, or joys. Should resonate in the gut, not just the head.",
    "Change the hook": "Keep the core message but write a completely different opening line — different hook type, angle, and energy.",
  };

  const guidance = directionGuide[direction] ?? `Rewrite this caption to be: ${direction}. Keep the core message but change the style, tone, or structure to match.`;
  const platformHint = platform ? ` Optimized for ${platform}.` : "";

  const prompt = `You are the world's best social media copywriter. Your job: take this existing caption and remix it in ONE specific direction — fully committed, no half-measures.

ORIGINAL CAPTION:
${caption}

REMIX DIRECTION: ${direction}
INSTRUCTION: ${guidance}${platformHint}

RULES:
- Keep the same core message and purpose as the original
- Apply the direction change FULLY — commit to it completely, don't be timid
- The result must be better than the original, not just different
- The remixed caption must pass the scroll-stop test: would someone actually pause for this?
- Keep at least ONE specific, concrete detail (number, result, name, time) — vague remixes fail
- Update hashtags to match the new tone and direction
- Respond with valid JSON only

FORBIDDEN PHRASES — do not use any of these in the remix:
"game-changer", "dive in", "delve", "unleash", "elevate your", "cutting-edge", "passionate about", "we're excited", "journey", "synergy", "seamless", "holistic", "empower", "innovative", "transformative", "look no further", "don't miss out", "stay tuned", "proud to announce"

RESPOND IN THIS EXACT JSON FORMAT:
{
  "caption": "The remixed caption text here — no hashtags",
  "hashtags": "#hashtag1 #hashtag2 #hashtag3"
}`;

  const model = isPro ? PRO_MODEL : FREE_MODEL;
  try {
    const message = await anthropic.messages.create({
      model,
      max_tokens: 8192,
      system: "You are the world's best social media copywriter. Always respond with valid JSON only — no markdown fences, no code blocks, no extra commentary.",
      messages: [{ role: "user", content: prompt }],
    });
    logAiCost(userId, "remix", isPro, model, message, req);

    const block = message.content[0];
    if (block.type !== "text") {
      res.status(500).json({ error: "Unexpected response type from AI" });
      return;
    }

    let rawText = block.text.trim();
    const jsonMatch = rawText.match(/```json\n?([\s\S]*?)\n?```/) || rawText.match(/```\n?([\s\S]*?)\n?```/);
    if (jsonMatch) rawText = jsonMatch[1].trim();

    const parsed_response = JSON.parse(rawText) as { caption: string; hashtags: string };
    if (!parsed_response.caption) {
      res.status(500).json({ error: "Invalid AI response format" });
      return;
    }

    res.json(parsed_response);
  } catch (err) {
    // AI failed after we metered the action — give the allowance back.
    await meter.rollback();
    req.log.error({ err }, "Caption remix failed");
    res.status(500).json({ error: "Failed to remix caption" });
  }
});

export default captionsRouter;

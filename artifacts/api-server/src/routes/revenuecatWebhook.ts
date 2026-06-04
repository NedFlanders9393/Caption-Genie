/**
 * RevenueCat webhook handler.
 *
 * RevenueCat sends a POST whenever subscription / IAP state changes for any
 * user. We grant credits in response to:
 *   - INITIAL_PURCHASE / RENEWAL / UNCANCELLATION (auto-renewing sub)
 *       → grant 150 subscription credits
 *   - NON_RENEWING_PURCHASE (consumable credit packs)
 *       → grant N purchased credits per product id
 *   - CANCELLATION → no-op (sub credits expire naturally at next reset cycle)
 *   - EXPIRATION → no-op (same reason)
 *   - REFUND → refund credits from purchased bucket
 *
 * Idempotency: every event has a unique `id`. We insert into
 * `processed_rc_events` first; if that conflicts, we already processed it.
 *
 * Auth: RevenueCat sends a configurable Authorization header. We compare
 * against `REVENUECAT_WEBHOOK_AUTH`. Set this in the RC dashboard and as a
 * Replit secret.
 */
import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { processedRevenueCatEvents } from "@workspace/db/schema";
import {
  grantSubscriptionCredits,
  grantPurchasedCredits,
  refundCredits,
} from "../services/credits.js";

const router: IRouter = Router();

const PRO_MONTHLY_CREDITS = 150;

/**
 * Map RevenueCat product identifier → credits to grant for that purchase.
 * Keep these in sync with App Store Connect product IDs.
 */
// Keys are RevenueCat `product_id` values (matches the App Store / Play Store
// store_identifier). Keep in sync with scripts/src/seedRevenueCat.ts.
const CREDIT_PACK_PRODUCTS: Record<string, number> = {
  // NOTE: the number in the product ID is a legacy label, NOT the credits granted.
  // Packs were retuned to small "top-ups" (20/50/200) to drive repeat purchases
  // and steer regular users to the Pro subscription. Keep these grant amounts in
  // sync with Paywall.tsx (TOP_UP_PACKS) and seedRevenueCat.ts (CREDIT_PACKS).
  "com.captionai.app.credits.50": 20,
  "com.captionai.app.credits.200": 50,
  "com.captionai.app.credits.500": 200,
};

const PRO_SUBSCRIPTION_PRODUCTS = new Set<string>([
  "com.captionai.app.pro",
  "com.captionai.app.pro.yearly",
  // Play Store sends the base-plan-suffixed identifier
  "com.captionai.app.pro:monthly",
  "com.captionai.app.pro.yearly:annual",
]);

interface RCEvent {
  id: string;
  type: string;
  app_user_id?: string;
  original_app_user_id?: string;
  product_id?: string;
  event_timestamp_ms?: number;
}

interface RCWebhookBody {
  event?: RCEvent;
  api_version?: string;
}

function getCreditsForProduct(productId: string): number | null {
  return CREDIT_PACK_PRODUCTS[productId] ?? null;
}

router.post("/webhooks/revenuecat", async (req, res) => {
  // 1. Verify shared-secret header — FAIL CLOSED.
  // In production we must reject if the secret isn't configured; otherwise
  // anyone who finds the URL can forge credit grants.
  const expectedAuth = process.env.REVENUECAT_WEBHOOK_AUTH;
  if (!expectedAuth) {
    if (process.env.NODE_ENV === "production") {
      req.log.error("REVENUECAT_WEBHOOK_AUTH not configured — refusing webhook in production");
      return res.status(500).json({ error: "webhook_auth_misconfigured" });
    }
    req.log.warn("REVENUECAT_WEBHOOK_AUTH not set — accepting webhook without auth (dev only)");
  } else {
    const provided = req.headers.authorization;
    if (provided !== expectedAuth) {
      req.log.warn({ provided: provided ? "present" : "missing" }, "RevenueCat webhook auth mismatch");
      return res.status(401).json({ error: "unauthorized" });
    }
  }

  const body = req.body as RCWebhookBody;
  const event = body?.event;
  if (!event?.id || !event?.type) {
    return res.status(400).json({ error: "missing_event" });
  }

  const userId = event.app_user_id ?? event.original_app_user_id;
  if (!userId) {
    return res.status(400).json({ error: "missing_user_id" });
  }

  // 2. Idempotency: insert event id; if conflict, already processed.
  try {
    const inserted = await db
      .insert(processedRevenueCatEvents)
      .values({
        eventId: event.id,
        eventType: event.type,
        userId,
      })
      .onConflictDoNothing()
      .returning({ eventId: processedRevenueCatEvents.eventId });

    if (inserted.length === 0) {
      req.log.info({ eventId: event.id }, "RevenueCat event already processed, skipping");
      return res.json({ ok: true, deduped: true });
    }
  } catch (err) {
    req.log.error({ err }, "Failed idempotency insert");
    return res.status(500).json({ error: "idempotency_check_failed" });
  }

  // 3. Dispatch on event type
  try {
    const productId = event.product_id ?? "";

    switch (event.type) {
      case "INITIAL_PURCHASE":
      case "RENEWAL":
      case "UNCANCELLATION":
      case "PRODUCT_CHANGE": {
        if (PRO_SUBSCRIPTION_PRODUCTS.has(productId)) {
          await grantSubscriptionCredits(
            userId,
            PRO_MONTHLY_CREDITS,
            event.type === "INITIAL_PURCHASE" ? "subscription_initial" : "subscription_renewal",
            productId,
            { eventId: event.id, eventType: event.type },
          );
          req.log.info({ userId, productId, eventType: event.type }, "Granted subscription credits");
        } else if (event.type === "INITIAL_PURCHASE") {
          // Likely a NON_RENEWING_PURCHASE but came through as INITIAL_PURCHASE
          // for the first credit-pack purchase. Try as a credit pack.
          const credits = getCreditsForProduct(productId);
          if (credits) {
            await grantPurchasedCredits(userId, credits, productId, {
              eventId: event.id,
              eventType: event.type,
            });
            req.log.info({ userId, productId, credits }, "Granted purchased credits (from INITIAL_PURCHASE)");
          } else {
            req.log.warn({ userId, productId, eventType: event.type }, "Unknown product, skipping");
          }
        }
        break;
      }

      case "NON_RENEWING_PURCHASE": {
        const credits = getCreditsForProduct(productId);
        if (credits) {
          await grantPurchasedCredits(userId, credits, productId, {
            eventId: event.id,
            eventType: event.type,
          });
          req.log.info({ userId, productId, credits }, "Granted purchased credits");
        } else {
          req.log.warn({ userId, productId }, "Unknown consumable product id");
        }
        break;
      }

      case "CANCELLATION":
      case "EXPIRATION":
      case "BILLING_ISSUE":
      case "SUBSCRIBER_ALIAS":
      case "TRANSFER":
        // No credit changes — sub credits naturally expire on the next reset cycle.
        req.log.info({ userId, eventType: event.type }, "RevenueCat event acknowledged, no credit change");
        break;

      case "REFUND": {
        // Refund credits from purchased bucket. For subscription refunds we
        // currently no-op since subscription credits are time-bounded anyway.
        const credits = getCreditsForProduct(productId);
        if (credits) {
          await refundCredits(userId, credits, productId, {
            eventId: event.id,
            eventType: event.type,
          });
          req.log.info({ userId, productId, credits }, "Refunded purchased credits");
        } else {
          req.log.info({ userId, productId }, "Refund for non-pack product, no credit change");
        }
        break;
      }

      default:
        req.log.warn({ eventType: event.type }, "Unhandled RevenueCat event type");
    }

    return res.json({ ok: true });
  } catch (err) {
    // IMPORTANT: do NOT delete the idempotency marker on error. Deleting it
    // would allow RevenueCat retries to re-process and double-grant credits
    // if the grant transaction actually committed before we got here.
    //
    // Tradeoff: a permanent failure here means the grant is lost and must
    // be applied manually (operator runs grant via SQL or a one-off script).
    // We log loudly with the event id so it's traceable.
    req.log.error(
      { err, eventId: event.id, eventType: event.type, userId },
      "FAILED to process RevenueCat event — marker kept, manual grant may be required",
    );
    return res.status(500).json({ error: "processing_failed" });
  }
});

export default router;

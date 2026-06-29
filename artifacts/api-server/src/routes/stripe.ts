import { Router, type IRouter } from 'express';
import { storage } from '../storage.js';
import { getUncachableStripeClient } from '../stripeClient.js';

const router: IRouter = Router();

// Create checkout session (email-based, no user auth required)
router.post('/api/stripe/checkout', async (req, res) => {
  try {
    const { email } = req.body as { email?: string };
    if (!email || !email.includes('@')) {
      res.status(400).json({ error: 'Valid email is required' });
      return;
    }

    const stripe = await getUncachableStripeClient();

    const priceId = await storage.getActiveProPriceId();
    if (!priceId) {
      res.status(500).json({ error: 'No active price found. Please contact support.' });
      return;
    }

    // Find or create customer by email
    const existingCustomers = await stripe.customers.list({ email, limit: 1 });
    let customerId: string;

    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
    } else {
      const customer = await stripe.customers.create({ email });
      customerId = customer.id;
    }

    const baseUrl = `https://${(process.env.REPLIT_DOMAINS ?? '').split(',')[0]}`;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${baseUrl}/app?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/app?checkout=cancel`,
    });

    res.json({ url: session.url });
  } catch (err: any) {
    req.log.error({ err }, 'Stripe checkout error');
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Verify a completed checkout session
router.get('/api/stripe/verify-session', async (req, res) => {
  try {
    const { session_id } = req.query as { session_id?: string };
    if (!session_id) {
      res.status(400).json({ error: 'session_id is required' });
      return;
    }

    const stripe = await getUncachableStripeClient();
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['subscription'],
    });

    const isPro = session.payment_status === 'paid' || session.status === 'complete';
    const email = session.customer_details?.email ?? null;
    const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null;

    res.json({ isPro, email, customerId });
  } catch (err: any) {
    req.log.error({ err }, 'Stripe verify session error');
    res.status(500).json({ error: 'Failed to verify session' });
  }
});

// Check subscription status by customer ID or email
router.post('/api/stripe/check-status', async (req, res) => {
  try {
    const { email, customerId } = req.body as { email?: string; customerId?: string };

    if (!email && !customerId) {
      res.status(400).json({ error: 'email or customerId is required' });
      return;
    }

    let resolvedCustomerId = customerId;

    if (!resolvedCustomerId && email) {
      const customer = await storage.getCustomerByEmail(email);
      resolvedCustomerId = customer?.id ?? undefined;
    }

    if (!resolvedCustomerId) {
      res.json({ isPro: false });
      return;
    }

    const subscription = await storage.getSubscriptionByCustomerId(resolvedCustomerId);
    const isPro = subscription !== null && ['active', 'trialing'].includes(subscription.status);

    res.json({ isPro, customerId: resolvedCustomerId });
  } catch (err: any) {
    req.log.error({ err }, 'Stripe check status error');
    res.status(500).json({ error: 'Failed to check subscription status' });
  }
});

export default router;

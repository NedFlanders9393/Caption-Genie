import { getUncachableStripeClient } from './stripeClient.js';

async function createProducts() {
  try {
    const stripe = await getUncachableStripeClient();

    console.log('Checking for existing CaptionAI Pro product...');

    const existingProducts = await stripe.products.search({
      query: "name:'CaptionAI Pro' AND active:'true'",
    });

    if (existingProducts.data.length > 0) {
      const product = existingProducts.data[0];
      console.log(`CaptionAI Pro already exists (${product.id}). Skipping creation.`);

      const prices = await stripe.prices.list({ product: product.id, active: true });
      prices.data.forEach((p) => {
        const amount = (p.unit_amount ?? 0) / 100;
        const interval = p.recurring?.interval ?? 'one-time';
        console.log(`  Price: $${amount}/${interval} → ${p.id}`);
      });
      return;
    }

    console.log('Creating CaptionAI Pro product...');
    const product = await stripe.products.create({
      name: 'CaptionAI Pro',
      description: 'Unlimited AI-powered social media captions for your business.',
    });
    console.log(`Created product: ${product.name} (${product.id})`);

    const monthlyPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: 999,
      currency: 'usd',
      recurring: { interval: 'month' },
    });
    console.log(`Created monthly price: $9.99/month (${monthlyPrice.id})`);

    console.log('\nDone! Stripe webhooks will sync this data to your database.');
  } catch (error: any) {
    console.error('Error creating products:', error.message);
    process.exit(1);
  }
}

createProducts();

import { getUncachableStripeClient } from './stripeClient';
import type Stripe from 'stripe';

type StripeClient = Awaited<ReturnType<typeof getUncachableStripeClient>>;

/**
 * Deactivate any active prices for the given interval and create a new one
 * with the specified amount. Idempotent: skips creation if an active price
 * with the exact amount already exists for that interval.
 */
async function replacePrice(
  stripe: StripeClient,
  productId: string,
  existingPrices: Stripe.Price[],
  interval: 'month' | 'year',
  amount: number,
  label: string,
) {
  const matching = existingPrices.filter(
    (p) => (p.recurring as { interval: string } | null)?.interval === interval,
  );

  const exact = matching.find((p) => p.unit_amount === amount);
  if (exact) {
    console.log(`    [SKIP] ${label} price already correct: ${exact.id} ($${(amount / 100).toFixed(2)})`);
    return exact;
  }

  // Deactivate stale prices for this interval
  for (const stale of matching) {
    await stripe.prices.update(stale.id, { active: false });
    console.log(`    [ARCHIVE] ${label} stale price ${stale.id} ($${(stale.unit_amount! / 100).toFixed(2)})`);
  }

  const price = await stripe.prices.create({
    product: productId,
    unit_amount: amount,
    currency: 'usd',
    recurring: { interval },
  });
  console.log(`    [CREATE] ${label}: $${(amount / 100).toFixed(2)} (${price.id})`);
  return price;
}

async function ensureProduct(
  stripe: StripeClient,
  opts: {
    name: string;
    description: string;
    tier: 'regular' | 'premium';
    monthlyAmount: number;
    yearlyAmount: number;
  },
) {
  const existing = await stripe.products.search({
    query: `metadata['tier']:'${opts.tier}' AND active:'true'`,
  });

  let product: Stripe.Product;
  if (existing.data.length > 0) {
    product = existing.data[0];
    console.log(`  [FOUND] ${product.name} (${product.id})`);
  } else {
    product = await stripe.products.create({
      name: opts.name,
      description: opts.description,
      metadata: { tier: opts.tier },
    });
    console.log(`  [CREATE] ${product.name} (${product.id})`);
  }

  const existingPrices = (await stripe.prices.list({ product: product.id, active: true })).data;

  await replacePrice(stripe, product.id, existingPrices, 'month', opts.monthlyAmount, 'Monthly');
  await replacePrice(stripe, product.id, existingPrices, 'year', opts.yearlyAmount, 'Yearly');
}

async function seedProducts() {
  try {
    const stripe = await getUncachableStripeClient();
    console.log('Seeding Latter House Life Stripe products…\n');

    // Regular: $5.99/mo · $59.99/yr (saves ~17%)
    await ensureProduct(stripe, {
      name: 'Latter House Life — Regular',
      description:
        'Full access to your faith-filled planner: daily, weekly & monthly views, all 5 trackers, Brain Dump, Truth Generator, scripture & encouragement, and AI planning help.',
      tier: 'regular',
      monthlyAmount: 599,  // $5.99
      yearlyAmount: 5999,  // $59.99
    });

    console.log('');

    // Premium: $9.99/mo · $99.99/yr (saves ~17%)
    await ensureProduct(stripe, {
      name: 'Latter House Life — Premium',
      description:
        'Everything in Regular, plus enhanced AI features: Weekly Planning Session, Health Summary, Financial Coaching, and a Personalized Daily Devotional generated fresh each morning.',
      tier: 'premium',
      monthlyAmount: 999,  // $9.99
      yearlyAmount: 9999,  // $99.99
    });

    console.log('\nDone. Webhooks will sync updated prices to your app.');
  } catch (error: unknown) {
    console.error('Error seeding products:', (error as Error).message);
    process.exit(1);
  }
}

seedProducts();

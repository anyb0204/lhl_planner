import Stripe from 'stripe';

async function getStripeCredentials(): Promise<{ secretKey: string; publishableKey: string; webhookSecret?: string }> {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error('STRIPE_SECRET_KEY is not set');
  return {
    secretKey,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY ?? '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  };
}

export async function getUncachableStripeClient(): Promise<Stripe> {
  const { secretKey } = await getStripeCredentials();
  return new Stripe(secretKey, { apiVersion: '2026-04-22.dahlia' });
}

export async function getStripePublishableKey(): Promise<string> {
  const { publishableKey } = await getStripeCredentials();
  return publishableKey;
}

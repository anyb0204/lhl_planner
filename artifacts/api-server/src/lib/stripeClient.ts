import Stripe from 'stripe';
import { StripeSync } from 'stripe-replit-sync';

async function getStripeCredentials(): Promise<{ secretKey: string; publishableKey: string; webhookSecret?: string }> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;

  if (!hostname || !xReplitToken) {
    throw new Error('Missing Replit environment variables. Ensure the Stripe integration is connected.');
  }

  const isProduction = process.env.REPLIT_DEPLOYMENT === '1';

  async function fetchForEnvironment(env: string) {
    const url = new URL(`https://${hostname}/api/v2/connection`);
    url.searchParams.set('include_secrets', 'true');
    url.searchParams.set('connector_names', 'stripe');
    url.searchParams.set('environment', env);

    const resp = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        'X-Replit-Token': xReplitToken!,
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!resp.ok) return null;
    const data = await resp.json() as { items?: Array<{ settings?: { secret?: string; publishable?: string; webhook_secret?: string } }> };
    return data.items?.[0]?.settings ?? null;
  }

  let settings = isProduction ? await fetchForEnvironment('production') : null;

  if (!settings?.secret) {
    settings = await fetchForEnvironment('development');
  }

  if (!settings?.secret) {
    throw new Error('Stripe integration not connected or missing secret key. Connect Stripe via the Integrations tab first.');
  }

  return {
    secretKey: settings.secret,
    publishableKey: settings.publishable ?? '',
    webhookSecret: settings.webhook_secret,
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

export async function getStripeSync(): Promise<StripeSync> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const { secretKey, webhookSecret } = await getStripeCredentials();
  return new StripeSync({
    poolConfig: { connectionString: databaseUrl },
    stripeSecretKey: secretKey,
    stripeWebhookSecret: webhookSecret ?? '',
  });
}

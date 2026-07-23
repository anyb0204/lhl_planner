import { getUncachableStripeClient } from './stripeClient';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) throw new Error('STRIPE_WEBHOOK_SECRET is not set');

    const stripe = await getUncachableStripeClient();
    // Throws on an invalid/forged signature — this is the security boundary.
    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);

    // TODO: stripe-replit-sync used to mirror products/prices/customers/subscriptions
    // into the local `stripe.*` schema on every event. That package is gone and this
    // replacement was never finished — verified events are accepted but not persisted,
    // so anything reading the local stripe.* tables (e.g. GET /api/stripe/subscription)
    // will see stale or empty data until this is implemented.
    void event;
  }
}

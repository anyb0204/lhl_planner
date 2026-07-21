import app from "./app";
import { logger } from "./lib/logger";
import { getUncachableStripeClient } from "./lib/stripeClient";
import { pool } from "@workspace/db";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function ensureStripeProduct() {
  try {
    const stripe = await getUncachableStripeClient();
    const products = await stripe.products.list({ active: true, limit: 1 });
    if (products.data.length > 0) {
      logger.info("Stripe product already exists");
      return;
    }

    logger.info("No Stripe product found — creating $9.99/month plan...");
    const product = await stripe.products.create({
      name: "Latter House Life Planner",
      description: "Full access to your faith-filled daily, weekly & monthly planner, trackers, and AI tools.",
    });

    await stripe.prices.create({
      product: product.id,
      unit_amount: 999,
      currency: "usd",
      recurring: { interval: "month" },
      nickname: "Monthly Plan",
    });

    logger.info({ productId: product.id }, "Stripe product and price created");
  } catch (err) {
    logger.warn({ err }, "Could not ensure Stripe product (will retry on next start)");
  }
}

async function initAppTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.calendar_tokens (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR NOT NULL UNIQUE,
        token VARCHAR(64) NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS public.notification_prefs (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR NOT NULL UNIQUE,
        browser_push BOOLEAN NOT NULL DEFAULT FALSE,
        email_morning_summary BOOLEAN NOT NULL DEFAULT FALSE,
        appointment_lead_minutes TEXT NOT NULL DEFAULT '60',
        refill_alert_days TEXT NOT NULL DEFAULT '5',
        quiet_start TEXT NOT NULL DEFAULT '21:00',
        quiet_end TEXT NOT NULL DEFAULT '07:00',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS public.push_subscriptions (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR NOT NULL,
        endpoint TEXT NOT NULL UNIQUE,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS public.user_memories (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR NOT NULL,
        kind TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS public.sent_encouragements (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR NOT NULL,
        scripture_reference TEXT,
        theme TEXT,
        sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS public.reminder_last_sent (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR NOT NULL,
        reminder_key TEXT NOT NULL,
        last_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (user_id, reminder_key)
      );
    `);
    logger.info("App tables ready");
  } catch (err) {
    logger.warn({ err }, "Could not create app tables (may already exist)");
  }
}

async function initStripe() {
  try {
    await ensureStripeProduct();
  } catch (err) {
    logger.warn({ err }, "Stripe initialization error");
  }
}

await initStripe();
await initAppTables();

const server = app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});

function shutdown(signal: string) {
  logger.info({ signal }, "Shutting down gracefully");
  server.close(() => {
    logger.info("Server closed");
    process.exit(0);
  });
  setTimeout(() => {
    logger.warn("Forced shutdown after timeout");
    process.exit(1);
  }, 5000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

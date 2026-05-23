import app from "./app";
import { logger } from "./lib/logger";
import { runMigrations } from "stripe-replit-sync";
import { getStripeSync, getUncachableStripeClient } from "./lib/stripeClient";

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

async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    logger.warn("DATABASE_URL not set — skipping Stripe initialization");
    return;
  }

  try {
    logger.info("Initializing Stripe schema...");
    await runMigrations({ databaseUrl });
    logger.info("Stripe schema ready");

    await ensureStripeProduct();

    const stripeSync = await getStripeSync();

    const webhookBaseUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;
    await stripeSync.findOrCreateManagedWebhook(`${webhookBaseUrl}/api/stripe/webhook`);
    logger.info("Stripe webhook configured");

    stripeSync.syncBackfill()
      .then(() => logger.info("Stripe data synced"))
      .catch((err) => logger.error({ err }, "Stripe syncBackfill error"));
  } catch (err) {
    logger.warn({ err }, "Stripe initialization skipped (integration not connected yet)");
  }
}

await initStripe();

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

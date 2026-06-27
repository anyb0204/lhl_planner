import { Router } from "express";
import Stripe from "stripe";
import { stripeStorage } from "../lib/stripeStorage";
import { getUncachableStripeClient } from "../lib/stripeClient";
import { requireAuth } from "../middlewares/requireAuth";
import { isOwner } from "../lib/ownerCheck";

const router = Router();

function isStripeResourceMissing(err: unknown): boolean {
  return (
    err instanceof Error &&
    "code" in err &&
    (err as Record<string, unknown>).code === "resource_missing"
  );
}

router.get("/stripe/subscription-status", requireAuth, async (req, res) => {
  const userId = req.user!.id;

  if (await isOwner(userId)) {
    res.json({ tier: "regular" });
    return;
  }

  try {
    const user = await stripeStorage.getUser(userId);

    if (user?.lifetimeAccess) {
      res.json({ tier: "regular" });
      return;
    }

    if (!user?.stripeCustomerId) {
      res.json({ tier: "free" });
      return;
    }

    const stripe = await getUncachableStripeClient();
    const subs = await stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      status: "all",
      limit: 10,
      expand: ["data.items.data.price"],
    });

    const activeSub = subs.data.find(
      (s) => s.status === "active" || s.status === "trialing"
    );

    if (!activeSub) {
      // Check scholarship status
      if (user?.scholarshipStatus === "approved") {
        res.json({ tier: "regular" });
        return;
      }
      res.json({ tier: "free" });
      return;
    }

    res.json({ tier: "regular" });
  } catch (err) {
    if (isStripeResourceMissing(err)) {
      try {
        await stripeStorage.updateUserStripeInfo(userId, { stripeCustomerId: "" });
      } catch (_) {}
      res.json({ tier: "free" });
      return;
    }
    req.log.error(err);
    res.status(503).json({ error: "Subscription check temporarily unavailable" });
  }
});

router.get("/stripe/products", async (req, res) => {
  try {
    const stripe = await getUncachableStripeClient();
    const [products, prices] = await Promise.all([
      stripe.products.list({ active: true, limit: 20 }),
      stripe.prices.list({ active: true, limit: 50 }),
    ]);

    const productsMap = products.data.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description ?? null,
      active: p.active,
      metadata: p.metadata,
      prices: prices.data
        .filter((pr) => pr.product === p.id)
        .map((pr) => ({
          id: pr.id,
          unit_amount: pr.unit_amount,
          currency: pr.currency,
          recurring: pr.recurring ?? null,
          active: pr.active,
        })),
    }));

    res.json({ data: productsMap });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/stripe/checkout", requireAuth, async (req, res) => {
  try {
    const body = req.body as {
      priceId?: string;
      amountCents?: number;
      mode?: "subscription" | "payment";
    };

    const { priceId, amountCents, mode = "subscription" } = body;

    if (!priceId && (!amountCents || amountCents < 500)) {
      res.status(400).json({ error: "priceId or amountCents (minimum 500) is required" });
      return;
    }

    await stripeStorage.upsertUser(req.user!.id);
    const user = await stripeStorage.getUser(req.user!.id);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const stripe = await getUncachableStripeClient();

    let customerId = user.stripeCustomerId || null;

    if (customerId) {
      try {
        await stripe.customers.retrieve(customerId);
      } catch (err) {
        if (isStripeResourceMissing(err)) {
          customerId = null;
          await stripeStorage.updateUserStripeInfo(user.id, { stripeCustomerId: "" });
        } else {
          throw err;
        }
      }
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { userId: user.id },
      });
      await stripeStorage.updateUserStripeInfo(user.id, { stripeCustomerId: customer.id });
      customerId = customer.id;
    }

    const proto = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
    const origin = `${proto}://${host}`;

    let resolvedPriceId = priceId;

    if (!resolvedPriceId && amountCents) {
      const price = await stripe.prices.create({
        currency: "usd",
        unit_amount: amountCents,
        ...(mode === "subscription"
          ? { recurring: { interval: "month" } }
          : {}),
        product_data: {
          name: mode === "subscription" ? "LatterHouseLife Monthly Donation" : "LatterHouseLife One-Time Donation",
        },
      });
      resolvedPriceId = price.id;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: resolvedPriceId, quantity: 1 }],
      mode: mode === "subscription" ? "subscription" : "payment",
      success_url: `${origin}/?donated=true`,
      cancel_url: `${origin}/pricing`,
    });

    res.json({ url: session.url });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/stripe/subscription", requireAuth, async (req, res) => {
  try {
    const user = await stripeStorage.getUser(req.user!.id);
    if (!user?.stripeSubscriptionId) {
      res.json({ subscription: null });
      return;
    }
    const subscription = await stripeStorage.getSubscription(user.stripeSubscriptionId);
    res.json({ subscription });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/stripe/portal", requireAuth, async (req, res) => {
  try {
    const user = await stripeStorage.getUser(req.user!.id);
    if (!user?.stripeCustomerId) {
      res.status(400).json({ error: "No Stripe customer found" });
      return;
    }

    const stripe = await getUncachableStripeClient();
    const proto = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
    const origin = `${proto}://${host}`;

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: origin,
    });

    res.json({ url: portalSession.url });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

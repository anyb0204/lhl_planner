import { Router } from "express";
import Stripe from "stripe";
import { stripeStorage } from "../lib/stripeStorage";
import { getUncachableStripeClient } from "../lib/stripeClient";
import { requireAuth } from "../middlewares/requireAuth";
import { isOwner } from "../lib/ownerCheck";

const router = Router();

function tierFromProduct(product: string | Stripe.Product | Stripe.DeletedProduct | null | undefined): "regular" | "premium" {
  if (!product || typeof product === "string") return "regular";
  if ("deleted" in product && product.deleted) return "regular";
  const meta = (product as Stripe.Product).metadata ?? {};
  return meta.tier === "premium" ? "premium" : "regular";
}

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
    res.json({ tier: "premium" });
    return;
  }

  try {
    const user = await stripeStorage.getUser(userId);

    if (user?.lifetimeAccess) {
      res.json({ tier: "premium" });
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
      res.json({ tier: "free" });
      return;
    }

    const priceProduct = activeSub.items.data[0]?.price?.product;
    const productId = typeof priceProduct === "string" ? priceProduct : priceProduct?.id;

    let tier: "regular" | "premium" = "regular";
    if (productId) {
      const product = await stripe.products.retrieve(productId);
      tier = tierFromProduct(product);
    }

    res.json({ tier });
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
    const { priceId } = req.body as { priceId: string };
    if (!priceId) {
      res.status(400).json({ error: "priceId is required" });
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

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${origin}/?subscribed=true`,
      cancel_url: `${origin}/`,
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

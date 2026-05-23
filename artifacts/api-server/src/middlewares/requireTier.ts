import { type Request, type Response, type NextFunction } from "express";
import Stripe from "stripe";
import { stripeStorage } from "../lib/stripeStorage";
import { getUncachableStripeClient } from "../lib/stripeClient";

export type Tier = "free" | "regular" | "premium";

const TIER_RANK: Record<Tier, number> = { free: 0, regular: 1, premium: 2 };

function tierFromProduct(product: string | Stripe.Product | Stripe.DeletedProduct | null | undefined): Tier {
  if (!product || typeof product === "string") return "regular";
  if ("deleted" in product && product.deleted) return "regular";
  const meta = (product as Stripe.Product).metadata ?? {};
  if (meta.tier === "premium") return "premium";
  if (meta.tier === "free") return "free";
  return "regular";
}

/** Distinguish between a known tier result and an indeterminate (Stripe unavailable) result. */
type TierResult =
  | { ok: true; tier: Tier }
  | { ok: false; reason: "stripe_unavailable" };

/** Resolve the subscription tier for the authenticated user.
 *  Returns { ok: false } when Stripe is unreachable so callers can respond with 503. */
export async function resolveUserTier(userId: string): Promise<TierResult> {
  try {
    const user = await stripeStorage.getUser(userId);
    if (user?.lifetimeAccess) return { ok: true, tier: "premium" };
    if (!user?.stripeCustomerId) return { ok: true, tier: "free" };

    const stripe = await getUncachableStripeClient();
    const subs = await stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      status: "all",
      limit: 10,
      expand: ["data.items.data.price.product"],
    });

    const activeSub = subs.data.find(
      (s) => s.status === "active" || s.status === "trialing"
    );
    if (!activeSub) return { ok: true, tier: "free" };

    return { ok: true, tier: tierFromProduct(activeSub.items.data[0]?.price?.product) };
  } catch {
    return { ok: false, reason: "stripe_unavailable" };
  }
}

/**
 * Express middleware that enforces a minimum subscription tier.
 * Must be used AFTER requireAuth (req.user must be populated).
 *
 * Returns 403 if the user's tier is confirmed below the required tier.
 * Returns 503 if Stripe is unreachable — fail-closed so uncertain state never grants access.
 */
export function requireTier(minimumTier: Tier) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const result = await resolveUserTier(userId);

    if (!result.ok) {
      req.log.warn({ userId }, "Stripe unavailable during tier check — denying access");
      res.status(503).json({ error: "Subscription check temporarily unavailable. Please try again shortly." });
      return;
    }

    if (TIER_RANK[result.tier] < TIER_RANK[minimumTier]) {
      res.status(403).json({
        error: "Premium subscription required",
        requiredTier: minimumTier,
        currentTier: result.tier,
      });
      return;
    }

    next();
  };
}

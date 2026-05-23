import { type Request, type Response, type NextFunction } from "express";
import { stripeStorage } from "../lib/stripeStorage";
import { getUncachableStripeClient } from "../lib/stripeClient";
import { isOwner } from "../lib/ownerCheck";

export async function requireSubscription(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    if (await isOwner(userId)) {
      next();
      return;
    }

    const user = await stripeStorage.getUser(userId);

    if (user?.lifetimeAccess) {
      next();
      return;
    }

    if (!user?.stripeCustomerId) {
      res.status(403).json({ error: "Active subscription required" });
      return;
    }

    const stripe = await getUncachableStripeClient();
    const subs = await stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      status: "all",
      limit: 5,
    });

    const active = subs.data.some(
      (s) => s.status === "active" || s.status === "trialing"
    );

    if (!active) {
      res.status(403).json({ error: "Active subscription required" });
      return;
    }

    next();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}

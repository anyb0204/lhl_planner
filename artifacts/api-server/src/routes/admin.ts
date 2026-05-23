import { Router, type Request, type Response } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { stripeStorage } from "../lib/stripeStorage";
import { z } from "zod/v4";

const router = Router();

const ownerIds = new Set(
  (process.env.OWNER_USER_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean)
);

function requireOwner(req: Request, res: Response, next: () => void) {
  if (!req.user || !ownerIds.has(req.user.id)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}

const emailSchema = z.object({ email: z.email() });

router.post("/admin/lifetime-access", requireAuth, requireOwner, async (req: Request, res: Response) => {
  const parsed = emailSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Valid email required" });
    return;
  }
  const result = await stripeStorage.grantLifetimeAccess(parsed.data.email);
  if (!result.found) {
    res.status(404).json({ error: "No account found with that email. They must sign up first." });
    return;
  }
  res.json({ success: true, alreadyHadAccess: !result.updated, email: parsed.data.email });
});

router.delete("/admin/lifetime-access", requireAuth, requireOwner, async (req: Request, res: Response) => {
  const parsed = emailSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Valid email required" });
    return;
  }
  const result = await stripeStorage.revokeLifetimeAccess(parsed.data.email);
  if (!result.found) {
    res.status(404).json({ error: "No account found with that email." });
    return;
  }
  res.json({ success: true, email: parsed.data.email });
});

router.get("/admin/lifetime-access", requireAuth, requireOwner, async (_req: Request, res: Response) => {
  const { db, usersTable } = await import("@workspace/db");
  const { eq } = await import("drizzle-orm");
  const users = await db.select({
    email: usersTable.email,
    firstName: usersTable.firstName,
    lastName: usersTable.lastName,
    createdAt: usersTable.createdAt,
  }).from(usersTable).where(eq(usersTable.lifetimeAccess, true));
  res.json({ users });
});

export default router;

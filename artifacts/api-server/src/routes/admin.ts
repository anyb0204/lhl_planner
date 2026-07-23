import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { stripeStorage } from "../lib/stripeStorage";
import { getLocalDateParts } from "../lib/aiBudget";
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

router.get("/admin/ai-usage", requireAuth, requireOwner, async (req: Request, res: Response) => {
  try {
    const { date, month } = getLocalDateParts();
    const monthlyLimit = Number(process.env.AI_MONTHLY_DOLLAR_LIMIT ?? "25");

    const [monthlyTotals, todayByUser, recentCalls] = await Promise.all([
      db.execute(sql`
        SELECT COALESCE(SUM(cost_usd), 0) AS spent, COALESCE(SUM(total_tokens), 0) AS tokens, COUNT(*) AS calls
        FROM public.ai_usage_log
        WHERE local_month = ${month}
      `),
      db.execute(sql`
        SELECT user_id, bucket, COUNT(*) AS calls
        FROM public.ai_usage_log
        WHERE local_date = ${date}
        GROUP BY user_id, bucket
        ORDER BY calls DESC
        LIMIT 50
      `),
      db.execute(sql`
        SELECT user_id, bucket, endpoint, model, prompt_tokens, completion_tokens, cost_usd, created_at
        FROM public.ai_usage_log
        ORDER BY created_at DESC
        LIMIT 50
      `),
    ]);

    const totals = monthlyTotals.rows[0] as { spent: string | number; tokens: string | number; calls: string | number };
    const spent = Number(totals.spent);
    const percentUsed = monthlyLimit > 0 ? Math.round(((spent / monthlyLimit) * 100) * 10) / 10 : 0;

    res.json({
      month,
      monthlyLimit,
      monthlySpent: spent,
      percentUsed,
      monthlyCalls: Number(totals.calls),
      monthlyTokens: Number(totals.tokens),
      today: todayByUser.rows,
      recentCalls: recentCalls.rows,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

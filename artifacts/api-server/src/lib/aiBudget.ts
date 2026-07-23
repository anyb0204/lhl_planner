import { type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { isOwner } from "./ownerCheck";

// $ per 1M tokens
interface ModelPrice {
  in: number;
  out: number;
}

const DEFAULT_MODEL_PRICES: Record<string, ModelPrice> = {
  "gpt-4o-mini": { in: 0.15, out: 0.6 },
  "gpt-5.4": { in: 2.5, out: 15.0 },
};

function loadModelPrices(): Record<string, ModelPrice> {
  const raw = process.env.AI_MODEL_PRICES;
  if (!raw) return DEFAULT_MODEL_PRICES;
  try {
    const overrides = JSON.parse(raw) as Record<string, ModelPrice>;
    return { ...DEFAULT_MODEL_PRICES, ...overrides };
  } catch {
    return DEFAULT_MODEL_PRICES;
  }
}

const MODEL_PRICES = loadModelPrices();

// Unknown models are billed at the gpt-5.4 rate on purpose — spend is never under-counted.
function priceForModel(model: string): ModelPrice {
  return MODEL_PRICES[model] ?? MODEL_PRICES["gpt-5.4"];
}

export function computeCostUsd(model: string, promptTokens: number, completionTokens: number): number {
  const price = priceForModel(model);
  const cost = (promptTokens / 1_000_000) * price.in + (completionTokens / 1_000_000) * price.out;
  return Math.round(cost * 1_000_000) / 1_000_000;
}

function limitTimezone(): string {
  return process.env.AI_LIMIT_TIMEZONE || "America/Chicago";
}

/** Returns today's local date ("YYYY-MM-DD") and month ("YYYY-MM") in AI_LIMIT_TIMEZONE. */
export function getLocalDateParts(): { date: string; month: string } {
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: limitTimezone(),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return { date, month: date.slice(0, 7) };
}

interface UsageTokens {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

/** Logs real token counts and dollar cost for a completed AI call. Best-effort — never throws. */
export async function recordAiUsage(params: {
  userId: string;
  bucket: string;
  endpoint: string;
  model: string;
  usage?: UsageTokens | null;
  log?: { error: (obj: unknown, msg?: string) => void };
}): Promise<void> {
  const promptTokens = params.usage?.prompt_tokens ?? 0;
  const completionTokens = params.usage?.completion_tokens ?? 0;
  const totalTokens = params.usage?.total_tokens ?? promptTokens + completionTokens;
  const costUsd = computeCostUsd(params.model, promptTokens, completionTokens);
  const { date, month } = getLocalDateParts();

  try {
    await db.execute(sql`
      INSERT INTO public.ai_usage_log
        (user_id, bucket, endpoint, model, prompt_tokens, completion_tokens, total_tokens, cost_usd, local_date, local_month)
      VALUES
        (${params.userId}, ${params.bucket}, ${params.endpoint}, ${params.model}, ${promptTokens}, ${completionTokens}, ${totalTokens}, ${costUsd}, ${date}, ${month})
    `);
  } catch (err) {
    params.log?.error({ err, userId: params.userId, endpoint: params.endpoint }, "Failed to log AI usage");
  }
}

/**
 * Per-user daily rate limiter for AI endpoints, persisted in Postgres so limits
 * survive restarts and deploys. Atomically increments a per-user/bucket/day
 * counter and denies once the limit is exceeded.
 *
 * Must run after requireAuth so req.user is populated.
 * Fails closed: if the database is unreachable, the call is denied.
 */
export function aiRateLimit(bucket: string, maxPerDay: number) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) {
      next();
      return;
    }

    const { date } = getLocalDateParts();

    try {
      const result = await db.execute(sql`
        INSERT INTO public.ai_daily_usage (user_id, bucket, local_date, count)
        VALUES (${userId}, ${bucket}, ${date}, 1)
        ON CONFLICT (user_id, bucket, local_date)
        DO UPDATE SET count = ai_daily_usage.count + 1
        RETURNING count
      `);
      const count = Number((result.rows[0] as { count: number | string }).count);

      res.setHeader("X-AI-Limit", maxPerDay);
      res.setHeader("X-AI-Remaining", Math.max(0, maxPerDay - count));

      if (count > maxPerDay) {
        req.log.info({ userId, bucket, count }, "AI rate limit reached");
        res.status(429).json({
          error:
            "You've used all your AI requests for today — come back tomorrow and you'll have a full set waiting for you.",
        });
        return;
      }

      next();
    } catch (err) {
      req.log.error({ err, userId, bucket }, "AI rate limit check failed — denying (fail-closed)");
      res.status(503).json({ error: "AI features are temporarily unavailable. Please try again shortly." });
    }
  };
}

/**
 * Enforces a total monthly dollar cap across all users, backed by ai_usage_log.
 * Adds a warning header past the soft-limit percentage and blocks past the
 * hard-limit percentage — except for the owner, who is never blocked.
 *
 * Must run after requireAuth so req.user is populated.
 * Fails closed: if the database is unreachable, the call is denied for everyone.
 */
export function aiBudgetGuard() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) {
      next();
      return;
    }

    const monthlyLimit = Number(process.env.AI_MONTHLY_DOLLAR_LIMIT ?? "25");
    const softPercent = Number(process.env.AI_SOFT_LIMIT_PERCENT ?? "80");
    const hardPercent = Number(process.env.AI_HARD_LIMIT_PERCENT ?? "100");
    const { month } = getLocalDateParts();

    let spent: number;
    try {
      const result = await db.execute(sql`
        SELECT COALESCE(SUM(cost_usd), 0) AS total
        FROM public.ai_usage_log
        WHERE local_month = ${month}
      `);
      spent = Number((result.rows[0] as { total: number | string }).total);
    } catch (err) {
      req.log.error({ err, userId }, "AI budget check failed — denying (fail-closed)");
      res.status(503).json({ error: "AI features are temporarily unavailable. Please try again shortly." });
      return;
    }

    const percentUsed = monthlyLimit > 0 ? (spent / monthlyLimit) * 100 : 0;

    if (percentUsed >= hardPercent) {
      if (!(await isOwner(userId))) {
        req.log.warn({ userId, spent, monthlyLimit, percentUsed }, "AI monthly budget hard limit reached");
        res.status(429).json({
          error: "AI features are resting for the month — they'll be back next month. Thank you for your patience!",
        });
        return;
      }
    } else if (percentUsed >= softPercent) {
      res.setHeader("X-AI-Budget-Warning", "true");
      req.log.warn({ userId, spent, monthlyLimit, percentUsed }, "AI monthly budget soft limit reached");
    }

    next();
  };
}

import { type Request, type Response, type NextFunction } from "express";

type BucketKey = string; // `${userId}:${bucket}`

interface Entry {
  count: number;
  resetAt: number; // unix ms for next midnight
}

const store = new Map<BucketKey, Entry>();

function nextMidnightMs(): number {
  const d = new Date();
  d.setHours(24, 0, 0, 0);
  return d.getTime();
}

function check(
  userId: string,
  bucket: string,
  maxPerDay: number,
): { allowed: boolean; remaining: number; resetsAt: string } {
  const key = `${userId}:${bucket}`;
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    const resetAt = nextMidnightMs();
    store.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: maxPerDay - 1,
      resetsAt: new Date(resetAt).toISOString(),
    };
  }

  if (entry.count >= maxPerDay) {
    return {
      allowed: false,
      remaining: 0,
      resetsAt: new Date(entry.resetAt).toISOString(),
    };
  }

  entry.count += 1;
  return {
    allowed: true,
    remaining: maxPerDay - entry.count,
    resetsAt: new Date(entry.resetAt).toISOString(),
  };
}

/**
 * Per-user daily rate limiter for AI endpoints.
 * bucket  — logical group name (e.g. "regular-ai", "premium-ai")
 * maxPerDay — maximum requests allowed per user per calendar day
 *
 * Must run after requireAuth so req.user is populated.
 * Returns 429 with a plain-language message when the limit is hit.
 */
export function aiRateLimit(bucket: string, maxPerDay: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userId = req.user?.id;
    if (!userId) {
      // requireAuth should have blocked this already; just pass through
      next();
      return;
    }

    const result = check(userId, bucket, maxPerDay);

    res.setHeader("X-AI-Limit", maxPerDay);
    res.setHeader("X-AI-Remaining", result.remaining);
    res.setHeader("X-AI-Reset", result.resetsAt);

    if (!result.allowed) {
      req.log.info({ userId, bucket }, "AI rate limit reached");
      res.status(429).json({
        error:
          "You've used all your AI requests for today — come back tomorrow and you'll have a full set waiting for you.",
        resetsAt: result.resetsAt,
      });
      return;
    }

    next();
  };
}

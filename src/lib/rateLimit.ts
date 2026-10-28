import type { NextApiRequest } from "next";

import { getServerEnv } from "./env";

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

/**
 * Fixed-window in-memory rate limiter. This app runs as a single instance, so
 * process memory is sufficient. Swap for Redis if it is ever scaled out.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now()
): RateLimitResult {
  pruneExpired(now);

  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  if (existing.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return {
    ok: true,
    remaining: limit - existing.count,
    retryAfterSeconds: 0,
  };
}

function pruneExpired(now: number): void {
  if (buckets.size < 1000) return;

  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function clientIp(req: NextApiRequest): string {
  const env = getServerEnv();

  if (env.TRUST_PROXY) {
    const forwarded = req.headers["x-forwarded-for"];
    const header = Array.isArray(forwarded) ? forwarded[0] : forwarded;

    if (header) {
      const first = header.split(",")[0]?.trim();
      if (first) return first;
    }
  }

  return req.socket?.remoteAddress ?? "unknown";
}

/** Test helper. */
export function resetRateLimits(): void {
  buckets.clear();
}

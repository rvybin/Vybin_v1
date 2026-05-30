/**
 * Fixed-window rate limiter backed by Deno KV.
 * Falls back to allow-all if KV is unavailable (e.g. local dev).
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
}

/**
 * @param key       - unique rate-limit key (e.g. "fn-name:user:uuid" or "fn-name:ip:1.2.3.4")
 * @param maxReqs   - max requests allowed per window
 * @param windowSec - window size in seconds
 */
export async function checkRateLimit(
  key: string,
  maxReqs: number,
  windowSec: number
): Promise<RateLimitResult> {
  let kv: Deno.Kv;
  try {
    kv = await Deno.openKv();
  } catch {
    // KV unavailable — allow through (fail open, log for visibility)
    console.warn("rateLimit: Deno KV unavailable, skipping rate limit for", key);
    return { allowed: true, remaining: maxReqs, retryAfterSec: 0 };
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const window = Math.floor(nowSec / windowSec);
  const kvKey = ["rl", key, window];
  // How many seconds until this window resets
  const retryAfterSec = (window + 1) * windowSec - nowSec;

  // Optimistic atomic increment — retry up to 5 times on conflict
  let count = 0;
  for (let attempt = 0; attempt < 5; attempt++) {
    const entry = await kv.get<number>(kvKey);
    const current = entry.value ?? 0;
    const next = current + 1;

    const res = await kv.atomic()
      .check(entry)
      .set(kvKey, next, { expireIn: (windowSec + 10) * 1000 })
      .commit();

    if (res.ok) {
      count = next;
      break;
    }
  }

  const allowed = count <= maxReqs;
  return {
    allowed,
    remaining: Math.max(0, maxReqs - count),
    retryAfterSec: allowed ? 0 : retryAfterSec,
  };
}

export function tooManyRequests(
  corsHeaders: Record<string, string>,
  retryAfterSec: number
): Response {
  return new Response(
    JSON.stringify({ error: "Too many requests. Please try again later." }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": String(retryAfterSec),
      },
    }
  );
}

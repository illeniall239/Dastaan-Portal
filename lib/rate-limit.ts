/**
 * Simple in-memory rate limiter
 *
 * For production with multiple instances, consider using:
 * - Upstash Redis (@upstash/ratelimit)
 * - Vercel Edge Config
 *
 * Current implementation: Sliding window in memory
 * Limitations: Resets on server restart, doesn't work across multiple instances
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// Store rate limit data in memory
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  /**
   * Maximum number of requests allowed in the time window
   */
  limit: number;

  /**
   * Time window in milliseconds
   */
  window: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Check if a request should be rate limited
 *
 * @param identifier - Unique identifier (IP address, user ID, etc.)
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export function rateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // No existing entry or window expired - allow request
  if (!entry || entry.resetTime < now) {
    const resetTime = now + config.window;
    rateLimitStore.set(identifier, { count: 1, resetTime });

    return {
      success: true,
      limit: config.limit,
      remaining: config.limit - 1,
      reset: resetTime,
    };
  }

  // Check if limit exceeded
  if (entry.count >= config.limit) {
    return {
      success: false,
      limit: config.limit,
      remaining: 0,
      reset: entry.resetTime,
    };
  }

  // Increment counter
  entry.count++;
  rateLimitStore.set(identifier, entry);

  return {
    success: true,
    limit: config.limit,
    remaining: config.limit - entry.count,
    reset: entry.resetTime,
  };
}

/**
 * Get client identifier from request
 * Uses IP address or fallback to 'anonymous'
 */
export function getClientIdentifier(request: Request): string {
  // Try to get IP from headers (works with most proxies/load balancers)
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");

  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, get the first one
    return forwarded.split(",")[0].trim();
  }

  if (realIp) {
    return realIp;
  }

  // Fallback - not ideal but prevents complete failure
  return "anonymous";
}

/**
 * Pre-configured rate limit presets
 */
export const RateLimitPresets = {
  /**
   * Strict: 10 requests per minute
   * Use for: Authentication endpoints, password reset
   */
  strict: { limit: 10, window: 60 * 1000 },

  /**
   * Standard: 30 requests per minute
   * Use for: Most API endpoints
   */
  standard: { limit: 30, window: 60 * 1000 },

  /**
   * Relaxed: 100 requests per minute
   * Use for: Read-only endpoints, public data
   */
  relaxed: { limit: 100, window: 60 * 1000 },

  /**
   * Very Strict: 5 requests per 5 minutes
   * Use for: Email sending, notification creation
   */
  veryStrict: { limit: 5, window: 5 * 60 * 1000 },
};

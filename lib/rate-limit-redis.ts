/**
 * Redis-backed rate limiter using Upstash
 *
 * Production-ready implementation for distributed rate limiting across multiple server instances.
 * Uses sliding window algorithm with Redis for persistent, distributed state.
 *
 * Improvements over in-memory version:
 * - Works across multiple server instances (horizontal scaling)
 * - Persistent state (survives server restarts)
 * - Automatic expiration with TTL
 * - Graceful degradation if Redis is unavailable
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * In-memory rate limiter fallback
 * Used when Redis is unavailable to provide basic protection
 */
interface InMemoryRecord {
  count: number;
  resetTime: number;
}

const inMemoryStore = new Map<string, InMemoryRecord>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of inMemoryStore.entries()) {
    if (record.resetTime <= now) {
      inMemoryStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

function inMemoryRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const record = inMemoryStore.get(identifier);

  // If no record or expired, create new window
  if (!record || record.resetTime <= now) {
    const resetTime = now + config.window;
    inMemoryStore.set(identifier, {
      count: 1,
      resetTime,
    });

    return {
      success: true,
      limit: config.limit,
      remaining: config.limit - 1,
      reset: resetTime,
    };
  }

  // Increment count
  record.count++;
  inMemoryStore.set(identifier, record);

  const remaining = Math.max(0, config.limit - record.count);
  const success = record.count <= config.limit;

  return {
    success,
    limit: config.limit,
    remaining,
    reset: record.resetTime,
  };
}

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
 * Initialize Redis client
 * Requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables
 */
let redis: Redis | null = null;

function getRedisClient(): Redis | null {
  // Return existing client if already initialized
  if (redis) return redis;

  // Check if Redis credentials are configured
  // Note: env validation happens at module load, but Redis is optional
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn(
      "[Rate Limit] Redis credentials not configured. Rate limiting will use fallback mode (allow all)."
    );
    return null;
  }

  try {
    redis = new Redis({
      url,
      token,
    });
    return redis;
  } catch (error) {
    console.error("[Rate Limit] Failed to initialize Redis client:", error);
    return null;
  }
}

/**
 * Create a rate limiter with the specified configuration
 */
function createRateLimiter(config: RateLimitConfig): Ratelimit | null {
  const client = getRedisClient();
  if (!client) return null;

  try {
    return new Ratelimit({
      redis: client,
      limiter: Ratelimit.slidingWindow(config.limit, `${config.window} ms`),
      analytics: true, // Enable analytics for monitoring
      prefix: "ratelimit", // Namespace for Redis keys
    });
  } catch (error) {
    console.error("[Rate Limit] Failed to create rate limiter:", error);
    return null;
  }
}

/**
 * Cache of rate limiters for each configuration
 * Avoids recreating rate limiters for common presets
 */
const rateLimiterCache = new Map<string, Ratelimit | null>();

function getRateLimiter(config: RateLimitConfig): Ratelimit | null {
  const cacheKey = `${config.limit}:${config.window}`;

  if (rateLimiterCache.has(cacheKey)) {
    return rateLimiterCache.get(cacheKey)!;
  }

  const limiter = createRateLimiter(config);
  rateLimiterCache.set(cacheKey, limiter);
  return limiter;
}

/**
 * Check if a request should be rate limited
 *
 * @param identifier - Unique identifier (IP address, user ID, etc.)
 * @param config - Rate limit configuration
 * @returns Rate limit result
 *
 * @example
 * ```ts
 * const identifier = getClientIdentifier(request);
 * const result = await rateLimit(identifier, RateLimitPresets.strict);
 *
 * if (!result.success) {
 *   return NextResponse.json(
 *     { error: "Too many requests" },
 *     {
 *       status: 429,
 *       headers: {
 *         "X-RateLimit-Limit": result.limit.toString(),
 *         "X-RateLimit-Remaining": result.remaining.toString(),
 *         "X-RateLimit-Reset": result.reset.toString(),
 *       },
 *     }
 *   );
 * }
 * ```
 */
export async function rateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const limiter = getRateLimiter(config);

  // Fallback: If Redis is unavailable, use in-memory rate limiting
  // This provides basic protection even when Redis is down
  if (!limiter) {
    console.warn(
      `[Rate Limit] Redis unavailable, using in-memory fallback for identifier: ${identifier}`
    );
    return inMemoryRateLimit(identifier, config);
  }

  try {
    const result = await limiter.limit(identifier);

    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (error) {
    console.error("[Rate Limit] Error checking rate limit:", error);

    // Fallback to in-memory rate limiting if Redis operation fails
    console.warn(
      `[Rate Limit] Using in-memory fallback due to Redis error for identifier: ${identifier}`
    );
    return inMemoryRateLimit(identifier, config);
  }
}

/**
 * Get client identifier from request
 * Uses IP address or fallback to 'anonymous'
 *
 * Priority order:
 * 1. x-forwarded-for header (proxy/load balancer)
 * 2. x-real-ip header
 * 3. Fallback to 'anonymous'
 */
export function getClientIdentifier(request: Request): string {
  // Try to get IP from headers (works with most proxies/load balancers)
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");

  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, get the first one (client IP)
    return forwarded.split(",")[0].trim();
  }

  if (realIp) {
    return realIp;
  }

  // Fallback - not ideal but prevents complete failure
  // All anonymous users will share the same rate limit counter
  console.warn("[Rate Limit] Could not determine client IP, using 'anonymous'");
  return "anonymous";
}

/**
 * Pre-configured rate limit presets
 *
 * These match the original in-memory implementation for easy migration
 */
export const RateLimitPresets = {
  /**
   * Strict: 10 requests per minute
   * Use for: Authentication endpoints, password reset, sensitive operations
   */
  strict: { limit: 10, window: 60 * 1000 },

  /**
   * Standard: 30 requests per minute
   * Use for: Most API endpoints, form submissions
   */
  standard: { limit: 30, window: 60 * 1000 },

  /**
   * Relaxed: 100 requests per minute
   * Use for: Read-only endpoints, public data, GET requests
   */
  relaxed: { limit: 100, window: 60 * 1000 },

  /**
   * Very Strict: 5 requests per 5 minutes
   * Use for: Email sending, notification creation, external API calls
   */
  veryStrict: { limit: 5, window: 5 * 60 * 1000 },
};

/**
 * Helper function to create rate limit response headers
 * Include these headers in your API responses for better client experience
 */
export function createRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": result.limit.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": result.reset.toString(),
    // Standard headers (draft specification)
    "RateLimit-Limit": result.limit.toString(),
    "RateLimit-Remaining": result.remaining.toString(),
    "RateLimit-Reset": result.reset.toString(),
  };
}

/**
 * Utility to reset rate limit for a specific identifier
 * Useful for testing or manual intervention
 *
 * @param identifier - Identifier to reset
 * @param config - Rate limit configuration (to determine Redis key)
 */
export async function resetRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<void> {
  const client = getRedisClient();
  if (!client) {
    console.warn("[Rate Limit] Cannot reset - Redis unavailable");
    return;
  }

  try {
    // Upstash Ratelimit uses a specific key format: {prefix}:{identifier}
    const key = `ratelimit:${identifier}`;
    await client.del(key);
  } catch (error) {
    console.error("[Rate Limit] Error resetting rate limit:", error);
  }
}

import { NextResponse } from "next/server";
import { rateLimit, getClientIdentifier, RateLimitConfig, RateLimitResult } from "./rate-limit-redis";

/**
 * Apply rate limiting to an API route
 *
 * Usage:
 * ```typescript
 * export async function POST(request: Request) {
 *   const rateLimitResult = await applyRateLimit(request, { limit: 10, window: 60000 });
 *   if (!rateLimitResult.success) {
 *     return rateLimitResult.response;
 *   }
 *
 *   // Your API logic here
 * }
 * ```
 */
export async function applyRateLimit(
  request: Request,
  config: RateLimitConfig
): Promise<{ success: boolean; response?: NextResponse; result: RateLimitResult }> {
  const identifier = getClientIdentifier(request);
  const result = await rateLimit(identifier, config);

  if (!result.success) {
    const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);

    return {
      success: false,
      response: NextResponse.json(
        {
          error: "Too many requests",
          message: "You have exceeded the rate limit. Please try again later.",
          limit: result.limit,
          remaining: result.remaining,
          reset: new Date(result.reset).toISOString(),
          retryAfter: `${retryAfter} seconds`,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": result.limit.toString(),
            "X-RateLimit-Remaining": result.remaining.toString(),
            "X-RateLimit-Reset": result.reset.toString(),
            "Retry-After": retryAfter.toString(),
          },
        }
      ),
      result,
    };
  }

  return {
    success: true,
    result,
  };
}

/**
 * Add rate limit headers to a successful response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult
): NextResponse {
  response.headers.set("X-RateLimit-Limit", result.limit.toString());
  response.headers.set("X-RateLimit-Remaining", result.remaining.toString());
  response.headers.set("X-RateLimit-Reset", result.reset.toString());
  return response;
}

/**
 * Validate request body with Zod schema
 *
 * Usage:
 * ```typescript
 * const validation = await validateRequest(request, myZodSchema);
 * if (!validation.success) {
 *   return validation.response;
 * }
 * const data = validation.data;
 * ```
 */
export async function validateRequest<T>(
  request: Request,
  schema: { parse: (data: unknown) => T }
): Promise<{ success: boolean; data?: T; response?: NextResponse }> {
  try {
    const body = await request.json();
    const data = schema.parse(body);

    return {
      success: true,
      data,
    };
  } catch (error) {
    if (error instanceof Error && "issues" in error) {
      // Zod validation error
      return {
        success: false,
        response: NextResponse.json(
          {
            error: "Validation failed",
            message: "The request body contains invalid data",
            details: (error as any).issues,
          },
          { status: 400 }
        ),
      };
    }

    // JSON parsing error or other error
    return {
      success: false,
      response: NextResponse.json(
        {
          error: "Invalid request",
          message: error instanceof Error ? error.message : "Unable to parse request body",
        },
        { status: 400 }
      ),
    };
  }
}

/**
 * Handle API errors consistently
 */
export function handleApiError(error: unknown): NextResponse {
  console.error("API Error:", error);

  if (error instanceof Error) {
    // Known error
    return NextResponse.json(
      {
        error: "Internal server error",
        message: process.env.NODE_ENV === "development" ? error.message : "An unexpected error occurred",
      },
      { status: 500 }
    );
  }

  // Unknown error
  return NextResponse.json(
    {
      error: "Internal server error",
      message: "An unexpected error occurred",
    },
    { status: 500 }
  );
}

/**
 * Wrap an API handler to emit Server-Timing for end-to-end latency measurement.
 * Enhanced with OpenTelemetry tracing and metrics (Week 2)
 */
export async function withApiPerf(handler: () => Promise<NextResponse>, req?: Request): Promise<NextResponse> {
  const start = performance.now();
  const route = req ? new URL(req.url).pathname : 'unknown';
  const method = req?.method || 'UNKNOWN';

  try {
    // Import OTel utilities dynamically (only in production with OTel enabled)
    const { instrumentApiHandler } = process.env.NODE_ENV === 'production'
      ? await import('./telemetry/spans').catch(() => ({ instrumentApiHandler: null }))
      : { instrumentApiHandler: null };

    const { recordApiLatency } = process.env.NODE_ENV === 'production'
      ? await import('./telemetry/metrics').catch(() => ({ recordApiLatency: null }))
      : { recordApiLatency: null };

    // Execute handler (with OTel tracing if available)
    const res = instrumentApiHandler
      ? await instrumentApiHandler(route, handler)
      : await handler();

    const dur = performance.now() - start;

    // Add Server-Timing header
    res.headers.set("Server-Timing", `total;dur=${dur.toFixed(0)}`);

    // Add cache headers for GET requests
    if (req && req.method === 'GET') {
      res.headers.set('Cache-Control', 'public, max-age=30, s-maxage=120, stale-while-revalidate=300');
    }

    // Record metrics (if OTel is available)
    if (recordApiLatency) {
      recordApiLatency(route, method, res.status, dur);
    }

    return res;
  } catch (error) {
    const dur = performance.now() - start;

    // Record error metrics (if OTel is available)
    if (process.env.NODE_ENV === 'production') {
      const { recordApiLatency } = await import('./telemetry/metrics').catch(() => ({ recordApiLatency: null }));
      if (recordApiLatency) {
        recordApiLatency(route, method, 500, dur);
      }
    }

    const res = NextResponse.json({ error: "Internal server error" }, { status: 500 });
    res.headers.set("Server-Timing", `total;dur=${dur.toFixed(0)}`);
    return res;
  }
}

/**
 * Basic CORS handler. Locks API to allowed origins and methods.
 */
export function withCors(request: Request, response: NextResponse, options?: {
  origins?: string[];
  methods?: string[];
  headers?: string[];
  credentials?: boolean;
}): NextResponse {
  const origin = request.headers.get('origin') || '';
  const allowedOrigins = options?.origins || [
    process.env.NEXT_PUBLIC_APP_URL || '',
    process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : '',
  ].filter(Boolean);

  const isAllowedOrigin = allowedOrigins.includes(origin);

  const methods = options?.methods || ['GET','POST','PUT','PATCH','DELETE','OPTIONS'];
  const headers = options?.headers || ['Content-Type','Authorization'];
  const credentials = options?.credentials ?? true;

  if (isAllowedOrigin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    if (credentials) response.headers.set('Access-Control-Allow-Credentials', 'true');
  }
  response.headers.set('Vary', 'Origin');
  response.headers.set('Access-Control-Allow-Methods', methods.join(','));
  response.headers.set('Access-Control-Allow-Headers', headers.join(','));
  response.headers.set('Access-Control-Max-Age', '600');

  // Preflight
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: response.headers });
  }

  return response;
}
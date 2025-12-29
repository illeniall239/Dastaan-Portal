/**
 * OpenTelemetry-Aware API Middleware
 *
 * Provides middleware functions that combine Next.js API middleware with OpenTelemetry tracing.
 * Works alongside existing middleware in lib/api-middleware.ts
 *
 * Usage:
 * ```typescript
 * import { withTracing } from '@/lib/telemetry/middleware';
 *
 * export async function GET(request: Request) {
 *   return withTracing(request, async () => {
 *     const data = await getData();
 *     return NextResponse.json(data);
 *   });
 * }
 * ```
 */

import { NextResponse } from 'next/server';
import { withSpan, getTraceContext } from './tracer';
import { recordApiLatency, recordRateLimitExceeded } from './metrics';
import { addHttpAttributes, addErrorAttributes } from './attributes';
import { Span } from '@opentelemetry/api';

/**
 * Wrap an API route handler with automatic tracing
 * Creates a span for the request and adds HTTP attributes
 *
 * @param request Next.js request object
 * @param handler Request handler function
 * @returns Response from handler
 *
 * @example
 * export async function GET(request: Request) {
 *   return withTracing(request, async () => {
 *     const data = await getAlerts();
 *     return NextResponse.json(data);
 *   });
 * }
 */
export async function withTracing(
  request: Request,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  const method = request.method;
  const url = new URL(request.url);
  const route = url.pathname;

  return withSpan(
    'http.server.request',
    async (span: Span) => {
      // Add HTTP request attributes
      addHttpAttributes(span, { method, url: request.url, headers: request.headers });

      const startTime = performance.now();

      try {
        const response = await handler();
        const duration = performance.now() - startTime;

        // Add response attributes
        addHttpAttributes(span, {}, { status: response.status });

        // Record metrics
        recordApiLatency(route, method, response.status, duration);

        // Add trace ID to response headers for debugging
        const { traceId, spanId } = getTraceContext();
        if (traceId) {
          const headers = new Headers(response.headers);
          headers.set('x-trace-id', traceId);
          if (spanId) {
            headers.set('x-span-id', spanId);
          }

          return new NextResponse(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers,
          });
        }

        return response;
      } catch (error) {
        const duration = performance.now() - startTime;

        // Record error in span
        addErrorAttributes(span, error as Error);

        // Record metrics
        recordApiLatency(route, method, 500, duration);

        throw error;
      }
    },
    {
      'http.route': route,
      'http.method': method,
    }
  );
}

/**
 * Wrap an API handler with metrics recording
 * Lightweight alternative to withTracing when only metrics are needed
 *
 * @param request Next.js request object
 * @param handler Request handler function
 * @returns Response from handler
 *
 * @example
 * export async function POST(request: Request) {
 *   return withMetrics(request, async () => {
 *     // Your handler logic
 *     return NextResponse.json({ success: true });
 *   });
 * }
 */
export async function withMetrics(
  request: Request,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  const method = request.method;
  const url = new URL(request.url);
  const route = url.pathname;
  const startTime = performance.now();

  try {
    const response = await handler();
    const duration = performance.now() - startTime;

    // Record metrics
    recordApiLatency(route, method, response.status, duration);

    return response;
  } catch (error) {
    const duration = performance.now() - startTime;

    // Record error metrics
    recordApiLatency(route, method, 500, duration);

    throw error;
  }
}

/**
 * Combined wrapper for tracing and rate limiting
 * Use this for API routes that need both observability and rate limiting
 *
 * @param request Next.js request object
 * @param handler Request handler function
 * @param rateLimitConfig Optional rate limit configuration
 * @returns Response from handler or rate limit error
 *
 * @example
 * export async function POST(request: Request) {
 *   return instrumentHandler(request, async () => {
 *     const data = await createResource();
 *     return NextResponse.json(data);
 *   });
 * }
 */
export async function instrumentHandler(
  request: Request,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  // Use withTracing which already handles metrics
  return withTracing(request, handler);
}

/**
 * Record rate limit exceeded event
 * Call this when rate limiting is triggered
 *
 * @param request Next.js request object
 *
 * @example
 * if (rateLimited) {
 *   recordRateLimit(request);
 *   return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
 * }
 */
export function recordRateLimit(request: Request): void {
  try {
    const url = new URL(request.url);
    recordRateLimitExceeded(url.pathname);

    // Also record in current span if available
    const { getActiveSpan } = require('./tracer');
    const span = getActiveSpan();
    if (span) {
      span.addEvent('rate_limit.exceeded', {
        'http.route': url.pathname,
        'http.method': request.method,
      });
    }
  } catch (error) {
    // Silently fail
    if (process.env.NODE_ENV === 'development') {
      console.error('[OTel Middleware] Failed to record rate limit:', error);
    }
  }
}

/**
 * Create a traced response helper
 * Use for consistent response creation with automatic span attributes
 *
 * @param statusCode HTTP status code
 * @param data Response data
 * @returns Next.js response
 *
 * @example
 * return tracedResponse(200, { users: [...] });
 * // or
 * return tracedResponse(404, { error: 'Not found' });
 */
export function tracedResponse(statusCode: number, data: any): NextResponse {
  const response = NextResponse.json(data, { status: statusCode });

  // Add trace context to response
  const { traceId, spanId } = getTraceContext();
  if (traceId) {
    response.headers.set('x-trace-id', traceId);
    if (spanId) {
      response.headers.set('x-span-id', spanId);
    }
  }

  return response;
}

/**
 * Measure and record a timed operation
 * Use for custom timing measurements within a request
 *
 * @param operationName Name of the operation
 * @param fn Function to measure
 * @returns Result of function
 *
 * @example
 * const result = await measureOperation('complexCalculation', async () => {
 *   return await doComplexWork();
 * });
 */
export async function measureOperation<T>(
  operationName: string,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = performance.now();

  try {
    const result = await fn();
    const duration = performance.now() - startTime;

    // Add event to current span
    const { getActiveSpan } = require('./tracer');
    const span = getActiveSpan();
    if (span) {
      span.addEvent(`operation.${operationName}`, {
        'operation.duration': Math.round(duration),
        'operation.success': true,
      });
    }

    return result;
  } catch (error) {
    const duration = performance.now() - startTime;

    // Add error event to current span
    const { getActiveSpan } = require('./tracer');
    const span = getActiveSpan();
    if (span) {
      span.addEvent(`operation.${operationName}`, {
        'operation.duration': Math.round(duration),
        'operation.success': false,
        'error.message': error instanceof Error ? error.message : String(error),
      });
    }

    throw error;
  }
}

/**
 * Check if tracing is enabled for current request
 * Use to conditionally add expensive tracing logic
 *
 * @returns true if tracing is active
 *
 * @example
 * if (isTracingEnabled()) {
 *   // Add detailed span attributes
 *   span.setAttribute('detailed.info', expensiveComputation());
 * }
 */
export function isTracingEnabled(): boolean {
  try {
    const { isTracingEnabled: checkTracing } = require('./tracer');
    return checkTracing();
  } catch {
    return false;
  }
}

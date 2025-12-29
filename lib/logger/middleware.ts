/**
 * HTTP Request Logging Middleware
 *
 * Provides automatic request/response logging for API routes with:
 * - Correlation ID tracking
 * - Request duration measurement
 * - User context enrichment
 * - Sensitive data redaction
 * - Error logging
 *
 * Usage:
 * ```typescript
 * import { withRequestLogging } from '@/lib/logger/middleware';
 *
 * export async function GET(request: NextRequest) {
 *   return withRequestLogging(request, async (logger) => {
 *     logger.info('Processing request');
 *     // Your logic here
 *     return NextResponse.json({ success: true });
 *   });
 * }
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from './index';
import {
  runWithCorrelationId,
  extractCorrelationIdFromHeaders,
  extractUserContext,
  getCorrelationId,
} from './context';
import type pino from 'pino';

/**
 * Options for request logging middleware
 */
interface RequestLoggingOptions {
  /**
   * Whether to log request body (default: false for security)
   */
  logBody?: boolean;

  /**
   * Whether to log query parameters (default: true)
   */
  logQuery?: boolean;

  /**
   * Additional context to include in logs
   */
  additionalContext?: Record<string, unknown>;

  /**
   * Custom log level for successful requests (default: 'info')
   */
  successLevel?: 'trace' | 'debug' | 'info';
}

/**
 * Wrap an API route handler with automatic request/response logging
 *
 * This middleware:
 * 1. Extracts or generates correlation ID
 * 2. Logs incoming request details
 * 3. Measures request duration
 * 4. Logs response status and duration
 * 5. Catches and logs errors
 *
 * @param request Next.js request object
 * @param handler Request handler function that receives a logger instance
 * @param options Optional logging configuration
 * @returns Response from handler
 *
 * @example
 * export async function POST(request: NextRequest) {
 *   return withRequestLogging(request, async (logger) => {
 *     const body = await request.json();
 *     logger.info('Creating user', { email: body.email });
 *
 *     // Your business logic
 *     const user = await createUser(body);
 *
 *     return NextResponse.json({ user });
 *   }, { logBody: false }); // Don't log sensitive body data
 * }
 */
export async function withRequestLogging(
  request: NextRequest,
  handler: (logger: pino.Logger) => Promise<NextResponse>,
  options: RequestLoggingOptions = {}
): Promise<NextResponse> {
  const {
    logBody = false,
    logQuery = true,
    additionalContext = {},
    successLevel = 'info',
  } = options;

  const startTime = Date.now();
  const method = request.method;
  const path = request.nextUrl.pathname;

  // Extract or generate correlation ID
  const correlationId = extractCorrelationIdFromHeaders(request.headers) || undefined;

  // Extract user context (IP, user agent)
  const userContext = extractUserContext(request);

  // Extract trace context from OpenTelemetry (Week 2)
  let traceContext: { traceId?: string; spanId?: string } = {};
  if (process.env.NODE_ENV === 'production') {
    try {
      const { getTraceContext } = await import('@/lib/telemetry/tracer');
      traceContext = getTraceContext();
    } catch {
      // OTel not available, continue without trace IDs
    }
  }

  // Build request context
  const requestContext: Record<string, unknown> = {
    method,
    path,
    ...userContext,
    ...additionalContext,
    // Add trace IDs to logs for correlation
    ...(traceContext.traceId && { traceId: traceContext.traceId }),
    ...(traceContext.spanId && { spanId: traceContext.spanId }),
  };

  // Add query parameters if enabled
  if (logQuery && request.nextUrl.search) {
    const queryParams = Object.fromEntries(request.nextUrl.searchParams);
    requestContext.query = queryParams;
  }

  try {
    // Run within correlation ID context
    const response = await runWithCorrelationId(
      async () => {
        // Create child logger with request context
        const requestLogger = logger.child({
          correlationId: getCorrelationId(),
          ...requestContext,
        });

        // Log incoming request
        if (successLevel === 'trace') {
          requestLogger.trace({ type: 'request_start' }, `→ ${method} ${path}`);
        } else if (successLevel === 'debug') {
          requestLogger.debug({ type: 'request_start' }, `→ ${method} ${path}`);
        } else {
          requestLogger.info({ type: 'request_start' }, `→ ${method} ${path}`);
        }

        // Execute handler with logger
        const result = await handler(requestLogger);

        return result;
      },
      correlationId,
      requestContext
    );

    const duration = Date.now() - startTime;
    const statusCode = response.status;

    // Determine log level based on status code
    const responseLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : successLevel;

    // Log response
    const logData = {
      type: 'request_end',
      correlationId: getCorrelationId(),
      method,
      path,
      statusCode,
      duration,
      ...requestContext,
    };
    const message = `← ${method} ${path} ${statusCode}`;

    if (responseLevel === 'error') {
      logger.error(logData, message);
    } else if (responseLevel === 'warn') {
      logger.warn(logData, message);
    } else if (responseLevel === 'trace') {
      logger.trace(logData, message);
    } else if (responseLevel === 'debug') {
      logger.debug(logData, message);
    } else {
      logger.info(logData, message);
    }

    // Add correlation ID and trace IDs to response headers
    const headers = new Headers(response.headers);
    const finalCorrelationId = getCorrelationId();
    if (finalCorrelationId) {
      headers.set('x-correlation-id', finalCorrelationId);
    }

    // Add trace IDs for distributed tracing (Week 2)
    if (traceContext.traceId) {
      headers.set('x-trace-id', traceContext.traceId);
    }
    if (traceContext.spanId) {
      headers.set('x-span-id', traceContext.spanId);
    }

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    // Log error
    logger.error({
      type: 'request_error',
      correlationId: getCorrelationId(),
      method,
      path,
      duration,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      ...requestContext,
    }, `✗ ${method} ${path} ERROR`);

    // Re-throw to let error boundary handle it
    throw error;
  }
}

/**
 * Log API route start (for routes not using withRequestLogging)
 *
 * @param request Next.js request
 * @param additionalContext Additional context
 * @returns Logger instance with request context
 *
 * @example
 * export async function GET(request: NextRequest) {
 *   const logger = logRequestStart(request);
 *   logger.info('Fetching users');
 *   // ... your logic
 * }
 */
export function logRequestStart(
  request: NextRequest,
  additionalContext?: Record<string, unknown>
): pino.Logger {
  const method = request.method;
  const path = request.nextUrl.pathname;
  const userContext = extractUserContext(request);

  const requestLogger = logger.child({
    method,
    path,
    ...userContext,
    ...additionalContext,
  });

  requestLogger.info({
    type: 'request_start',
  }, `→ ${method} ${path}`);

  return requestLogger;
}

/**
 * Log API route end (for routes not using withRequestLogging)
 *
 * @param request Next.js request
 * @param statusCode Response status code
 * @param startTime Request start time (from Date.now())
 * @param additionalContext Additional context
 *
 * @example
 * const startTime = Date.now();
 * // ... your logic
 * logRequestEnd(request, 200, startTime);
 */
export function logRequestEnd(
  request: NextRequest,
  statusCode: number,
  startTime: number,
  additionalContext?: Record<string, unknown>
): void {
  const duration = Date.now() - startTime;
  const method = request.method;
  const path = request.nextUrl.pathname;
  const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

  const logData = {
    type: 'request_end',
    method,
    path,
    statusCode,
    duration,
    ...additionalContext,
  };
  const message = `← ${method} ${path} ${statusCode}`;

  if (level === 'error') {
    logger.error(logData, message);
  } else if (level === 'warn') {
    logger.warn(logData, message);
  } else {
    logger.info(logData, message);
  }
}

/**
 * Measure and log operation duration
 *
 * @param operation Operation name
 * @param fn Function to measure
 * @returns Result of function
 *
 * @example
 * const users = await measureDuration('fetch_users', async () => {
 *   return await supabase.from('users').select('*');
 * });
 */
export async function measureDuration<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();

  try {
    const result = await fn();
    const duration = Date.now() - startTime;

    logger.debug({
      type: 'operation_duration',
      operation,
      duration,
      correlationId: getCorrelationId(),
    }, `Operation completed: ${operation}`);

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error({
      type: 'operation_error',
      operation,
      duration,
      error: error instanceof Error ? error.message : String(error),
      correlationId: getCorrelationId(),
    }, `Operation failed: ${operation}`);

    throw error;
  }
}

/**
 * Create a performance timer for manual duration tracking
 *
 * @param operation Operation name
 * @returns Timer object with stop() method
 *
 * @example
 * const timer = startTimer('complex_calculation');
 * // ... complex operation
 * timer.stop(); // Logs duration automatically
 */
export function startTimer(operation: string): { stop: () => void } {
  const startTime = Date.now();
  const correlationId = getCorrelationId();

  return {
    stop: () => {
      const duration = Date.now() - startTime;

      logger.debug({
        type: 'timer',
        operation,
        duration,
        correlationId,
      }, `Timer stopped: ${operation}`);
    },
  };
}

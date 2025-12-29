/**
 * OpenTelemetry Tracer Utilities
 *
 * Provides helper functions for manual span creation and management.
 * Auto-propagates context for distributed tracing.
 *
 * Usage:
 * ```typescript
 * import { startSpan, setSpanAttributes } from '@/lib/telemetry/tracer';
 *
 * const span = startSpan('database.query', { 'db.table': 'stories' });
 * try {
 *   const result = await supabase.from('stories').select('*');
 *   setSpanAttributes(span, { 'db.rows': result.data?.length });
 *   return result;
 * } finally {
 *   span.end();
 * }
 * ```
 */

import { trace, context, Span, SpanStatusCode, Exception } from '@opentelemetry/api';

/**
 * Service name for tracing (matches instrumentation-otel.ts)
 */
const SERVICE_NAME = 'dastaan-portal';

/**
 * Get the global tracer instance
 * Uses the same tracer name as instrumentation-otel.ts
 */
export function getTracer() {
  return trace.getTracer(SERVICE_NAME, '1.0.0');
}

/**
 * Get the currently active span from context
 * Returns undefined if no span is active
 */
export function getActiveSpan(): Span | undefined {
  return trace.getActiveSpan();
}

/**
 * Start a new span with the given name and attributes
 * The span is set as active in the current context
 *
 * @param name Span name (e.g., 'database.query', 'cache.lookup')
 * @param attributes Optional attributes to set on the span
 * @returns The created span (must call span.end() when done)
 *
 * @example
 * const span = startSpan('database.query', { 'db.table': 'users' });
 * try {
 *   // Your operation
 * } finally {
 *   span.end();
 * }
 */
export function startSpan(
  name: string,
  attributes?: Record<string, string | number | boolean>
): Span {
  const tracer = getTracer();
  const span = tracer.startSpan(name, {
    attributes: attributes || {},
  });

  // Set span as active in context (for auto-propagation)
  context.with(trace.setSpan(context.active(), span), () => {});

  return span;
}

/**
 * Set attributes on a span
 * Attributes are key-value pairs that provide context about the span
 *
 * @param span The span to set attributes on (or undefined to use active span)
 * @param attributes Key-value pairs to add to the span
 *
 * @example
 * setSpanAttributes(span, {
 *   'http.status_code': 200,
 *   'user.id': '12345',
 *   'cache.hit': true,
 * });
 */
export function setSpanAttributes(
  span: Span | undefined,
  attributes: Record<string, string | number | boolean>
): void {
  if (!span) {
    span = getActiveSpan();
  }

  if (span) {
    Object.entries(attributes).forEach(([key, value]) => {
      span.setAttribute(key, value);
    });
  }
}

/**
 * Record an exception in a span
 * Sets the span status to error and records the exception details
 *
 * @param span The span to record the exception on (or undefined to use active span)
 * @param error The error to record
 *
 * @example
 * try {
 *   await riskyOperation();
 * } catch (error) {
 *   recordException(span, error as Error);
 *   throw error;
 * }
 */
export function recordException(span: Span | undefined, error: Error | Exception): void {
  if (!span) {
    span = getActiveSpan();
  }

  if (span) {
    span.recordException(error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Set the status of a span
 * Use this to mark a span as successful (OK) or failed (ERROR)
 *
 * @param span The span to set status on (or undefined to use active span)
 * @param code Status code (OK or ERROR)
 * @param message Optional status message
 *
 * @example
 * setSpanStatus(span, SpanStatusCode.OK);
 * // or
 * setSpanStatus(span, SpanStatusCode.ERROR, 'Database connection failed');
 */
export function setSpanStatus(
  span: Span | undefined,
  code: SpanStatusCode,
  message?: string
): void {
  if (!span) {
    span = getActiveSpan();
  }

  if (span) {
    span.setStatus({ code, message });
  }
}

/**
 * Add an event to a span
 * Events are timestamped messages that provide additional context
 *
 * @param span The span to add event to (or undefined to use active span)
 * @param name Event name
 * @param attributes Optional event attributes
 *
 * @example
 * addSpanEvent(span, 'cache.miss', { 'cache.key': 'executive-summary' });
 */
export function addSpanEvent(
  span: Span | undefined,
  name: string,
  attributes?: Record<string, string | number | boolean>
): void {
  if (!span) {
    span = getActiveSpan();
  }

  if (span) {
    span.addEvent(name, attributes);
  }
}

/**
 * Execute a function within a new span context
 * Automatically handles span creation, error recording, and cleanup
 *
 * @param name Span name
 * @param fn Function to execute within the span
 * @param attributes Optional span attributes
 * @returns Result of the function
 *
 * @example
 * const result = await withSpan('fetch.user', async () => {
 *   return await fetchUser(userId);
 * }, { 'user.id': userId });
 */
export async function withSpan<T>(
  name: string,
  fn: (span: Span) => Promise<T>,
  attributes?: Record<string, string | number | boolean>
): Promise<T> {
  const tracer = getTracer();

  return tracer.startActiveSpan(name, { attributes: attributes || {} }, async (span) => {
    try {
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      recordException(span, error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}

/**
 * Get trace context from active span for logging
 * Returns trace ID and span ID for correlation with logs
 *
 * @returns Object with traceId and spanId (or empty object if no active span)
 *
 * @example
 * const { traceId, spanId } = getTraceContext();
 * logger.info({ traceId, spanId }, 'Processing request');
 */
export function getTraceContext(): { traceId?: string; spanId?: string } {
  const span = getActiveSpan();
  if (!span) {
    return {};
  }

  const spanContext = span.spanContext();
  return {
    traceId: spanContext.traceId,
    spanId: spanContext.spanId,
  };
}

/**
 * Check if tracing is enabled
 * Returns true if OpenTelemetry is active and a span is recording
 */
export function isTracingEnabled(): boolean {
  const span = getActiveSpan();
  return span !== undefined && span.isRecording();
}

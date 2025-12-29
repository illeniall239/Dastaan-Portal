/**
 * OpenTelemetry Standard Attributes
 *
 * Provides helper functions for adding standard semantic attributes to spans.
 * Uses OpenTelemetry semantic conventions for consistent naming.
 *
 * References:
 * - HTTP: https://opentelemetry.io/docs/specs/semconv/http/
 * - Database: https://opentelemetry.io/docs/specs/semconv/database/
 * - General: https://opentelemetry.io/docs/specs/semconv/general/
 *
 * Usage:
 * ```typescript
 * import { addHttpAttributes, addDatabaseAttributes } from '@/lib/telemetry/attributes';
 *
 * const span = startSpan('http.request');
 * addHttpAttributes(span, request, response);
 * ```
 */

import { Span } from '@opentelemetry/api';
import { ATTR_HTTP_REQUEST_METHOD, ATTR_HTTP_RESPONSE_STATUS_CODE, ATTR_HTTP_ROUTE } from '@opentelemetry/semantic-conventions/incubating';

/**
 * Add HTTP request/response attributes to a span
 * Follows OpenTelemetry HTTP semantic conventions
 *
 * @param span Span to add attributes to
 * @param request Request object (Next.js Request or simplified)
 * @param response Optional response object
 *
 * @example
 * addHttpAttributes(span, request, response);
 */
export function addHttpAttributes(
  span: Span,
  request: { method?: string; url?: string; headers?: Headers | Record<string, string> },
  response?: { status?: number }
): void {
  try {
    // HTTP method
    if (request.method) {
      span.setAttribute(ATTR_HTTP_REQUEST_METHOD, request.method);
    }

    // HTTP route (path without query params)
    if (request.url) {
      try {
        const url = new URL(request.url);
        span.setAttribute(ATTR_HTTP_ROUTE, url.pathname);
        span.setAttribute('http.url', url.origin + url.pathname);

        // Add host
        span.setAttribute('http.host', url.host);
      } catch {
        // If URL parsing fails, use as-is
        span.setAttribute(ATTR_HTTP_ROUTE, request.url);
      }
    }

    // HTTP response status code
    if (response?.status) {
      span.setAttribute(ATTR_HTTP_RESPONSE_STATUS_CODE, response.status);
    }

    // User agent
    if (request.headers) {
      const userAgent =
        request.headers instanceof Headers
          ? request.headers.get('user-agent')
          : request.headers['user-agent'];

      if (userAgent) {
        span.setAttribute('http.user_agent', userAgent);
      }
    }
  } catch (error) {
    // Silently fail to avoid breaking tracing
    if (process.env.NODE_ENV === 'development') {
      console.error('[OTel Attributes] Failed to add HTTP attributes:', error);
    }
  }
}

/**
 * Add database query attributes to a span
 * Follows OpenTelemetry database semantic conventions
 *
 * @param span Span to add attributes to
 * @param table Database table name
 * @param operation Query operation (select, insert, update, delete)
 * @param query Optional SQL query (sanitized)
 *
 * @example
 * addDatabaseAttributes(span, 'stories', 'select');
 */
export function addDatabaseAttributes(
  span: Span,
  table: string,
  operation: string,
  query?: string
): void {
  try {
    // Database system
    span.setAttribute('db.system', 'postgresql');

    // Database name (Supabase project)
    span.setAttribute('db.name', 'dastaan-portal');

    // Table name
    span.setAttribute('db.table', table);

    // Operation type
    span.setAttribute('db.operation', operation);

    // SQL statement (if provided, ensure it's sanitized)
    if (query) {
      // Truncate long queries
      const truncated = query.length > 500 ? query.substring(0, 500) + '...' : query;
      span.setAttribute('db.statement', truncated);
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[OTel Attributes] Failed to add database attributes:', error);
    }
  }
}

/**
 * Add cache operation attributes to a span
 * Custom attributes for cache hit/miss tracking
 *
 * @param span Span to add attributes to
 * @param key Cache key
 * @param hit Whether cache hit occurred
 * @param ttl Optional cache TTL in seconds
 *
 * @example
 * addCacheAttributes(span, 'executive-summary', true, 300);
 */
export function addCacheAttributes(
  span: Span,
  key: string,
  hit: boolean,
  ttl?: number
): void {
  try {
    // Cache key
    span.setAttribute('cache.key', key);

    // Cache hit/miss
    span.setAttribute('cache.hit', hit);

    // Cache system (Next.js unstable_cache)
    span.setAttribute('cache.system', 'nextjs_unstable_cache');

    // TTL if provided
    if (ttl !== undefined) {
      span.setAttribute('cache.ttl', ttl);
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[OTel Attributes] Failed to add cache attributes:', error);
    }
  }
}

/**
 * Add user context attributes to a span
 * Use for authenticated requests
 *
 * @param span Span to add attributes to
 * @param userId User ID
 * @param role User role (optional)
 *
 * @example
 * addUserAttributes(span, '12345', 'content_manager');
 */
export function addUserAttributes(
  span: Span,
  userId: string,
  role?: string
): void {
  try {
    // User ID
    span.setAttribute('user.id', userId);

    // User role
    if (role) {
      span.setAttribute('user.role', role);
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[OTel Attributes] Failed to add user attributes:', error);
    }
  }
}

/**
 * Add error attributes to a span
 * Use when recording exceptions
 *
 * @param span Span to add attributes to
 * @param error Error object
 *
 * @example
 * addErrorAttributes(span, new Error('Database connection failed'));
 */
export function addErrorAttributes(span: Span, error: Error | unknown): void {
  try {
    if (error instanceof Error) {
      span.setAttribute('error', true);
      span.setAttribute('error.type', error.name);
      span.setAttribute('error.message', error.message);

      if (error.stack) {
        // Truncate long stack traces
        const truncated =
          error.stack.length > 1000 ? error.stack.substring(0, 1000) + '...' : error.stack;
        span.setAttribute('error.stack', truncated);
      }
    } else {
      span.setAttribute('error', true);
      span.setAttribute('error.message', String(error));
    }
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[OTel Attributes] Failed to add error attributes:', err);
    }
  }
}

/**
 * Add custom business attributes to a span
 * Use for domain-specific context
 *
 * @param span Span to add attributes to
 * @param attributes Custom key-value pairs
 *
 * @example
 * addCustomAttributes(span, {
 *   'story.id': 'ST-2025-0001',
 *   'story.status': 'approved',
 *   'evaluation.score': 8.5,
 * });
 */
export function addCustomAttributes(
  span: Span,
  attributes: Record<string, string | number | boolean>
): void {
  try {
    Object.entries(attributes).forEach(([key, value]) => {
      span.setAttribute(key, value);
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[OTel Attributes] Failed to add custom attributes:', error);
    }
  }
}

/**
 * Add performance timing attributes to a span
 * Use for measuring component-level performance
 *
 * @param span Span to add attributes to
 * @param timings Performance timings in milliseconds
 *
 * @example
 * addPerformanceAttributes(span, {
 *   'db.query.duration': 45,
 *   'cache.lookup.duration': 2,
 *   'computation.duration': 10,
 * });
 */
export function addPerformanceAttributes(
  span: Span,
  timings: Record<string, number>
): void {
  try {
    Object.entries(timings).forEach(([key, duration]) => {
      span.setAttribute(`performance.${key}`, duration);
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[OTel Attributes] Failed to add performance attributes:', error);
    }
  }
}

/**
 * Add service-level attributes to a span
 * Use for identifying the service and version
 *
 * @param span Span to add attributes to
 *
 * @example
 * addServiceAttributes(span);
 */
export function addServiceAttributes(span: Span): void {
  try {
    span.setAttribute('service.name', 'dastaan-portal');
    span.setAttribute('service.version', '1.0.0');
    span.setAttribute('service.environment', process.env.NODE_ENV || 'development');
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[OTel Attributes] Failed to add service attributes:', error);
    }
  }
}

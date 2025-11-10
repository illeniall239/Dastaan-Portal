/**
 * Correlation ID Context Management
 *
 * Uses AsyncLocalStorage to maintain correlation IDs across async operations.
 * This allows tracking a single request through multiple function calls, database queries,
 * and external service calls.
 *
 * Benefits:
 * - Track user journeys across multiple operations
 * - Debug complex workflows by filtering logs by correlation ID
 * - Trace requests through distributed systems
 * - No need to manually pass correlation ID through function parameters
 *
 * Usage:
 * ```typescript
 * // In API route:
 * await runWithCorrelationId(async () => {
 *   // All logs within this context will include the correlation ID
 *   logger.info('Processing request');
 *   await someAsyncOperation();
 * });
 * ```
 */

import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';

/**
 * Request context that persists across async operations
 */
interface RequestContext {
  correlationId: string;
  userId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
  [key: string]: unknown;
}

/**
 * AsyncLocalStorage instance for maintaining request context
 */
const asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

/**
 * Generate a new correlation ID
 *
 * Format: UUID v4
 * Example: "550e8400-e29b-41d4-a716-446655440000"
 *
 * @returns New correlation ID
 */
export function generateCorrelationId(): string {
  return randomUUID();
}

/**
 * Get the current correlation ID from async context
 *
 * @returns Correlation ID if in context, undefined otherwise
 *
 * @example
 * const correlationId = getCorrelationId();
 * if (correlationId) {
 *   logger.info('Request being processed', { correlationId });
 * }
 */
export function getCorrelationId(): string | undefined {
  const store = asyncLocalStorage.getStore();
  return store?.correlationId;
}

/**
 * Get the full request context
 *
 * @returns Request context if available, undefined otherwise
 *
 * @example
 * const context = getRequestContext();
 * logger.info('Action performed', context);
 */
export function getRequestContext(): RequestContext | undefined {
  return asyncLocalStorage.getStore();
}

/**
 * Set additional context for the current request
 *
 * @param context Additional context to merge
 *
 * @example
 * setRequestContext({ userId: '123', action: 'update' });
 */
export function setRequestContext(context: Partial<Omit<RequestContext, 'correlationId'>>): void {
  const currentStore = asyncLocalStorage.getStore();
  if (currentStore) {
    Object.assign(currentStore, context);
  }
}

/**
 * Run a function within a correlation ID context
 *
 * Creates a new async context with a correlation ID. All async operations
 * within the callback will have access to this correlation ID.
 *
 * @param callback Function to run with correlation ID context
 * @param correlationId Optional correlation ID (generates one if not provided)
 * @param additionalContext Additional context to include
 * @returns Result of the callback
 *
 * @example
 * // Auto-generate correlation ID
 * const result = await runWithCorrelationId(async () => {
 *   await processRequest();
 *   return { success: true };
 * });
 *
 * // Use existing correlation ID (from header)
 * const correlationId = request.headers.get('x-correlation-id');
 * await runWithCorrelationId(
 *   async () => { ... },
 *   correlationId || undefined,
 *   { userId: '123', requestId: 'req-456' }
 * );
 */
export async function runWithCorrelationId<T>(
  callback: () => Promise<T>,
  correlationId?: string,
  additionalContext?: Partial<Omit<RequestContext, 'correlationId'>>
): Promise<T> {
  const context: RequestContext = {
    correlationId: correlationId || generateCorrelationId(),
    ...additionalContext,
  };

  return asyncLocalStorage.run(context, callback);
}

/**
 * Extract correlation ID from request headers
 *
 * Checks multiple common header names:
 * - x-correlation-id (preferred)
 * - x-request-id
 * - request-id
 *
 * @param headers Request headers (Next.js Headers or standard Headers object)
 * @returns Correlation ID if found, undefined otherwise
 *
 * @example
 * const correlationId = extractCorrelationIdFromHeaders(request.headers);
 * if (!correlationId) {
 *   // Generate new one
 * }
 */
export function extractCorrelationIdFromHeaders(
  headers: Headers | Map<string, string>
): string | undefined {
  // Handle Next.js Headers object
  if (headers instanceof Headers) {
    return (
      headers.get('x-correlation-id') ||
      headers.get('x-request-id') ||
      headers.get('request-id') ||
      undefined
    );
  }

  // Handle Map
  return (
    headers.get('x-correlation-id') ||
    headers.get('x-request-id') ||
    headers.get('request-id') ||
    undefined
  );
}

/**
 * Extract user context from request
 *
 * @param request Next.js request object
 * @returns User context object
 *
 * @example
 * const userContext = extractUserContext(request);
 * // { ipAddress: '192.168.1.1', userAgent: 'Mozilla/5.0...' }
 */
export function extractUserContext(request: Request): {
  ipAddress: string;
  userAgent: string;
} {
  const ipAddress =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';

  const userAgent = request.headers.get('user-agent') || 'unknown';

  return { ipAddress, userAgent };
}

/**
 * Create context logger that automatically includes correlation ID
 *
 * @returns Logger instance with correlation ID context
 *
 * @example
 * const logger = getContextLogger();
 * logger.info('Processing request');
 * // Output: {"correlationId":"550e8400-...","msg":"Processing request"}
 */
export function getContextLogger() {
  // Import here to avoid circular dependency
  const { logger } = require('./index');
  const context = getRequestContext();

  if (context) {
    return logger.child(context);
  }

  return logger;
}

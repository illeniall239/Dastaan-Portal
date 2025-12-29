/**
 * OpenTelemetry Span Decorators
 *
 * High-level wrappers for instrumenting common operations.
 * Combines tracing with metrics for comprehensive observability.
 *
 * Usage:
 * ```typescript
 * import { instrumentDatabaseQuery, instrumentServerFunction } from '@/lib/telemetry/spans';
 *
 * const result = await instrumentDatabaseQuery('select', 'stories', async () => {
 *   return await supabase.from('stories').select('*');
 * });
 * ```
 */

import { withSpan, recordException, setSpanAttributes } from './tracer';
import { recordDbQuery, recordCacheHit, recordCacheMiss } from './metrics';
import { addDatabaseAttributes, addCacheAttributes, addErrorAttributes } from './attributes';
import { Span } from '@opentelemetry/api';

/**
 * Instrument a database query with tracing and metrics
 * Automatically records query duration and adds database attributes
 *
 * @param operation Query operation (select, insert, update, delete)
 * @param table Database table name
 * @param fn Function that performs the query
 * @returns Query result
 *
 * @example
 * const stories = await instrumentDatabaseQuery('select', 'stories', async () => {
 *   return await supabase.from('stories').select('*');
 * });
 */
export async function instrumentDatabaseQuery<T>(
  operation: string,
  table: string,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = performance.now();

  return withSpan(
    'db.query',
    async (span: Span) => {
      // Add database attributes
      addDatabaseAttributes(span, table, operation);

      try {
        const result = await fn();

        // Record duration metric
        const duration = performance.now() - startTime;
        recordDbQuery(table, operation, duration);

        // Add result metadata if available
        if (result && typeof result === 'object') {
          if ('count' in result) {
            setSpanAttributes(span, { 'db.result.count': result.count as number });
          }
          if ('data' in result && Array.isArray(result.data)) {
            setSpanAttributes(span, { 'db.result.rows': result.data.length });
          }
        }

        return result;
      } catch (error) {
        addErrorAttributes(span, error as Error);
        throw error;
      }
    },
    { 'db.system': 'postgresql', 'db.table': table, 'db.operation': operation }
  );
}

/**
 * Instrument a cache operation with tracing and metrics
 * Automatically detects cache hits/misses and records metrics
 *
 * @param cacheKey Cache key
 * @param fn Function that performs cache lookup
 * @param ttl Optional cache TTL in seconds
 * @returns Cached value or result of fn()
 *
 * @example
 * const summary = await instrumentCacheOperation('executive-summary', async () => {
 *   return await getExecutiveSummary();
 * }, 300);
 */
export async function instrumentCacheOperation<T>(
  cacheKey: string,
  fn: () => Promise<T>,
  ttl?: number
): Promise<T> {
  const startTime = performance.now();

  return withSpan(
    'cache.lookup',
    async (span: Span) => {
      try {
        const result = await fn();

        // Heuristic: Fast lookup = cache hit (< 10ms)
        const duration = performance.now() - startTime;
        const isCacheHit = duration < 10;

        // Add cache attributes
        addCacheAttributes(span, cacheKey, isCacheHit, ttl);

        // Record metrics
        if (isCacheHit) {
          recordCacheHit(cacheKey);
        } else {
          recordCacheMiss(cacheKey);
        }

        setSpanAttributes(span, { 'cache.duration': Math.round(duration) });

        return result;
      } catch (error) {
        addErrorAttributes(span, error as Error);
        throw error;
      }
    },
    { 'cache.key': cacheKey }
  );
}

/**
 * Instrument an API route handler with tracing
 * Creates a span for the entire request lifecycle
 *
 * @param route API route path
 * @param fn Request handler function
 * @returns Response from handler
 *
 * @example
 * export async function GET(request: Request) {
 *   return instrumentApiHandler('/api/management/alerts', async () => {
 *     const data = await getAlerts();
 *     return NextResponse.json(data);
 *   });
 * }
 */
export async function instrumentApiHandler<T>(
  route: string,
  fn: () => Promise<T>
): Promise<T> {
  return withSpan(
    'http.server.request',
    async (span: Span) => {
      try {
        const result = await fn();
        return result;
      } catch (error) {
        addErrorAttributes(span, error as Error);
        throw error;
      }
    },
    { 'http.route': route }
  );
}

/**
 * Instrument a server function (e.g., cached server functions)
 * Creates a span for the function execution
 *
 * @param functionName Function name for span identification
 * @param fn Server function to instrument
 * @returns Function result
 *
 * @example
 * export async function getExecutiveSummary(): Promise<ExecutiveSummary> {
 *   return instrumentServerFunction('getExecutiveSummary', async () => {
 *     return await cachedQuery(...);
 *   });
 * }
 */
export async function instrumentServerFunction<T>(
  functionName: string,
  fn: () => Promise<T>
): Promise<T> {
  return withSpan(
    `server.function.${functionName}`,
    async (span: Span) => {
      try {
        const startTime = performance.now();
        const result = await fn();
        const duration = performance.now() - startTime;

        setSpanAttributes(span, {
          'function.name': functionName,
          'function.duration': Math.round(duration),
        });

        return result;
      } catch (error) {
        addErrorAttributes(span, error as Error);
        throw error;
      }
    },
    { 'code.function': functionName }
  );
}

/**
 * Instrument a parallel operation (Promise.all)
 * Creates child spans for each parallel operation
 *
 * @param operationName Name of the parallel operation
 * @param operations Array of async operations
 * @returns Results from all operations
 *
 * @example
 * const results = await instrumentParallelOperations('fetchDashboardData', [
 *   () => getExecutiveSummary(),
 *   () => getDepartmentWorkload(),
 *   () => getCriticalAlerts(),
 * ]);
 */
export async function instrumentParallelOperations<T>(
  operationName: string,
  operations: Array<() => Promise<T>>
): Promise<T[]> {
  return withSpan(
    `parallel.${operationName}`,
    async (span: Span) => {
      setSpanAttributes(span, {
        'parallel.operation_count': operations.length,
      });

      try {
        const startTime = performance.now();
        const results = await Promise.all(operations.map((op) => op()));
        const duration = performance.now() - startTime;

        setSpanAttributes(span, {
          'parallel.duration': Math.round(duration),
          'parallel.success': true,
        });

        return results;
      } catch (error) {
        addErrorAttributes(span, error as Error);
        throw error;
      }
    },
    { 'parallel.operation': operationName }
  );
}

/**
 * Instrument a computation-heavy operation
 * Use for operations that don't involve I/O
 *
 * @param operationName Name of the computation
 * @param fn Computation function
 * @returns Computation result
 *
 * @example
 * const aggregated = await instrumentComputation('aggregateMetrics', async () => {
 *   return calculateComplexAggregation(data);
 * });
 */
export async function instrumentComputation<T>(
  operationName: string,
  fn: () => Promise<T> | T
): Promise<T> {
  return withSpan(
    `computation.${operationName}`,
    async (span: Span) => {
      try {
        const startTime = performance.now();
        const result = await fn();
        const duration = performance.now() - startTime;

        setSpanAttributes(span, {
          'computation.name': operationName,
          'computation.duration': Math.round(duration),
        });

        return result;
      } catch (error) {
        addErrorAttributes(span, error as Error);
        throw error;
      }
    },
    { 'operation.type': 'computation' }
  );
}

/**
 * Instrument an external API call (e.g., to third-party services)
 * Creates a span for the HTTP request
 *
 * @param serviceName Name of the external service
 * @param operation Operation name (e.g., 'getUserData')
 * @param fn Function that makes the API call
 * @returns API response
 *
 * @example
 * const user = await instrumentExternalCall('auth-service', 'getUser', async () => {
 *   return await fetch('https://auth.example.com/user/123');
 * });
 */
export async function instrumentExternalCall<T>(
  serviceName: string,
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  return withSpan(
    `external.${serviceName}.${operation}`,
    async (span: Span) => {
      setSpanAttributes(span, {
        'external.service': serviceName,
        'external.operation': operation,
      });

      try {
        const startTime = performance.now();
        const result = await fn();
        const duration = performance.now() - startTime;

        setSpanAttributes(span, {
          'external.duration': Math.round(duration),
        });

        return result;
      } catch (error) {
        addErrorAttributes(span, error as Error);
        throw error;
      }
    },
    { 'peer.service': serviceName }
  );
}

/**
 * Instrument a batch operation (multiple items processed sequentially)
 * Creates a span for the entire batch with per-item tracking
 *
 * @param batchName Name of the batch operation
 * @param items Items to process
 * @param processFn Function to process each item
 * @returns Processed results
 *
 * @example
 * const processed = await instrumentBatchOperation('processStories', stories, async (story) => {
 *   return await processStory(story);
 * });
 */
export async function instrumentBatchOperation<T, R>(
  batchName: string,
  items: T[],
  processFn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  return withSpan(
    `batch.${batchName}`,
    async (span: Span) => {
      setSpanAttributes(span, {
        'batch.name': batchName,
        'batch.size': items.length,
      });

      try {
        const startTime = performance.now();
        const results: R[] = [];
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < items.length; i++) {
          try {
            const result = await processFn(items[i], i);
            results.push(result);
            successCount++;
          } catch (error) {
            errorCount++;
            // Record but don't throw (allow batch to continue)
            span.addEvent('batch.item.error', {
              'batch.item.index': i,
              'error.message': error instanceof Error ? error.message : String(error),
            });
          }
        }

        const duration = performance.now() - startTime;

        setSpanAttributes(span, {
          'batch.duration': Math.round(duration),
          'batch.success_count': successCount,
          'batch.error_count': errorCount,
        });

        return results;
      } catch (error) {
        addErrorAttributes(span, error as Error);
        throw error;
      }
    },
    { 'batch.operation': batchName, 'batch.size': items.length }
  );
}

/**
 * OpenTelemetry Custom Metrics
 *
 * Provides custom business metrics for the Dastaan Portal.
 * Metrics are exported to Grafana Cloud (Week 3) for dashboards and alerting.
 *
 * Metrics Types:
 * - Counter: Monotonically increasing value (e.g., total requests)
 * - Histogram: Distribution of values (e.g., response times)
 * - Gauge: Current value that can go up or down (not used yet)
 *
 * Usage:
 * ```typescript
 * import { recordApiLatency, recordCacheHit } from '@/lib/telemetry/metrics';
 *
 * recordApiLatency('/api/management/active-projects', 'GET', 200, 234);
 * recordCacheHit('executive-summary');
 * ```
 */

import { metrics } from '@opentelemetry/api';

/**
 * Meter name (matches service name)
 */
const METER_NAME = 'dastaan-portal';

/**
 * Get the global meter instance
 */
function getMeter() {
  return metrics.getMeter(METER_NAME, '1.0.0');
}

/**
 * Lazy-initialized metrics instruments
 * Created on first use to avoid initialization errors
 */
let _apiDurationHistogram: ReturnType<ReturnType<typeof getMeter>['createHistogram']> | null = null;
let _dbQueryDurationHistogram: ReturnType<ReturnType<typeof getMeter>['createHistogram']> | null = null;
let _cacheHitsCounter: ReturnType<ReturnType<typeof getMeter>['createCounter']> | null = null;
let _cacheMissesCounter: ReturnType<ReturnType<typeof getMeter>['createCounter']> | null = null;
let _rateLimitExceededCounter: ReturnType<ReturnType<typeof getMeter>['createCounter']> | null = null;

/**
 * Initialize API duration histogram
 * Buckets optimized for API response times (10ms - 5s)
 */
function getApiDurationHistogram() {
  if (!_apiDurationHistogram) {
    const meter = getMeter();
    _apiDurationHistogram = meter.createHistogram('http.server.duration', {
      description: 'API route response time in milliseconds',
      unit: 'ms',
      advice: {
        explicitBucketBoundaries: [10, 50, 100, 200, 500, 1000, 2000, 5000],
      },
    });
  }
  return _apiDurationHistogram;
}

/**
 * Initialize database query duration histogram
 * Buckets optimized for DB queries (5ms - 1s)
 */
function getDbQueryDurationHistogram() {
  if (!_dbQueryDurationHistogram) {
    const meter = getMeter();
    _dbQueryDurationHistogram = meter.createHistogram('db.query.duration', {
      description: 'Database query execution time in milliseconds',
      unit: 'ms',
      advice: {
        explicitBucketBoundaries: [5, 10, 25, 50, 100, 250, 500, 1000],
      },
    });
  }
  return _dbQueryDurationHistogram;
}

/**
 * Initialize cache hits counter
 */
function getCacheHitsCounter() {
  if (!_cacheHitsCounter) {
    const meter = getMeter();
    _cacheHitsCounter = meter.createCounter('cache.hits', {
      description: 'Number of cache hits',
      unit: '1',
    });
  }
  return _cacheHitsCounter;
}

/**
 * Initialize cache misses counter
 */
function getCacheMissesCounter() {
  if (!_cacheMissesCounter) {
    const meter = getMeter();
    _cacheMissesCounter = meter.createCounter('cache.misses', {
      description: 'Number of cache misses',
      unit: '1',
    });
  }
  return _cacheMissesCounter;
}

/**
 * Initialize rate limit exceeded counter
 */
function getRateLimitExceededCounter() {
  if (!_rateLimitExceededCounter) {
    const meter = getMeter();
    _rateLimitExceededCounter = meter.createCounter('rate_limit.exceeded', {
      description: 'Number of rate limit violations',
      unit: '1',
    });
  }
  return _rateLimitExceededCounter;
}

/**
 * Record API route latency
 * Creates a histogram data point with route, method, and status code labels
 *
 * @param route API route path (e.g., '/api/management/active-projects')
 * @param method HTTP method (e.g., 'GET', 'POST')
 * @param statusCode HTTP status code (e.g., 200, 500)
 * @param duration Response time in milliseconds
 *
 * @example
 * recordApiLatency('/api/management/alerts', 'GET', 200, 234);
 */
export function recordApiLatency(
  route: string,
  method: string,
  statusCode: number,
  duration: number
): void {
  try {
    const histogram = getApiDurationHistogram();
    histogram.record(duration, {
      'http.route': route,
      'http.method': method,
      'http.status_code': statusCode,
    });
  } catch (error) {
    // Silently fail to avoid breaking app if metrics fail
    if (process.env.NODE_ENV === 'development') {
      console.error('[OTel Metrics] Failed to record API latency:', error);
    }
  }
}

/**
 * Record database query duration
 * Creates a histogram data point with table and operation labels
 *
 * @param table Database table name (e.g., 'stories', 'users')
 * @param operation Query operation (e.g., 'select', 'insert', 'update')
 * @param duration Query execution time in milliseconds
 *
 * @example
 * recordDbQuery('stories', 'select', 45);
 */
export function recordDbQuery(
  table: string,
  operation: string,
  duration: number
): void {
  try {
    const histogram = getDbQueryDurationHistogram();
    histogram.record(duration, {
      'db.table': table,
      'db.operation': operation,
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[OTel Metrics] Failed to record DB query:', error);
    }
  }
}

/**
 * Record cache hit
 * Increments the cache hits counter with cache key label
 *
 * @param cacheKey Cache key that was hit (e.g., 'executive-summary')
 *
 * @example
 * recordCacheHit('executive-summary');
 */
export function recordCacheHit(cacheKey: string): void {
  try {
    const counter = getCacheHitsCounter();
    counter.add(1, {
      'cache.key': cacheKey,
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[OTel Metrics] Failed to record cache hit:', error);
    }
  }
}

/**
 * Record cache miss
 * Increments the cache misses counter with cache key label
 *
 * @param cacheKey Cache key that was missed (e.g., 'executive-summary')
 *
 * @example
 * recordCacheMiss('executive-summary');
 */
export function recordCacheMiss(cacheKey: string): void {
  try {
    const counter = getCacheMissesCounter();
    counter.add(1, {
      'cache.key': cacheKey,
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[OTel Metrics] Failed to record cache miss:', error);
    }
  }
}

/**
 * Record rate limit exceeded event
 * Increments the rate limit exceeded counter with endpoint label
 *
 * @param endpoint API endpoint that exceeded rate limit
 *
 * @example
 * recordRateLimitExceeded('/api/management/alerts');
 */
export function recordRateLimitExceeded(endpoint: string): void {
  try {
    const counter = getRateLimitExceededCounter();
    counter.add(1, {
      'http.route': endpoint,
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[OTel Metrics] Failed to record rate limit:', error);
    }
  }
}

/**
 * Calculate cache hit rate
 * Helper function to calculate hit rate from counters
 *
 * @param hits Number of cache hits
 * @param misses Number of cache misses
 * @returns Hit rate as percentage (0-100)
 *
 * @example
 * const hitRate = calculateCacheHitRate(90, 10); // Returns 90
 */
export function calculateCacheHitRate(hits: number, misses: number): number {
  const total = hits + misses;
  if (total === 0) return 0;
  return Math.round((hits / total) * 100);
}

/**
 * Get metrics summary (for debugging)
 * Returns current metric values (note: counters/histograms don't expose values directly)
 * This is mainly for testing and development logging
 */
export function getMetricsSummary(): {
  apiDuration: string;
  dbQueryDuration: string;
  cacheHits: string;
  cacheMisses: string;
  rateLimitExceeded: string;
} {
  return {
    apiDuration: _apiDurationHistogram ? 'initialized' : 'not initialized',
    dbQueryDuration: _dbQueryDurationHistogram ? 'initialized' : 'not initialized',
    cacheHits: _cacheHitsCounter ? 'initialized' : 'not initialized',
    cacheMisses: _cacheMissesCounter ? 'initialized' : 'not initialized',
    rateLimitExceeded: _rateLimitExceededCounter ? 'initialized' : 'not initialized',
  };
}

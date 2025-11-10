/**
 * Base Analytics Service
 *
 * Foundation for all analytics services in the management dashboard.
 * Provides common utilities, caching interface, and shared patterns.
 *
 * Usage:
 * ```typescript
 * class MyAnalyticsService extends BaseAnalyticsService {
 *   async getMetrics() {
 *     return await this.withCache('metrics-key', async () => {
 *       // Expensive operation
 *     }, 300); // 5 min TTL
 *   }
 * }
 * ```
 */

import { logger } from '@/lib/logger';

/**
 * Cache interface
 * In-memory implementation for now, can be replaced with Redis later
 */
export interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

/**
 * Simple in-memory cache implementation
 * TODO: Replace with Redis for production
 */
class InMemoryCache implements CacheService {
  private cache: Map<string, { value: any; expires: number }> = new Map();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttl: number): Promise<void> {
    const expires = Date.now() + ttl * 1000;
    this.cache.set(key, { value, expires });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  /**
   * Cleanup expired entries (called periodically)
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        this.cache.delete(key);
      }
    }
  }
}

// Global cache instance
const globalCache = new InMemoryCache();

// Cleanup expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => globalCache.cleanup(), 5 * 60 * 1000);
}

/**
 * Time calculation utilities
 */
export class TimeUtils {
  /**
   * Calculate days between two dates
   */
  static daysBetween(start: Date, end: Date): number {
    const diff = end.getTime() - start.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Calculate days since a date
   */
  static daysSince(date: Date | string): number {
    const startDate = typeof date === 'string' ? new Date(date) : date;
    return this.daysBetween(startDate, new Date());
  }

  /**
   * Calculate days until a date
   */
  static daysUntil(date: Date | string): number {
    const endDate = typeof date === 'string' ? new Date(date) : date;
    return this.daysBetween(new Date(), endDate);
  }
}

/**
 * Statistics calculation utilities
 */
export class StatsUtils {
  /**
   * Calculate average of numbers
   */
  static average(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    const sum = numbers.reduce((acc, n) => acc + n, 0);
    return sum / numbers.length;
  }

  /**
   * Round to specified decimal places
   */
  static round(value: number, decimals: number = 2): number {
    return Number(value.toFixed(decimals));
  }

  /**
   * Count occurrences by key
   */
  static countBy<T>(items: T[], keyFn: (item: T) => string): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const item of items) {
      const key = keyFn(item);
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }

  /**
   * Group items by key
   */
  static groupBy<T>(items: T[], keyFn: (item: T) => string): Record<string, T[]> {
    const groups: Record<string, T[]> = {};
    for (const item of items) {
      const key = keyFn(item);
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }
    return groups;
  }
}

/**
 * Base analytics service error
 */
export class AnalyticsServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'AnalyticsServiceError';
  }
}

/**
 * Base analytics service
 * Provides caching and common utilities for all analytics services
 */
export abstract class BaseAnalyticsService {
  protected cache: CacheService;

  constructor(cache?: CacheService) {
    this.cache = cache || globalCache;
  }

  /**
   * Execute function with caching
   *
   * @param key - Cache key
   * @param fn - Function to execute if cache miss
   * @param ttl - Time to live in seconds (default: 300 = 5 min)
   * @returns Cached or fresh result
   */
  protected async withCache<T>(
    key: string,
    fn: () => Promise<T>,
    ttl: number = 300
  ): Promise<T> {
    try {
      // Try to get from cache
      const cached = await this.cache.get<T>(key);
      if (cached !== null) {
        logger.info(`Cache hit: ${key}`);
        return cached;
      }

      // Cache miss - execute function
      logger.info(`Cache miss: ${key}`);
      const result = await fn();

      // Store in cache
      await this.cache.set(key, result, ttl);

      return result;
    } catch (error) {
      logger.error(`Error in withCache for key ${key}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Invalidate cache for specific key
   */
  protected async invalidateCache(key: string): Promise<void> {
    await this.cache.delete(key);
    logger.info(`Cache invalidated: ${key}`);
  }

  /**
   * Clear all cache
   */
  protected async clearCache(): Promise<void> {
    await this.cache.clear();
    logger.info('Cache cleared');
  }

  /**
   * Handle errors consistently
   */
  protected handleError(error: unknown, context: string): never {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`${context}: ${message}`);

    if (error instanceof AnalyticsServiceError) {
      throw error;
    }

    throw new AnalyticsServiceError(
      `Failed to ${context}: ${message}`,
      'ANALYTICS_ERROR'
    );
  }
}

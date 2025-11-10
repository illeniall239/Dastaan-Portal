/**
 * Test Helper Utilities
 *
 * Common utility functions for testing repositories and services.
 * Provides helpers for mocking, date handling, and assertions.
 */

import { vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Setup fake timers with a specific date
 * Useful for testing date-dependent logic
 *
 * @param date - Date to set as "now"
 * @returns Cleanup function to restore real timers
 */
export function setupMockDateNow(date: Date | string) {
  const mockDate = typeof date === 'string' ? new Date(date) : date;
  vi.useFakeTimers();
  vi.setSystemTime(mockDate);

  return () => {
    vi.useRealTimers();
  };
}

/**
 * Mock the repository context to inject a specific client
 * Allows testing repositories with controlled Supabase client
 *
 * @param context - Context type ('server', 'client', or 'admin')
 * @param mockClient - Mock Supabase client to inject
 */
export function mockRepositoryContext(
  context: 'server' | 'client' | 'admin',
  mockClient: any
) {
  // Mock the repository context module
  vi.doMock('@/lib/repositories/base/repository-context', () => ({
    RepositoryContext: {
      getClient: vi.fn().mockResolvedValue(mockClient),
    },
    RepositoryContextType: context,
  }));
}

/**
 * Create a date in the past relative to now
 *
 * @param daysAgo - Number of days in the past
 * @returns ISO date string
 */
export function daysAgo(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
}

/**
 * Create a date in the future relative to now
 *
 * @param daysFromNow - Number of days in the future
 * @returns ISO date string
 */
export function daysFromNow(daysFromNow: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString();
}

/**
 * Assert that a Supabase query was called with specific filters
 * Useful for verifying query construction
 *
 * @param mockClient - Mock Supabase client
 * @param tableName - Expected table name
 * @param filters - Expected filters (key-value pairs)
 */
export function expectQueryWithFilters(
  mockClient: any,
  tableName: string,
  filters: Record<string, any>
) {
  expect(mockClient.from).toHaveBeenCalledWith(tableName);

  Object.entries(filters).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      expect(mockClient.from().in).toHaveBeenCalledWith(key, value);
    } else {
      expect(mockClient.from().eq).toHaveBeenCalledWith(key, value);
    }
  });
}

/**
 * Assert that a query included ordering
 *
 * @param mockQueryBuilder - Mock query builder
 * @param column - Expected column to order by
 * @param ascending - Expected sort direction
 */
export function expectQueryOrdered(
  mockQueryBuilder: any,
  column: string,
  ascending: boolean = true
) {
  expect(mockQueryBuilder.order).toHaveBeenCalledWith(column, { ascending });
}

/**
 * Assert that a query included pagination
 *
 * @param mockQueryBuilder - Mock query builder
 * @param limit - Expected limit
 * @param offset - Expected offset (optional)
 */
export function expectQueryPaginated(
  mockQueryBuilder: any,
  limit: number,
  offset?: number
) {
  if (offset !== undefined) {
    expect(mockQueryBuilder.range).toHaveBeenCalledWith(offset, offset + limit - 1);
  } else {
    expect(mockQueryBuilder.limit).toHaveBeenCalledWith(limit);
  }
}

/**
 * Wait for all promises to resolve
 * Useful for testing async operations
 */
export async function flushPromises() {
  return new Promise((resolve) => setImmediate(resolve));
}

/**
 * Create a mock error from Supabase
 *
 * @param message - Error message
 * @param code - Error code (default: PGRST116)
 * @returns Supabase-style error object
 */
export function createSupabaseError(message: string, code: string = 'PGRST116') {
  return {
    message,
    code,
    details: '',
    hint: '',
  };
}

/**
 * Assert that an array contains objects with specific properties
 *
 * @param array - Array to check
 * @param expectedProperties - Properties that should exist
 */
export function expectArrayWithProperties<T>(
  array: T[],
  expectedProperties: (keyof T)[]
) {
  expect(array.length).toBeGreaterThan(0);
  array.forEach((item) => {
    expectedProperties.forEach((prop) => {
      expect(item).toHaveProperty(prop);
    });
  });
}

/**
 * Assert that a value is within a range
 *
 * @param value - Value to check
 * @param min - Minimum expected value
 * @param max - Maximum expected value
 */
export function expectInRange(value: number, min: number, max: number) {
  expect(value).toBeGreaterThanOrEqual(min);
  expect(value).toBeLessThanOrEqual(max);
}

/**
 * Create a partial mock of an object
 * Useful for creating test data with only required fields
 *
 * @param base - Base object
 * @param overrides - Properties to override
 * @returns Merged object
 */
export function createPartialMock<T>(base: T, overrides: Partial<T> = {}): T {
  return { ...base, ...overrides };
}

/**
 * Wait for a specific amount of time
 * Useful when testing timers or debounced functions
 *
 * @param ms - Milliseconds to wait
 */
export async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Assert that a function was called with an object containing specific properties
 *
 * @param mockFn - Mock function
 * @param expectedProperties - Expected properties in the argument
 */
export function expectCalledWithObjectContaining(
  mockFn: any,
  expectedProperties: Record<string, any>
) {
  expect(mockFn).toHaveBeenCalledWith(
    expect.objectContaining(expectedProperties)
  );
}

/**
 * Create a range of numbers
 * Useful for generating test data arrays
 *
 * @param start - Start number (inclusive)
 * @param end - End number (inclusive)
 * @returns Array of numbers
 */
export function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

/**
 * Generate a random integer between min and max (inclusive)
 *
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Random integer
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Pick random items from an array
 *
 * @param array - Source array
 * @param count - Number of items to pick
 * @returns Array of random items
 */
export function pickRandom<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

/**
 * Assert that two dates are approximately equal (within tolerance)
 *
 * @param date1 - First date
 * @param date2 - Second date
 * @param toleranceMs - Tolerance in milliseconds (default: 1000)
 */
export function expectDatesClose(
  date1: Date | string,
  date2: Date | string,
  toleranceMs: number = 1000
) {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
  const diff = Math.abs(d1.getTime() - d2.getTime());
  expect(diff).toBeLessThanOrEqual(toleranceMs);
}

/**
 * Calculate days between two dates
 *
 * @param date1 - First date
 * @param date2 - Second date
 * @returns Number of days between dates
 */
export function daysBetween(date1: Date | string, date2: Date | string): number {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

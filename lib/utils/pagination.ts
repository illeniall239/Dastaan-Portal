/**
 * Pagination Utilities
 *
 * Helper functions for implementing pagination across the application
 */

import { NextRequest } from "next/server";
import type {
  PaginationParams,
  PaginationMeta,
  PaginatedResponse,
} from "@/types/pagination";

/**
 * Default pagination settings
 */
export const PAGINATION_DEFAULTS = {
  page: 1,
  limit: 20,
  maxLimit: 100, // Prevent abuse by limiting max items per page
  sortOrder: "desc" as const,
};

/**
 * Parse pagination parameters from Next.js request URL
 *
 * @param request - Next.js request object
 * @returns Validated pagination parameters
 *
 * @example
 * ```ts
 * export async function GET(request: NextRequest) {
 *   const params = parsePaginationParams(request);
 *   // params = { page: 1, limit: 20, sortBy: "created_at", sortOrder: "desc" }
 * }
 * ```
 */
export function parsePaginationParams(
  request: NextRequest
): Required<PaginationParams> {
  const searchParams = request.nextUrl.searchParams;

  // Parse page (ensure >= 1)
  const page = Math.max(
    1,
    parseInt(searchParams.get("page") || String(PAGINATION_DEFAULTS.page), 10)
  );

  // Parse limit (ensure within bounds)
  const rawLimit = parseInt(
    searchParams.get("limit") || String(PAGINATION_DEFAULTS.limit),
    10
  );
  const limit = Math.min(
    PAGINATION_DEFAULTS.maxLimit,
    Math.max(1, rawLimit)
  );

  // Parse sort parameters
  const sortBy = searchParams.get("sortBy") || "created_at";
  const sortOrder =
    (searchParams.get("sortOrder") as "asc" | "desc") ||
    PAGINATION_DEFAULTS.sortOrder;

  return {
    page,
    limit,
    sortBy,
    sortOrder,
  };
}

/**
 * Calculate pagination metadata
 *
 * @param page - Current page number (1-indexed)
 * @param limit - Items per page
 * @param totalItems - Total number of items across all pages
 * @returns Pagination metadata
 *
 * @example
 * ```ts
 * const meta = calculatePaginationMeta(2, 20, 45);
 * // {
 * //   currentPage: 2,
 * //   pageSize: 20,
 * //   totalItems: 45,
 * //   totalPages: 3,
 * //   hasNextPage: true,
 * //   hasPreviousPage: true,
 * //   startIndex: 20,
 * //   endIndex: 39
 * // }
 * ```
 */
export function calculatePaginationMeta(
  page: number,
  limit: number,
  totalItems: number
): PaginationMeta {
  const totalPages = Math.ceil(totalItems / limit);
  const startIndex = (page - 1) * limit;
  const endIndex = Math.min(startIndex + limit - 1, totalItems - 1);

  return {
    currentPage: page,
    pageSize: limit,
    totalItems,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
    startIndex,
    endIndex,
  };
}

/**
 * Calculate Supabase range for pagination
 *
 * @param page - Current page number (1-indexed)
 * @param limit - Items per page
 * @returns Object with 'from' and 'to' indices for Supabase .range()
 *
 * @example
 * ```ts
 * const { from, to } = getSupabaseRange(2, 20);
 * const { data } = await supabase
 *   .from('stories')
 *   .select('*', { count: 'exact' })
 *   .range(from, to);
 * ```
 */
export function getSupabaseRange(
  page: number,
  limit: number
): { from: number; to: number } {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  return { from, to };
}

/**
 * Create a paginated response
 *
 * @param data - Array of items for current page
 * @param page - Current page number
 * @param limit - Items per page
 * @param totalItems - Total number of items across all pages
 * @returns Paginated response with data and metadata
 *
 * @example
 * ```ts
 * const response = createPaginatedResponse(stories, 1, 20, 100);
 * return NextResponse.json(response);
 * ```
 */
export function createPaginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  totalItems: number
): PaginatedResponse<T> {
  return {
    data,
    pagination: calculatePaginationMeta(page, limit, totalItems),
  };
}

/**
 * Apply pagination to a Supabase query builder
 *
 * This is a helper that applies .range() to a Supabase query.
 * Note: You still need to call .select('*', { count: 'exact' }) yourself
 *
 * @param query - Supabase query builder
 * @param params - Pagination parameters
 * @returns Query builder with pagination applied
 *
 * @example
 * ```ts
 * let query = supabase.from('stories').select('*', { count: 'exact' });
 * query = applyPaginationToQuery(query, { page: 1, limit: 20 });
 * const { data, count } = await query;
 * ```
 */
export function applyPaginationToQuery<T>(
  query: any,
  params: Pick<PaginationParams, "page" | "limit">
): any {
  const page = params.page || PAGINATION_DEFAULTS.page;
  const limit = params.limit || PAGINATION_DEFAULTS.limit;
  const { from, to } = getSupabaseRange(page, limit);

  return query.range(from, to);
}

/**
 * Apply sorting to a Supabase query builder
 *
 * @param query - Supabase query builder
 * @param params - Pagination parameters with sorting
 * @returns Query builder with sorting applied
 *
 * @example
 * ```ts
 * let query = supabase.from('stories').select('*');
 * query = applySortingToQuery(query, { sortBy: 'created_at', sortOrder: 'desc' });
 * ```
 */
export function applySortingToQuery<T>(
  query: any,
  params: Pick<PaginationParams, "sortBy" | "sortOrder">
): any {
  const sortBy = params.sortBy || "created_at";
  const sortOrder = params.sortOrder || PAGINATION_DEFAULTS.sortOrder;

  return query.order(sortBy, { ascending: sortOrder === "asc" });
}

/**
 * Complete pagination helper for Supabase queries
 *
 * Applies both pagination and sorting to a query.
 * Don't forget to add { count: 'exact' } to your .select() call!
 *
 * @param query - Supabase query builder
 * @param params - Full pagination parameters
 * @returns Query builder with pagination and sorting applied
 *
 * @example
 * ```ts
 * export async function GET(request: NextRequest) {
 *   const params = parsePaginationParams(request);
 *   const supabase = await createClient();
 *
 *   let query = supabase
 *     .from('stories')
 *     .select('*', { count: 'exact' })
 *     .eq('status', 'submitted');
 *
 *   query = applyPagination(query, params);
 *
 *   const { data, count, error } = await query;
 *
 *   if (error) throw error;
 *
 *   const response = createPaginatedResponse(
 *     data || [],
 *     params.page,
 *     params.limit,
 *     count || 0
 *   );
 *
 *   return NextResponse.json(response);
 * }
 * ```
 */
export function applyPagination<T>(
  query: any,
  params: Required<PaginationParams>
): any {
  query = applyPaginationToQuery(query, params);
  query = applySortingToQuery(query, params);
  return query;
}

/**
 * Validate pagination parameters
 *
 * @param params - Pagination parameters to validate
 * @returns Validation result
 */
export function validatePaginationParams(params: PaginationParams): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (params.page !== undefined) {
    if (!Number.isInteger(params.page) || params.page < 1) {
      errors.push("page must be a positive integer");
    }
  }

  if (params.limit !== undefined) {
    if (!Number.isInteger(params.limit) || params.limit < 1) {
      errors.push("limit must be a positive integer");
    }
    if (params.limit > PAGINATION_DEFAULTS.maxLimit) {
      errors.push(`limit cannot exceed ${PAGINATION_DEFAULTS.maxLimit}`);
    }
  }

  if (params.sortOrder !== undefined) {
    if (params.sortOrder !== "asc" && params.sortOrder !== "desc") {
      errors.push("sortOrder must be 'asc' or 'desc'");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

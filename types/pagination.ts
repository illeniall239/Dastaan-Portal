/**
 * Pagination Types
 *
 * Standardized pagination interfaces used across the application
 */

/**
 * Pagination parameters for requests
 */
export interface PaginationParams {
  /**
   * Page number (1-indexed)
   * @default 1
   */
  page?: number;

  /**
   * Number of items per page
   * @default 20
   */
  limit?: number;

  /**
   * Sort field
   */
  sortBy?: string;

  /**
   * Sort order
   * @default "desc"
   */
  sortOrder?: "asc" | "desc";
}

/**
 * Pagination metadata for responses
 */
export interface PaginationMeta {
  /**
   * Current page number
   */
  currentPage: number;

  /**
   * Items per page
   */
  pageSize: number;

  /**
   * Total number of items across all pages
   */
  totalItems: number;

  /**
   * Total number of pages
   */
  totalPages: number;

  /**
   * Whether there is a next page
   */
  hasNextPage: boolean;

  /**
   * Whether there is a previous page
   */
  hasPreviousPage: boolean;

  /**
   * Index of first item on current page (0-indexed)
   */
  startIndex: number;

  /**
   * Index of last item on current page (0-indexed)
   */
  endIndex: number;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  /**
   * Array of items for current page
   */
  data: T[];

  /**
   * Pagination metadata
   */
  pagination: PaginationMeta;
}

/**
 * Supabase pagination result (internal use)
 */
export interface SupabasePaginationResult<T> {
  data: T[];
  count: number | null;
  error: any;
}

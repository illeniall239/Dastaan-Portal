/**
 * Supabase Mock Utilities
 *
 * Provides reusable mock factories for Supabase clients and query builders.
 * Used across all repository and service tests.
 */

import { vi } from 'vitest';

/**
 * Creates a mock Supabase query builder with chainable methods
 * All methods return the builder itself to support method chaining
 *
 * @param mockData - Optional data to return from query
 * @param mockError - Optional error to return from query
 * @returns Chainable mock query builder
 */
export function createMockQueryBuilder(
  mockData: any = null,
  mockError: any = null
) {
  const builder: any = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    containedBy: vi.fn().mockReturnThis(),
    rangeGt: vi.fn().mockReturnThis(),
    rangeGte: vi.fn().mockReturnThis(),
    rangeLt: vi.fn().mockReturnThis(),
    rangeLte: vi.fn().mockReturnThis(),
    rangeAdjacent: vi.fn().mockReturnThis(),
    overlaps: vi.fn().mockReturnThis(),
    textSearch: vi.fn().mockReturnThis(),
    match: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: mockData, error: mockError }),
    maybeSingle: vi.fn().mockResolvedValue({ data: mockData, error: mockError }),
    then: vi.fn((resolve) => resolve({ data: mockData, error: mockError })),
  };

  return builder;
}

/**
 * Creates a mock Supabase client with all common methods
 * Includes auth, storage, and query builder methods
 *
 * @param options - Configuration for mock responses
 * @returns Mock Supabase client
 */
export function createMockSupabaseClient(options: {
  queryData?: any;
  queryError?: any;
  user?: any;
  session?: any;
} = {}) {
  const {
    queryData = null,
    queryError = null,
    user = null,
    session = null,
  } = options;

  const mockQueryBuilder = createMockQueryBuilder(queryData, queryError);

  return {
    // Query builder methods
    from: vi.fn(() => mockQueryBuilder),

    // Auth methods
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session }, error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: { user, session }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },

    // Storage methods
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: { path: 'test/path' }, error: null }),
        download: vi.fn().mockResolvedValue({ data: new Blob(), error: null }),
        remove: vi.fn().mockResolvedValue({ data: null, error: null }),
        list: vi.fn().mockResolvedValue({ data: [], error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/test' } }),
      }),
    },

    // RPC methods
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),

    // Channel/Realtime methods
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      unsubscribe: vi.fn().mockReturnThis(),
    }),
  };
}

/**
 * Creates a mock for the RepositoryContext.getClient() method
 * Allows injecting a mock client into repositories
 *
 * @param mockClient - Mock Supabase client to inject
 * @returns Mock function
 */
export function mockRepositoryGetClient(mockClient: any) {
  return vi.fn().mockResolvedValue(mockClient);
}

/**
 * Helper to create a successful query response
 */
export function createSuccessResponse<T>(data: T) {
  return { data, error: null };
}

/**
 * Helper to create an error query response
 */
export function createErrorResponse(message: string, code = 'PGRST116') {
  return {
    data: null,
    error: {
      message,
      code,
      details: '',
      hint: '',
    },
  };
}

/**
 * Helper to create a count response
 */
export function createCountResponse(count: number) {
  return { count, error: null };
}

/**
 * Creates a mock query builder that returns specific data on final call
 * Useful for testing query construction
 *
 * @param finalData - Data to return on query execution
 * @returns Configured mock query builder
 */
export function createMockQueryBuilderWithData(finalData: any) {
  const builder = createMockQueryBuilder();

  // Override the then method to return the final data
  builder.then = vi.fn((resolve) => resolve({ data: finalData, error: null }));
  builder.single = vi.fn().mockResolvedValue({ data: finalData, error: null });

  return builder;
}

/**
 * Creates a mock query builder that returns an error on final call
 * Useful for testing error handling
 *
 * @param errorMessage - Error message to return
 * @returns Configured mock query builder
 */
export function createMockQueryBuilderWithError(errorMessage: string) {
  const builder = createMockQueryBuilder();
  const error = createErrorResponse(errorMessage).error;

  builder.then = vi.fn((resolve) => resolve({ data: null, error }));
  builder.single = vi.fn().mockResolvedValue({ data: null, error });

  return builder;
}

import { useQuery } from "@tanstack/react-query";

export interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
  position?: string;
  department?: string;
}

interface UseSearchUsersOptions {
  query: string;
  enabled?: boolean;
  debounceMs?: number;
}

/**
 * React Query hook for searching users with automatic caching and deduplication
 *
 * @param query - Search query string
 * @param enabled - Whether the query should run (default: true if query length > 0)
 * @param debounceMs - Debounce delay in milliseconds (handled by caller)
 *
 * @returns React Query result with users data, loading state, and error
 *
 * @example
 * ```tsx
 * const { data: users, isLoading, error } = useSearchUsers({
 *   query: searchQuery,
 *   enabled: searchQuery.length > 0
 * });
 * ```
 */
export function useSearchUsers({ query, enabled = true }: UseSearchUsersOptions) {
  return useQuery({
    // Query key includes the search query for proper caching
    queryKey: ["users", "search", query],

    // Fetch function
    queryFn: async () => {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);

      if (!response.ok) {
        throw new Error(`User search failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.users as User[];
    },

    // Only run query if enabled and query has content
    enabled: enabled && query.length > 0,

    // Cache results for 5 minutes
    staleTime: 5 * 60 * 1000,

    // Keep cached data for 10 minutes after last use
    gcTime: 10 * 60 * 1000,

    // Don't refetch on window focus for search results
    refetchOnWindowFocus: false,

    // Retry once on failure
    retry: 1,
  });
}

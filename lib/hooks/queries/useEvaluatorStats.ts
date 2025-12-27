import { useQuery } from "@tanstack/react-query";

export interface EvaluatorStats {
  id: string;
  name: string;
  email: string;
  oneLinerEvaluations: number;      // One-liner evaluations (call report evaluations)
  episodicEvals: number;
  writerEngagementReports: number;  // Call reports logged by evaluator
  totalEvaluations: number;
  avgTimeSpent: number; // minutes per day (actual time tracking)
}

interface UseEvaluatorStatsOptions {
  from?: Date;
  to?: Date;
  enabled?: boolean;
}

/**
 * React Query hook for fetching evaluator statistics with optional time range filtering
 *
 * Fetches activity metrics for all evaluators including one-liner count, episodic evaluations,
 * call report evaluations, and average time spent. Supports filtering by date range.
 *
 * @param from - Start date for filtering (optional)
 * @param to - End date for filtering (optional)
 * @param enabled - Whether the query should run (default: true)
 *
 * @returns React Query result with evaluator stats array, loading state, and error
 *
 * @example
 * ```tsx
 * // All time stats
 * const { data: stats, isLoading } = useEvaluatorStats();
 *
 * // Filtered by time range
 * const { data: monthlyStats } = useEvaluatorStats({
 *   from: startOfMonth(new Date()),
 *   to: endOfMonth(new Date())
 * });
 * ```
 */
export function useEvaluatorStats({
  from,
  to,
  enabled = true,
}: UseEvaluatorStatsOptions = {}) {
  // Build query params
  const queryParams = new URLSearchParams();
  if (from) queryParams.set("from", from.toISOString());
  if (to) queryParams.set("to", to.toISOString());

  const queryString = queryParams.toString();
  const url = `/api/management/evaluator-stats${queryString ? `?${queryString}` : ""}`;

  return useQuery({
    // Query key includes the date range for proper caching
    queryKey: ["evaluator-stats", from?.toISOString() || null, to?.toISOString() || null],

    queryFn: async () => {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch evaluator stats: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch evaluator stats");
      }

      return data.stats as EvaluatorStats[];
    },

    enabled,

    // Cache stats for 3 minutes (semi-static data)
    staleTime: 3 * 60 * 1000,

    // Keep cached stats for 10 minutes after last use
    gcTime: 10 * 60 * 1000,

    // Don't refetch on window focus (stats don't change that frequently)
    refetchOnWindowFocus: false,

    // Retry once on failure
    retry: 1,

    // Initialize with empty array to prevent undefined state
    placeholderData: [],
  });
}

import { useQuery } from "@tanstack/react-query";

export interface PendingEvaluation {
  id: string;
  call_report_id: string;
  working_title: string;
  writer_name: string;
  meeting_date: string;
  logline?: string;
}

interface UsePendingEvaluationsOptions {
  evaluatorId: string;
  enabled?: boolean;
  refetchInterval?: number;
}

/**
 * React Query hook for fetching pending evaluations for a specific evaluator
 *
 * Returns all call reports that have not yet been evaluated by the specified evaluator.
 * Useful for displaying an evaluator's task list.
 *
 * @param evaluatorId - The evaluator's user ID
 * @param enabled - Whether the query should run (default: true)
 * @param refetchInterval - Optional polling interval in milliseconds
 *
 * @returns React Query result with pending evaluations array, loading state, and error
 *
 * @example
 * ```tsx
 * const { data: pending, isLoading } = usePendingEvaluations({
 *   evaluatorId: user.id
 * });
 *
 * // With auto-refresh
 * const { data: pending } = usePendingEvaluations({
 *   evaluatorId: user.id,
 *   refetchInterval: 60000 // Refresh every minute
 * });
 * ```
 */
export function usePendingEvaluations({
  evaluatorId,
  enabled = true,
  refetchInterval,
}: UsePendingEvaluationsOptions) {
  return useQuery({
    queryKey: ["pending-evaluations", evaluatorId],

    queryFn: async () => {
      const response = await fetch(
        `/api/evaluations/pending?evaluatorId=${encodeURIComponent(evaluatorId)}`
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch pending evaluations: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch pending evaluations");
      }

      return data.pending as PendingEvaluation[];
    },

    enabled: enabled && !!evaluatorId,

    // Cache pending evaluations for 2 minutes
    staleTime: 2 * 60 * 1000,

    // Keep cached data for 5 minutes after last use
    gcTime: 5 * 60 * 1000,

    // Refetch on window focus to show latest pending tasks
    refetchOnWindowFocus: true,

    // Optional polling for real-time updates
    refetchInterval,

    // Stop polling when window is not visible
    refetchIntervalInBackground: false,

    // Retry once on failure
    retry: 1,

    // Initialize with empty array to prevent undefined state
    placeholderData: [],
  });
}

import { useQuery } from "@tanstack/react-query";
import type { RoadmapData } from "@/types";

interface UseRoadmapDataOptions {
  callReportId: string | null;
  enabled?: boolean;
}

/**
 * React Query hook for fetching roadmap detail data with caching
 *
 * Fetches complete roadmap data for a single call report, including all
 * stages, evaluations, and workflow progress.
 *
 * @param callReportId - The call report ID to fetch data for
 * @param enabled - Whether the query should run (default: true)
 *
 * @returns React Query result with roadmap data, loading state, and error
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useRoadmapData({
 *   callReportId: selectedId,
 *   enabled: modalOpen && !!selectedId
 * });
 * ```
 */
export function useRoadmapData({ callReportId, enabled = true }: UseRoadmapDataOptions) {
  return useQuery({
    queryKey: ["roadmap-data", callReportId],

    queryFn: async () => {
      if (!callReportId) throw new Error("No callReportId provided");

      const response = await fetch(`/api/roadmap/${callReportId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch roadmap data");
      }

      return data as RoadmapData;
    },

    enabled: enabled && !!callReportId,

    // Cache roadmap data for 5 minutes (data doesn't change frequently)
    staleTime: 5 * 60 * 1000,

    // Keep cached data for 10 minutes after last use
    gcTime: 10 * 60 * 1000,

    // Don't refetch on window focus for modal data
    refetchOnWindowFocus: false,

    // Retry once on failure
    retry: 1,
  });
}

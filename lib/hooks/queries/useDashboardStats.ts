import { useQuery } from "@tanstack/react-query";

/**
 * Active evaluation item shown in dashboard
 */
export interface ActiveEvaluation {
  id: string;
  form_id: string;
  call_report_id: string;
  evaluator_id: string;
  project_title?: string;
  writer_name?: string;
  status: string;
  created_at: string;
  submitted_at?: string;
}

/**
 * Rejected/archived story item shown in dashboard
 */
export interface RejectedStory {
  id: string;
  story_id: string;
  title: string;
  writer_name: string;
  genre: string;
  status: string;
  rejected_at?: string;
  rejection_reason?: string;
  created_at: string;
}

export interface DashboardStats {
  summary: {
    totalActiveProjects: number;
    activeContracts: number;
    overduePayments: number;
    weeklyActivities: number;
    pendingApprovals: number;
  };
  funnel: {
    submitted: number;
    in_evaluation: number;
    approved: number;
    in_negotiation: number;
    in_legal_review: number;
    contracted: number;
    in_payment: number;
    completed: number;
    archived: number;
  };
  activeEvaluations: ActiveEvaluation[];
  rejectedArchive: RejectedStory[];
}

interface UseDashboardStatsOptions {
  enabled?: boolean;
}

/**
 * React Query hook for fetching stakeholder dashboard statistics
 *
 * Fetches comprehensive dashboard data including project counts, pipeline funnel,
 * active evaluations, and rejected archive with caching to reduce server load.
 *
 * @param enabled - Whether the query should run (default: true)
 *
 * @returns React Query result with dashboard stats, loading state, and error
 *
 * @example
 * ```tsx
 * const { data: stats, isLoading } = useDashboardStats();
 *
 * if (isLoading) return <div>Loading dashboard...</div>;
 *
 * return (
 *   <div>
 *     <p>Total Active Projects: {stats?.summary.totalActiveProjects}</p>
 *     <p>Projects in Evaluation: {stats?.funnel.in_evaluation}</p>
 *   </div>
 * );
 * ```
 */
export function useDashboardStats({ enabled = true }: UseDashboardStatsOptions = {}) {
  return useQuery({
    queryKey: ["dashboard", "stats"],

    queryFn: async () => {
      const response = await fetch("/api/dashboard/stats");

      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard stats: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch dashboard stats");
      }

      return data.stats as DashboardStats;
    },

    enabled,

    // Cache dashboard stats for 5 minutes (balanced for freshness and performance)
    staleTime: 5 * 60 * 1000,

    // Keep cached stats for 10 minutes after last use
    gcTime: 10 * 60 * 1000,

    // Don't refetch on window focus (dashboard data doesn't change that frequently)
    refetchOnWindowFocus: false,

    // Don't refetch on reconnect (let cache handle it)
    refetchOnReconnect: false,

    // Retry once on failure
    retry: 1,

    // Initialize with empty stats to prevent undefined state
    placeholderData: {
      summary: {
        totalActiveProjects: 0,
        activeContracts: 0,
        overduePayments: 0,
        weeklyActivities: 0,
        pendingApprovals: 0
      },
      funnel: {
        submitted: 0,
        in_evaluation: 0,
        approved: 0,
        in_negotiation: 0,
        in_legal_review: 0,
        contracted: 0,
        in_payment: 0,
        completed: 0,
        archived: 0
      },
      activeEvaluations: [],
      rejectedArchive: []
    },
  });
}
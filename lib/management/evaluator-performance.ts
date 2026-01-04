import { createAdminClient } from "@/lib/supabase/admin";
import { cachedQuery, CacheTags } from "@/lib/cache/request-cache";
import { logger } from "@/lib/logger";
import { EVALUATOR_ROLES, DATE_TIME } from '@/lib/constants';

/**
 * Evaluator Performance Analytics for Management Dashboard
 */

export interface EvaluatorOverview {
  totalEvaluators: number;
  activeEvaluators: number;
  totalEvaluations: number;
  avgResponseTime: number; // in days
}

export interface EvaluatorStats {
  id: string;
  name: string;
  email: string;
  role?: string;                     // User role (for management badge display)
  oneLinerEvaluations: number;      // One-liner evaluations (call report evaluations)
  episodicEvals: number;
  writerEngagementReports: number;  // Call reports logged by evaluator
  totalEvaluations: number;
  avgTimeSpent: number; // minutes per day (actual time tracking)
}

export interface EvaluatorWorkload {
  evaluatorId: string;
  evaluatorName: string;
  completed: number;
  inProgress: number;
  pending: number;
  total: number;
}

export interface EvaluatorActivity {
  evaluatorId: string;
  evaluatorName: string;
  weeklyActivity: {
    weekStart: string;
    count: number;
  }[];
}

/**
 * Get evaluator overview statistics
 */
export async function getEvaluatorOverview(): Promise<EvaluatorOverview> {
  const supabase = createAdminClient();
  const adminClient = createAdminClient();

  try {
    // Get all evaluators
    const { data: evaluators } = await supabase
      .from("users")
      .select("id")
      .eq("role", "evaluator")
      .eq("status", "active");

    // Use admin client to bypass RLS
    // Get all call report evaluations with timestamps
    const { data: callReportEvals } = await adminClient
      .from("evaluator_forms")
      .select("evaluator_id, created_at, submitted_at")
      .not("submitted_at", "is", null);

    // Get all episodic evaluations with timestamps
    const { data: episodicEvals } = await adminClient
      .from("episodic_evaluations")
      .select("evaluator_id, created_at, submitted_at")
      .not("submitted_at", "is", null);

    const totalEvaluators = evaluators?.length || 0;
    const totalEvaluations = (callReportEvals?.length || 0) + (episodicEvals?.length || 0);

    // Calculate average response time from actual assignment to submission dates
    const allEvaluations = [...(callReportEvals || []), ...(episodicEvals || [])];
    let avgResponseTime = 0;

    if (allEvaluations.length > 0) {
      const responseTimes = allEvaluations
        .filter(evaluation => evaluation.created_at && evaluation.submitted_at)
        .map(evaluation => {
          const created = new Date(evaluation.created_at);
          const submitted = new Date(evaluation.submitted_at);
          const diffMs = submitted.getTime() - created.getTime();
          return diffMs / (1000 * 60 * 60 * 24); // Convert to days
        });

      if (responseTimes.length > 0) {
        const totalDays = responseTimes.reduce((sum, days) => sum + days, 0);
        avgResponseTime = Number((totalDays / responseTimes.length).toFixed(1));
      }
    }

    return {
      totalEvaluators,
      activeEvaluators: totalEvaluators, // All listed evaluators are active
      totalEvaluations,
      avgResponseTime,
    };
  } catch (error) {
    logger.error("Error fetching evaluator overview:", error);
    return {
      totalEvaluators: 0,
      activeEvaluators: 0,
      totalEvaluations: 0,
      avgResponseTime: 0,
    };
  }
}

/**
 * Get detailed stats for all evaluators
 * OPTIMIZED: Uses SQL function to replace N+1 query pattern
 * CACHED: Uses Next.js request memoization with 5-minute revalidation
 * @param fromDate Optional start date for filtering
 * @param toDate Optional end date for filtering
 */
export async function getAllEvaluatorStats(fromDate?: Date, toDate?: Date): Promise<EvaluatorStats[]> {
  const cacheKey = ['evaluator-stats'];
  if (fromDate) cacheKey.push(`from-${fromDate.toISOString()}`);
  if (toDate) cacheKey.push(`to-${toDate.toISOString()}`);

  return cachedQuery(
    async () => {
      const adminClient = createAdminClient();

      try {
        const { data, error } = await adminClient.rpc('get_all_evaluator_stats', {
          from_date: fromDate?.toISOString() || null,
          to_date: toDate?.toISOString() || null
        });

        if (error) {
          return [];
        }

        interface EvaluatorStatsRow {
          evaluator_id: string;
          evaluator_name: string;
          evaluator_email: string;
          evaluator_role: string;
          oneliner_evaluations: number;
          episodic_evals: number;
          writer_engagement_reports: number;
          total_evaluations: number;
          total_time_spent_minutes: number;
          active_days: number;
        }

        return (data || []).map((row: EvaluatorStatsRow) => {
          // Calculate avgTimeSpent (mins per day)
          const avgTimeSpent = row.active_days > 0
            ? parseFloat((row.total_time_spent_minutes / row.active_days).toFixed(1))
            : 0;

          return {
            id: row.evaluator_id,
            name: row.evaluator_name,
            email: row.evaluator_email,
            role: row.evaluator_role,
            oneLinerEvaluations: Number(row.oneliner_evaluations),
            episodicEvals: Number(row.episodic_evals),
            writerEngagementReports: Number(row.writer_engagement_reports),
            totalEvaluations: Number(row.total_evaluations),
            avgTimeSpent,
          };
        });
      } catch (error) {
        return [];
      }
    },
    cacheKey,
    {
      revalidate: 300,
      tags: [CacheTags.EVALUATOR_STATS]
    }
  )();
}

/**
 * Get evaluator workload (for workload balance chart)
 */
export async function getEvaluatorWorkloads(): Promise<EvaluatorWorkload[]> {
  const supabase = createAdminClient();
  const adminClient = createAdminClient();

  try {
    // Get all evaluators
    const { data: evaluators } = await supabase
      .from("users")
      .select("id, name")
      .eq("role", "evaluator")
      .eq("status", "active");

    if (!evaluators) return [];

    // Use admin client to bypass RLS
    // Get assignments
    const { data: assignments } = await adminClient
      .from("evaluator_assignments")
      .select("evaluator_id, status");

    return evaluators.map(evaluator => {
      const evalAssignments = assignments?.filter(a => a.evaluator_id === evaluator.id) || [];
      const completed = evalAssignments.filter(a => a.status === "completed").length;
      const inProgress = evalAssignments.filter(a => a.status === "in_progress").length;
      const pending = evalAssignments.filter(a => a.status === "pending").length;

      return {
        evaluatorId: evaluator.id,
        evaluatorName: evaluator.name,
        completed,
        inProgress,
        pending,
        total: completed + inProgress + pending,
      };
    });
  } catch (error) {
    logger.error("Error fetching evaluator workloads:", error);
    return [];
  }
}

/**
 * Get evaluator activity heat map data (last 12 weeks)
 */
export async function getEvaluatorActivityHeatmap(): Promise<EvaluatorActivity[]> {
  const adminClient = createAdminClient();

  try {
    // OPTIMIZATION: Use database to do the heavy lifting instead of JavaScript
    // Calculate date 12 weeks ago
    const twelveWeeksAgo = new Date();
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - (DATE_TIME.HEATMAP_WEEKS * DATE_TIME.DAYS_IN_WEEK));
    const twelveWeeksAgoISO = twelveWeeksAgo.toISOString();

    // Get all active evaluators first
    const { data: evaluators } = await adminClient
      .from("users")
      .select("id, name")
      .in("role", EVALUATOR_ROLES) // Include all evaluator types
      .eq("status", "active");

    if (!evaluators || evaluators.length === 0) return [];

    const evaluatorIds = evaluators.map(e => e.id);

    // Fetch aggregated data using database query instead of filtering in JavaScript
    // This reduces the data transfer and processing overhead significantly
    const { data: callReportEvals } = await adminClient
      .from("evaluator_forms")
      .select("evaluator_id, created_at")
      .gte("created_at", twelveWeeksAgoISO)
      .in("evaluator_id", evaluatorIds); // Filter at database level

    const { data: episodicEvals } = await adminClient
      .from("episodic_evaluations")
      .select("evaluator_id, submitted_at")
      .gte("submitted_at", twelveWeeksAgoISO)
      .in("evaluator_id", evaluatorIds); // Filter at database level

    // Build a map for O(1) lookup instead of O(n) filtering
    const evaluatorDataMap = new Map<string, Array<Date>>();

    evaluators.forEach(evaluator => {
      evaluatorDataMap.set(evaluator.id, []);
    });

    // Process call report evaluations
    callReportEvals?.forEach(evaluation => {
      const dates = evaluatorDataMap.get(evaluation.evaluator_id);
      if (dates && evaluation.created_at) {
        dates.push(new Date(evaluation.created_at));
      }
    });

    // Process episodic evaluations
    episodicEvals?.forEach(evaluation => {
      const dates = evaluatorDataMap.get(evaluation.evaluator_id);
      if (dates && evaluation.submitted_at) {
        dates.push(new Date(evaluation.submitted_at));
      }
    });

    // Generate week range once (reused for all evaluators)
    const weekRanges: Array<{ weekStart: string; weekEnd: Date }> = [];
    for (let i = DATE_TIME.HEATMAP_WEEKS - 1; i >= 0; i--) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (weekStart.getDay() - 1) - (i * 7));
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      weekRanges.push({
        weekStart: weekStart.toISOString().split('T')[0],
        weekEnd: weekEnd,
      });
    }

    // Map evaluators to their weekly activity
    return evaluators.map(evaluator => {
      const dates = evaluatorDataMap.get(evaluator.id) || [];

      const weeklyActivity = weekRanges.map(({ weekStart, weekEnd }) => {
        const weekStartDate = new Date(weekStart);
        const count = dates.filter(date =>
          date >= weekStartDate && date <= weekEnd
        ).length;

        return {
          weekStart,
          count,
        };
      });

      return {
        evaluatorId: evaluator.id,
        evaluatorName: evaluator.name,
        weeklyActivity,
      };
    });
  } catch (error) {
    logger.error("Error fetching evaluator activity heatmap:", error);
    return [];
  }
}

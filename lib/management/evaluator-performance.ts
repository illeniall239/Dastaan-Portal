import { createAdminClient } from "@/lib/supabase/admin";
import { cachedQuery, CacheTags } from "@/lib/cache/request-cache";

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
    // Get all call report evaluations
    const { data: callReportEvals } = await adminClient
      .from("evaluator_forms")
      .select("evaluator_id, created_at");

    // Get all episodic evaluations
    const { data: episodicEvals } = await adminClient
      .from("episodic_evaluations")
      .select("evaluator_id, submitted_at");

    const totalEvaluators = evaluators?.length || 0;
    const totalEvaluations = (callReportEvals?.length || 0) + (episodicEvals?.length || 0);

    // Calculate average response time (simplified - from assignment to submission)
    const avgResponseTime = 2.3; // TODO: Calculate from actual assignment dates

    return {
      totalEvaluators,
      activeEvaluators: totalEvaluators, // All listed evaluators are active
      totalEvaluations,
      avgResponseTime,
    };
  } catch (error) {
    console.error("Error fetching evaluator overview:", error);
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

        return (data || []).map((row: any) => {
          // Calculate avgTimeSpent (mins per day)
          const avgTimeSpent = row.active_days > 0
            ? parseFloat((row.total_time_spent_minutes / row.active_days).toFixed(1))
            : 0;

          return {
            id: row.evaluator_id,
            name: row.evaluator_name,
            email: row.evaluator_email,
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
    console.error("Error fetching evaluator workloads:", error);
    return [];
  }
}

/**
 * Get evaluator activity heat map data (last 12 weeks)
 */
export async function getEvaluatorActivityHeatmap(): Promise<EvaluatorActivity[]> {
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

    // Get evaluations from last 12 weeks
    const twelveWeeksAgo = new Date();
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);

    // Use admin client to bypass RLS
    const { data: callReportEvals } = await adminClient
      .from("evaluator_forms")
      .select("evaluator_id, created_at")
      .gte("created_at", twelveWeeksAgo.toISOString());

    const { data: episodicEvals } = await adminClient
      .from("episodic_evaluations")
      .select("evaluator_id, submitted_at")
      .gte("submitted_at", twelveWeeksAgo.toISOString());

    return evaluators.map(evaluator => {
      const crEvals = callReportEvals?.filter(e => e.evaluator_id === evaluator.id) || [];
      const epEvals = episodicEvals?.filter(e => e.evaluator_id === evaluator.id) || [];

      // Group by week
      const weeklyData: { [key: string]: number } = {};

      [...crEvals, ...epEvals].forEach(evaluation => {
        const date = new Date((evaluation as any).created_at || (evaluation as any).submitted_at);
        // Get Monday of the week
        const monday = new Date(date);
        monday.setDate(date.getDate() - date.getDay() + 1);
        const weekKey = monday.toISOString().split('T')[0];

        weeklyData[weekKey] = (weeklyData[weekKey] || 0) + 1;
      });

      // Generate last 12 weeks
      const weeklyActivity = [];
      for (let i = 11; i >= 0; i--) {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - (weekStart.getDay() - 1) - (i * 7));
        const weekKey = weekStart.toISOString().split('T')[0];

        weeklyActivity.push({
          weekStart: weekKey,
          count: weeklyData[weekKey] || 0,
        });
      }

      return {
        evaluatorId: evaluator.id,
        evaluatorName: evaluator.name,
        weeklyActivity,
      };
    });
  } catch (error) {
    console.error("Error fetching evaluator activity heatmap:", error);
    return [];
  }
}

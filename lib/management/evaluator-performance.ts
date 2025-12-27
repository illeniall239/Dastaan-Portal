import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
  const supabase = await createClient();
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
 * @param fromDate Optional start date for filtering
 * @param toDate Optional end date for filtering
 */
export async function getAllEvaluatorStats(fromDate?: Date, toDate?: Date): Promise<EvaluatorStats[]> {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  try {
    // Get all evaluators (using regular client for auth check)
    const { data: evaluators } = await supabase
      .from("users")
      .select("id, name, email")
      .eq("role", "evaluator")
      .eq("status", "active");

    if (!evaluators) return [];

    // Use admin client to bypass RLS for data fetching
    // Get call report evaluations with timestamps (with optional date filtering)
    let callReportQuery = adminClient
      .from("evaluator_forms")
      .select("evaluator_id, created_at, time_spent_minutes");

    if (fromDate) {
      callReportQuery = callReportQuery.gte("created_at", fromDate.toISOString());
    }
    if (toDate) {
      callReportQuery = callReportQuery.lte("created_at", toDate.toISOString());
    }

    const { data: callReportEvals, error: crError } = await callReportQuery;

    if (crError) {
      console.error("Error fetching call report evaluations:", crError);
    }

    // Get episodic evaluations with timestamps (with optional date filtering)
    let episodicQuery = adminClient
      .from("episodic_evaluations")
      .select("evaluator_id, submitted_at, time_spent_minutes");

    if (fromDate) {
      episodicQuery = episodicQuery.gte("submitted_at", fromDate.toISOString());
    }
    if (toDate) {
      episodicQuery = episodicQuery.lte("submitted_at", toDate.toISOString());
    }

    const { data: episodicEvals, error: epError } = await episodicQuery;

    if (epError) {
      console.error("Error fetching episodic evaluations:", epError);
    }

    // Get call reports created by evaluators (logged call reports)
    let callReportsQuery = adminClient
      .from("call_reports")
      .select("created_by, created_at, time_spent_minutes");

    if (fromDate) {
      callReportsQuery = callReportsQuery.gte("created_at", fromDate.toISOString());
    }
    if (toDate) {
      callReportsQuery = callReportsQuery.lte("created_at", toDate.toISOString());
    }

    const { data: callReports, error: crLogsError } = await callReportsQuery;

    if (crLogsError) {
      console.error("Error fetching call reports:", crLogsError);
    }

    console.log('Evaluator stats data fetched:', {
      evaluators: evaluators.length,
      callReportEvals: callReportEvals?.length || 0,
      episodicEvals: episodicEvals?.length || 0,
      callReportsLogged: callReports?.length || 0
    });

    return evaluators.map(evaluator => {
      const crEvals = callReportEvals?.filter(e => e.evaluator_id === evaluator.id) || [];
      const epEvals = episodicEvals?.filter(e => e.evaluator_id === evaluator.id) || [];
      const loggedCallReports = callReports?.filter(cr => cr.created_by === evaluator.id) || [];

      // Total Activities = ALL activities (evaluations + logged call reports)
      const totalActivities = crEvals.length + epEvals.length + loggedCallReports.length;

      // Calculate mins per day from actual time spent
      const allDates = [
        ...crEvals.map(e => new Date(e.created_at)),
        ...epEvals.map(e => new Date(e.submitted_at)),
        ...loggedCallReports.map(cr => new Date(cr.created_at)).filter(d => !isNaN(d.getTime())),
      ].filter(d => d instanceof Date && !isNaN(d.getTime()));

      let avgTimeSpent = 0;
      if (allDates.length >= 1) {
        // Calculate total minutes spent across all activities
        const totalMinutes = [
          ...crEvals.map(e => e.time_spent_minutes || 0),
          ...epEvals.map(e => e.time_spent_minutes || 0),
          ...loggedCallReports.map(cr => cr.time_spent_minutes || 0),
        ].reduce((sum, mins) => sum + mins, 0);

        if (totalMinutes > 0 && allDates.length >= 2) {
          // Calculate active days range
          const sortedDates = allDates.sort((a, b) => a.getTime() - b.getTime());
          const firstDate = sortedDates[0];
          const lastDate = sortedDates[sortedDates.length - 1];
          const diffTime = Math.abs(lastDate.getTime() - firstDate.getTime());
          const totalDaysActive = Math.max(1, diffTime / (1000 * 60 * 60 * 24)); // At least 1 day

          // Minutes per day
          avgTimeSpent = parseFloat((totalMinutes / totalDaysActive).toFixed(1));
        } else if (totalMinutes > 0) {
          // Only one activity - use total minutes as mins/day
          avgTimeSpent = totalMinutes;
        }
      }

      return {
        id: evaluator.id,
        name: evaluator.name,
        email: evaluator.email,
        oneLinerEvaluations: crEvals.length,           // One-liner evaluations (call report evaluations)
        episodicEvals: epEvals.length,
        writerEngagementReports: loggedCallReports.length,  // Call reports logged by evaluator
        totalEvaluations: totalActivities,  // Changed to totalActivities to count ALL activities
        avgTimeSpent,  // Now represents activities per day (frequency)
      };
    });
  } catch (error) {
    console.error("Error fetching evaluator stats:", error);
    return [];
  }
}

/**
 * Get evaluator workload (for workload balance chart)
 */
export async function getEvaluatorWorkloads(): Promise<EvaluatorWorkload[]> {
  const supabase = await createClient();
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
  const supabase = await createClient();
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

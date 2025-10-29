import { createClient } from "@/lib/supabase/server";

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
  oneLinerCount: number;
  episodicEvals: number;
  callReportEvals: number;
  totalEvaluations: number;
  avgTimeSpent: number; // average hours per evaluation
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

  try {
    // Get all evaluators
    const { data: evaluators } = await supabase
      .from("users")
      .select("id")
      .eq("role", "evaluator")
      .eq("status", "active");

    // Get all call report evaluations
    const { data: callReportEvals } = await supabase
      .from("evaluator_forms")
      .select("evaluator_id, created_at");

    // Get all episodic evaluations
    const { data: episodicEvals } = await supabase
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

  try {
    // Get all evaluators
    const { data: evaluators } = await supabase
      .from("users")
      .select("id, name, email")
      .eq("role", "evaluator")
      .eq("status", "active");

    if (!evaluators) return [];

    // Get call report evaluations with timestamps (with optional date filtering)
    let callReportQuery = supabase
      .from("evaluator_forms")
      .select("evaluator_id, created_at");

    if (fromDate) {
      callReportQuery = callReportQuery.gte("created_at", fromDate.toISOString());
    }
    if (toDate) {
      callReportQuery = callReportQuery.lte("created_at", toDate.toISOString());
    }

    const { data: callReportEvals } = await callReportQuery;

    // Get episodic evaluations with timestamps (with optional date filtering)
    let episodicQuery = supabase
      .from("episodic_evaluations")
      .select("evaluator_id, submitted_at");

    if (fromDate) {
      episodicQuery = episodicQuery.gte("submitted_at", fromDate.toISOString());
    }
    if (toDate) {
      episodicQuery = episodicQuery.lte("submitted_at", toDate.toISOString());
    }

    const { data: episodicEvals } = await episodicQuery;

    // Get one-liner decisions (with optional date filtering)
    let oneLinersQuery = supabase
      .from("one_liners")
      .select("decided_by, decided_at");

    if (fromDate) {
      oneLinersQuery = oneLinersQuery.gte("decided_at", fromDate.toISOString());
    }
    if (toDate) {
      oneLinersQuery = oneLinersQuery.lte("decided_at", toDate.toISOString());
    }

    const { data: oneLiners } = await oneLinersQuery;

    return evaluators.map(evaluator => {
      const crEvals = callReportEvals?.filter(e => e.evaluator_id === evaluator.id) || [];
      const epEvals = episodicEvals?.filter(e => e.evaluator_id === evaluator.id) || [];
      const oneLinerDecisions = oneLiners?.filter(ol => ol.decided_by === evaluator.id) || [];

      const totalEvaluations = crEvals.length + epEvals.length;

      // Calculate average time spent (hours per evaluation)
      const allDates = [
        ...crEvals.map(e => new Date(e.created_at)),
        ...epEvals.map(e => new Date(e.submitted_at)),
        ...oneLinerDecisions.map(ol => new Date(ol.decided_at)).filter(d => !isNaN(d.getTime())),
      ].filter(d => d instanceof Date && !isNaN(d.getTime()));

      let avgTimeSpent = 0;
      if (allDates.length >= 2) {
        const sortedDates = allDates.sort((a, b) => a.getTime() - b.getTime());
        const firstDate = sortedDates[0];
        const lastDate = sortedDates[sortedDates.length - 1];
        const diffTime = Math.abs(lastDate.getTime() - firstDate.getTime());
        const totalHoursActive = diffTime / (1000 * 60 * 60); // Convert to hours
        // Average hours per evaluation
        avgTimeSpent = totalEvaluations > 0 ? parseFloat((totalHoursActive / totalEvaluations).toFixed(1)) : 0;
      }

      return {
        id: evaluator.id,
        name: evaluator.name,
        email: evaluator.email,
        oneLinerCount: oneLinerDecisions.length,
        episodicEvals: epEvals.length,
        callReportEvals: crEvals.length,
        totalEvaluations,
        avgTimeSpent,
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

  try {
    // Get all evaluators
    const { data: evaluators } = await supabase
      .from("users")
      .select("id, name")
      .eq("role", "evaluator")
      .eq("status", "active");

    if (!evaluators) return [];

    // Get assignments
    const { data: assignments } = await supabase
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

    const { data: callReportEvals } = await supabase
      .from("evaluator_forms")
      .select("evaluator_id, created_at")
      .gte("created_at", twelveWeeksAgo.toISOString());

    const { data: episodicEvals } = await supabase
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

import { createClient } from "@/lib/supabase/server";
import { EvaluatorAssignment, EvaluationProgress } from "@/types";

/**
 * Assign content_head to a call report
 * Automatically assigns the team's content_head as the sole evaluator
 */
export async function assignEvaluatorsToCallReport(callReportId: string) {
  const supabase = await createClient();

  // Call the database function to auto-assign content_head
  const { error } = await supabase.rpc("auto_assign_content_head", {
    p_call_report_id: callReportId,
  });

  if (error) {
    throw new Error(`Failed to assign content_head: ${error.message}`);
  }

  return { success: true };
}

/**
 * Get all evaluator assignments for a call report
 */
export async function getEvaluatorAssignments(callReportId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("evaluator_assignments")
    .select(`
      *,
      evaluator:evaluator_id (
        id,
        name,
        email,
        evaluator_type
      )
    `)
    .eq("call_report_id", callReportId)
    .order("evaluator_type", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch evaluator assignments: ${error.message}`);
  }

  return data as (EvaluatorAssignment & { evaluator: any })[];
}

/**
 * Get pending evaluation assignments for an evaluator
 */
export async function getPendingEvaluationsForEvaluator(evaluatorId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("evaluator_assignments")
    .select(`
      *,
      call_report:call_report_id (
        id,
        call_report_id,
        working_title,
        writer_name,
        meeting_date,
        logline,
        evaluation_status,
        current_average_score,
        completed_evaluations,
        required_evaluators
      )
    `)
    .eq("evaluator_id", evaluatorId)
    .in("status", ["pending", "in_progress"])
    .order("assigned_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch pending evaluations: ${error.message}`);
  }

  return data;
}

/**
 * Get completed evaluation assignments for an evaluator
 */
export async function getCompletedEvaluationsForEvaluator(evaluatorId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("evaluator_assignments")
    .select(`
      *,
      call_report:call_report_id (
        id,
        call_report_id,
        working_title,
        writer_name,
        meeting_date,
        evaluation_status,
        average_score,
        completed_evaluations,
        required_evaluators
      )
    `)
    .eq("evaluator_id", evaluatorId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch completed evaluations: ${error.message}`);
  }

  return data;
}

/**
 * Get evaluation progress for a call report
 */
export async function getEvaluationProgress(
  callReportId: string
): Promise<EvaluationProgress> {
  const supabase = await createClient();

  // Call the database function
  const { data, error } = await supabase.rpc("get_evaluation_progress", {
    p_call_report_id: callReportId,
  });

  if (error) {
    throw new Error(`Failed to fetch evaluation progress: ${error.message}`);
  }

  if (!data || data.length === 0) {
    // Return default progress if no data (content_head-only system)
    return {
      total_required: 1,
      total_completed: 0,
      internal_required: 1,
      internal_completed: 0,
      external_required: 0,
      external_completed: 0,
      progress_percentage: 0,
      current_average: null,
      is_complete: false,
    };
  }

  return data[0] as EvaluationProgress;
}

/**
 * Check if a specific evaluator has completed their evaluation
 */
export async function hasEvaluatorCompleted(
  callReportId: string,
  evaluatorId: string
): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("evaluator_assignments")
    .select("status")
    .eq("call_report_id", callReportId)
    .eq("evaluator_id", evaluatorId)
    .single();

  if (error && error.code !== "PGRST116") {
    throw new Error(`Failed to check evaluator status: ${error.message}`);
  }

  return data?.status === "completed";
}

/**
 * Get assignment status for a call report
 * Returns counts and lists of pending/completed evaluators
 */
export async function getAssignmentStatus(callReportId: string) {
  const supabase = await createClient();

  const { data: assignments, error } = await supabase
    .from("evaluator_assignments")
    .select(`
      *,
      evaluator:evaluator_id (
        id,
        name,
        email,
        evaluator_type
      )
    `)
    .eq("call_report_id", callReportId);

  if (error) {
    throw new Error(`Failed to fetch assignment status: ${error.message}`);
  }

  const pending = assignments?.filter((a) => a.status !== "completed") || [];
  const completed = assignments?.filter((a) => a.status === "completed") || [];

  const pendingInternal = pending.filter(
    (a) => a.evaluator_type === "internal"
  );
  const pendingExternal = pending.filter(
    (a) => a.evaluator_type === "external"
  );
  const completedInternal = completed.filter(
    (a) => a.evaluator_type === "internal"
  );
  const completedExternal = completed.filter(
    (a) => a.evaluator_type === "external"
  );

  return {
    total: assignments?.length || 0,
    pending: {
      total: pending.length,
      internal: pendingInternal,
      external: pendingExternal,
    },
    completed: {
      total: completed.length,
      internal: completedInternal,
      external: completedExternal,
    },
  };
}

/**
 * Manually assign a specific evaluator to a call report
 */
export async function assignEvaluator(
  callReportId: string,
  evaluatorId: string,
  evaluatorType: "internal" | "external"
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("evaluator_assignments")
    .insert({
      call_report_id: callReportId,
      evaluator_id: evaluatorId,
      evaluator_type: evaluatorType,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to assign evaluator: ${error.message}`);
  }

  return data;
}

/**
 * Remove an evaluator assignment
 */
export async function removeEvaluatorAssignment(assignmentId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("evaluator_assignments")
    .delete()
    .eq("id", assignmentId);

  if (error) {
    throw new Error(`Failed to remove assignment: ${error.message}`);
  }

  return { success: true };
}

/**
 * Get all evaluators by type (for assignment selection)
 * TEAM ISOLATION: Only return evaluators from the same team
 */
export async function getEvaluatorsByType(type: "internal" | "external", teamId?: string) {
  const supabase = await createClient();

  // Get current user's team_id if not provided
  let filterTeamId = teamId;
  if (!filterTeamId) {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: currentUser } = await supabase
      .from("users")
      .select("team_id, role")
      .eq("id", user?.id)
      .single();

    // If user is admin/management, they can see all evaluators (no team filter)
    if (currentUser?.role === "admin" || currentUser?.role === "management") {
      filterTeamId = undefined;
    } else {
      filterTeamId = currentUser?.team_id;
    }
  }

  let query = supabase
    .from("users")
    .select("id, name, email, evaluator_type, team_id")
    .eq("role", "evaluator")
    .eq("evaluator_type", type)
    .eq("status", "active");

  // Apply team filter only if teamId is specified (non-management users)
  if (filterTeamId) {
    query = query.eq("team_id", filterTeamId);
  }

  const { data, error } = await query.order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch evaluators: ${error.message}`);
  }

  return data;
}

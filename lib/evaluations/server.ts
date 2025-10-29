import { createClient } from "@/lib/supabase/server";

/**
 * Optimized evaluator stats/query helpers to avoid SELECT * and reduce payload.
 */
export async function getEvaluatorProgress(callReportId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("evaluator_forms")
    .select("id, average_score, submitted_at")
    .eq("call_report_id", callReportId);
  if (error) throw error;

  const submitted = (data || []).filter((f) => !!f.submitted_at);
  const avg = submitted.length
    ? submitted.reduce((s, f: any) => s + (f.average_score || 0), 0) / submitted.length
    : null;

  return {
    total: data?.length || 0,
    submitted: submitted.length,
    currentAverage: avg,
  };
}

// duplicate import removed above
import { CreateEvaluationInput } from "./client";

/**
 * Create a new evaluation from server components
 * This function should be called from server components
 */
export async function createEvaluation(evaluationData: CreateEvaluationInput) {
  const supabase = await createClient();

  // Generate unique form_id in format EVAL-YYYY-NNNN
  const now = new Date();
  const year = now.getFullYear();
  const randomNum = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  const form_id = `EVAL-${year}-${randomNum}`;

  const { data, error } = await supabase
    .from("evaluator_forms")
    .insert({
      form_id,
      call_report_id: evaluationData.call_report_id,
      evaluator_id: evaluationData.evaluator_id,
      target_writer: evaluationData.target_writer || null,
      per_ep_price_range: evaluationData.per_ep_price_range || null,
      genre: evaluationData.genre || null,
      slot: evaluationData.slot || null,
      big_idea: evaluationData.big_idea || null,
      theme: evaluationData.theme || null,
      premise_conflict_score: evaluationData.premise_conflict_score,
      storyline_plot_score: evaluationData.storyline_plot_score,
      episodic_progression_score: evaluationData.episodic_progression_score,
      characters_score: evaluationData.characters_score,
      overall_assessment_score: null, // deprecated
      comments: evaluationData.comments || null,
      first_2_eps_required: evaluationData.first_2_eps_required || null,
      decision: evaluationData.decision,
      decision_notes: evaluationData.decision_notes || null,
      submitted_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create evaluation: ${error.message}`);
  }

  return data;
}

/**
 * Get all evaluations for the evaluator dashboard
 * This function should be called from server components
 */
export async function getAllEvaluations() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("evaluator_forms")
    .select(`
      *,
      call_reports:call_report_id (
        working_title,
        writer_name,
        call_report_id
      ),
      evaluators:evaluator_id (
        name,
        email
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch evaluations: ${error.message}`);
  }

  return data;
}

/**
 * Get evaluations for a specific evaluator
 */
export async function getEvaluationsByEvaluator(evaluatorId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("evaluator_forms")
    .select(`
      *,
      call_reports:call_report_id (
        working_title,
        writer_name,
        call_report_id
      )
    `)
    .eq("evaluator_id", evaluatorId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch evaluations: ${error.message}`);
  }

  return data;
}

/**
 * Get a single evaluation by ID
 */
export async function getEvaluationById(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("evaluator_forms")
    .select(`
      *,
      call_reports:call_report_id (
        working_title,
        writer_name,
        call_report_id,
        logline,
        category,
        meeting_date,
        completed_evaluations,
        completed_internal_evaluations,
        required_internal_evaluators,
        current_average_score,
        evaluation_status
      ),
      evaluators:evaluator_id (
        name,
        email
      )
    `)
    .eq("id", id)
    .single();

  if (error) {
    throw new Error(`Failed to fetch evaluation: ${error.message}`);
  }

  return data;
}

/**
 * Get call reports that need evaluation
 * Returns call reports that are of type 'call_report' and haven't been evaluated by the current user
 */
export async function getCallReportsForEvaluation(evaluatorId: string) {
  const supabase = await createClient();

  // Get all call report IDs that this evaluator has already evaluated
  const { data: existingEvaluations } = await supabase
    .from("evaluator_forms")
    .select("call_report_id")
    .eq("evaluator_id", evaluatorId);

  const evaluatedIds = existingEvaluations?.map(e => e.call_report_id) || [];

  // Get call reports that haven't been evaluated by this user
  let query = supabase
    .from("call_reports")
    .select("*")
    .eq("meeting_type", "call_report")
    .order("meeting_date", { ascending: false });

  // Filter out already evaluated call reports
  if (evaluatedIds.length > 0) {
    query = query.not("id", "in", `(${evaluatedIds.join(",")})`);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch call reports: ${error.message}`);
  }

  return data;
}

/**
 * Get evaluations for a specific call report
 */
export async function getEvaluationsByCallReport(callReportId: string) {
  const supabase = await createClient();

  const { data, error} = await supabase
    .from("evaluator_forms")
    .select(`
      *,
      evaluators:evaluator_id (
        name,
        email
      )
    `)
    .eq("call_report_id", callReportId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch evaluations: ${error.message}`);
  }

  return data;
}

/**
 * Get aggregate evaluation data for a call report
 * Returns all evaluations with calculated overall average
 */
export async function getAggregateEvaluationForCallReport(callReportId: string) {
  const supabase = await createClient();

  // Fetch all evaluations for this call report
  const { data: evaluations, error } = await supabase
    .from("evaluator_forms")
    .select(`
      *,
      evaluators:evaluator_id (
        name,
        email
      )
    `)
    .eq("call_report_id", callReportId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch evaluations: ${error.message}`);
  }

  // Calculate overall average (average of all evaluator's average scores)
  let overallAverage = null;
  if (evaluations && evaluations.length > 0) {
    const totalAverages = evaluations.reduce((sum, evaluation) => sum + (evaluation.average_score || 0), 0);
    overallAverage = totalAverages / evaluations.length;
  }

  return {
    evaluations: evaluations || [],
    overallAverage
  };
}

/**\n * Check if current user has evaluated a specific call report\n */
export async function hasUserEvaluatedCallReport(userId: string, callReportId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("evaluator_forms")
    .select("id")
    .eq("evaluator_id", userId)
    .eq("call_report_id", callReportId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is "Results contain 0 rows"
    throw new Error(`Failed to check evaluation status: ${error.message}`);
  }

  return !!data; // Returns true if a record exists, false otherwise
}

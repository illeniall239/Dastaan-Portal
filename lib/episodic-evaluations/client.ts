import { createClient } from "@/lib/supabase/client";
import type { EpisodicEvaluation, EpisodicEvaluationWithDetails } from "@/types";

/**
 * Get all episodes available for evaluation
 * @returns Episodes that can be evaluated
 */
export async function getEpisodesForEvaluation() {
  const supabase = createClient();
  const { data: episodes, error } = await supabase
    .from("episodes")
    .select(`
      *,
      logged_by_user:users!logged_by(name, email),
      call_report:call_reports(working_title, writer_name),
      story:stories(title, status)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching episodes:", error);
    throw new Error("Failed to fetch episodes");
  }

  return episodes;
}

/**
 * Get all episodic evaluations by current evaluator
 * @returns Evaluator's episodic evaluations
 */
export async function getMyEpisodicEvaluations() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const { data: evaluations, error } = await supabase
    .from("episodic_evaluations")
    .select(`
      *,
      evaluator:users!evaluator_id(name, email),
      episode:episodes(
        *,
        call_report:call_reports(working_title, writer_name),
        story:stories(title, status)
      )
    `)
    .eq("evaluator_id", user.id)
    .order("submitted_at", { ascending: false });

  if (error) {
    console.error("Error fetching episodic evaluations:", error);
    throw new Error("Failed to fetch episodic evaluations");
  }

  return evaluations as EpisodicEvaluationWithDetails[];
}

/**
 * Check if current evaluator has already evaluated a specific episode
 * @param episodeId - Episode ID to check
 * @returns Existing evaluation if found, null otherwise
 */
export async function getEpisodicEvaluationForEpisode(episodeId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const { data: evaluation, error } = await supabase
    .from("episodic_evaluations")
    .select(`
      *,
      evaluator:users!evaluator_id(name, email),
      episode:episodes(
        *,
        call_report:call_reports(working_title, writer_name),
        story:stories(title, status)
      )
    `)
    .eq("episode_id", episodeId)
    .eq("evaluator_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Error fetching episodic evaluation:", error);
    throw new Error("Failed to fetch episodic evaluation");
  }

  return evaluation as EpisodicEvaluationWithDetails | null;
}

/**
 * Get a single episodic evaluation by ID
 * @param id - Evaluation ID
 * @returns Evaluation details
 */
export async function getEpisodicEvaluationById(id: string) {
  const supabase = createClient();
  const { data: evaluation, error } = await supabase
    .from("episodic_evaluations")
    .select(`
      *,
      evaluator:users!evaluator_id(name, email),
      episode:episodes(
        *,
        call_report:call_reports(working_title, writer_name),
        story:stories(title, status)
      )
    `)
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching episodic evaluation:", error);
    throw new Error("Failed to fetch episodic evaluation");
  }

  return evaluation as EpisodicEvaluationWithDetails;
}

/**
 * Create a new episodic evaluation
 * @param evaluationData - Evaluation data
 * @returns Created evaluation
 */
export async function createEpisodicEvaluation(
  evaluationData: Omit<EpisodicEvaluation, "id" | "evaluator_id" | "pages_score" | "scenes_score" | "overall_average" | "overall_grade" | "submitted_at" | "created_at" | "updated_at">
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const { data: evaluation, error } = await supabase
    .from("episodic_evaluations")
    .insert({
      ...evaluationData,
      evaluator_id: user.id,
    })
    .select(`
      *,
      evaluator:users!evaluator_id(name, email),
      episode:episodes(
        *,
        call_report:call_reports(working_title, writer_name),
        story:stories(title, status)
      )
    `)
    .single();

  if (error) {
    console.error("Error creating episodic evaluation:", error);
    throw new Error(error.message || "Failed to create episodic evaluation");
  }

  return evaluation as EpisodicEvaluationWithDetails;
}

/**
 * Delete an episodic evaluation (only if evaluator owns it)
 * @param id - Evaluation ID to delete
 */
export async function deleteEpisodicEvaluation(id: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("episodic_evaluations")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting episodic evaluation:", error);
    throw new Error("Failed to delete episodic evaluation");
  }
}

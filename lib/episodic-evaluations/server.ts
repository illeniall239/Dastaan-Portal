import { createClient } from "@/lib/supabase/server";
import type { EpisodicEvaluation, EpisodicEvaluationWithDetails } from "@/types";

/**
 * Get all episodes available for evaluation (server-side)
 * @returns Episodes that can be evaluated
 */
export async function getEpisodesForEvaluationServer() {
  const supabase = await createClient();

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
 * Get all episodic evaluations by a specific evaluator (server-side)
 * @param evaluatorId - Evaluator user ID
 * @returns Evaluator's episodic evaluations
 */
export async function getEpisodicEvaluationsByEvaluatorServer(evaluatorId: string) {
  const supabase = await createClient();

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
    .eq("evaluator_id", evaluatorId)
    .order("submitted_at", { ascending: false });

  if (error) {
    console.error("Error fetching episodic evaluations:", error);
    throw new Error("Failed to fetch episodic evaluations");
  }

  return evaluations as EpisodicEvaluationWithDetails[];
}

/**
 * Check if an evaluator has already evaluated a specific episode (server-side)
 * @param episodeId - Episode ID to check
 * @param evaluatorId - Evaluator user ID
 * @returns Existing evaluation if found, null otherwise
 */
export async function getEpisodicEvaluationForEpisodeServer(
  episodeId: string,
  evaluatorId: string
) {
  const supabase = await createClient();

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
    .eq("evaluator_id", evaluatorId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching episodic evaluation:", error);
    throw new Error("Failed to fetch episodic evaluation");
  }

  return evaluation as EpisodicEvaluationWithDetails | null;
}

/**
 * Get a single episodic evaluation by ID (server-side)
 * @param id - Evaluation ID
 * @returns Evaluation details
 */
export async function getEpisodicEvaluationByIdServer(id: string) {
  const supabase = await createClient();

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
 * Get all episodic evaluations for a specific episode (server-side)
 * @param episodeId - Episode ID
 * @returns All evaluations for the episode
 */
export async function getEpisodicEvaluationsForEpisodeServer(episodeId: string) {
  const supabase = await createClient();

  const { data: evaluations, error } = await supabase
    .from("episodic_evaluations")
    .select(`
      *,
      evaluator:users!evaluator_id(name, email)
    `)
    .eq("episode_id", episodeId)
    .order("submitted_at", { ascending: false });

  if (error) {
    console.error("Error fetching episodic evaluations:", error);
    throw new Error("Failed to fetch episodic evaluations");
  }

  return evaluations;
}

/**
 * Get episodic evaluation statistics for an episode (server-side)
 * @param episodeId - Episode ID
 * @returns Statistics (count, average scores, grade distribution)
 */
export async function getEpisodeEvaluationStatsServer(episodeId: string) {
  const supabase = await createClient();

  const { data: evaluations, error } = await supabase
    .from("episodic_evaluations")
    .select("overall_average, overall_grade")
    .eq("episode_id", episodeId);

  if (error) {
    console.error("Error fetching episode evaluation stats:", error);
    throw new Error("Failed to fetch episode evaluation statistics");
  }

  if (!evaluations || evaluations.length === 0) {
    return {
      total_evaluations: 0,
      average_score: null,
      grade_distribution: {},
    };
  }

  const totalEvaluations = evaluations.length;
  const averageScore =
    evaluations.reduce((sum, e) => sum + e.overall_average, 0) / totalEvaluations;

  const gradeDistribution = evaluations.reduce((acc, e) => {
    acc[e.overall_grade] = (acc[e.overall_grade] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    total_evaluations: totalEvaluations,
    average_score: Number(averageScore.toFixed(2)),
    grade_distribution: gradeDistribution,
  };
}

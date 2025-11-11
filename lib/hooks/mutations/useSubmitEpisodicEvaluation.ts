import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createEpisodicEvaluation } from "@/lib/episodic-evaluations/client";
import type { EpisodicEvaluation, EpisodicEvaluationWithDetails } from "@/types";

type CreateEpisodicEvaluationInput = Omit<
  EpisodicEvaluation,
  | "id"
  | "evaluator_id"
  | "pages_score"
  | "scenes_score"
  | "overall_average"
  | "overall_grade"
  | "submitted_at"
  | "created_at"
  | "updated_at"
>;

interface UseSubmitEpisodicEvaluationOptions {
  onSuccess?: (data: EpisodicEvaluationWithDetails) => void;
  onError?: (error: Error) => void;
}

/**
 * React Query mutation hook for submitting episodic evaluation forms
 *
 * Automatically invalidates related queries after successful submission:
 * - episodic-evaluations: Updates evaluator's episodic evaluation list
 * - evaluator-stats: Updates evaluator statistics
 * - episodes: Updates episode evaluation status
 *
 * @param options - Optional success/error callbacks
 *
 * @returns Mutation object with mutate function, loading state, and error
 *
 * @example
 * ```tsx
 * const submitEpisode = useSubmitEpisodicEvaluation({
 *   onSuccess: (data) => {
 *     toast.success("Episodic evaluation submitted successfully");
 *     router.push("/evaluator/my-evaluations");
 *   },
 *   onError: (error) => {
 *     toast.error(`Failed to submit: ${error.message}`);
 *   }
 * });
 *
 * // In form handler
 * const handleSubmit = (formData) => {
 *   submitEpisode.mutate({
 *     episode_id: episodeId,
 *     premise_conflict_score: 8,
 *     storyline_plot_score: 9,
 *     episodic_progression_score: 8,
 *     characters_score: 7,
 *     decision: "approve",
 *     ...formData
 *   });
 * };
 * ```
 */
export function useSubmitEpisodicEvaluation(
  options?: UseSubmitEpisodicEvaluationOptions
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateEpisodicEvaluationInput) =>
      createEpisodicEvaluation(data),

    onSuccess: (data) => {
      // Invalidate episodic evaluations list
      queryClient.invalidateQueries({ queryKey: ["episodic-evaluations"] });

      // Invalidate evaluator stats (total evaluations count changed)
      queryClient.invalidateQueries({ queryKey: ["evaluator-stats"] });

      // Invalidate episodes list (episode now has evaluation)
      queryClient.invalidateQueries({ queryKey: ["episodes"] });

      // Invalidate specific episode query
      queryClient.invalidateQueries({
        queryKey: ["episode", data.episode_id],
      });

      options?.onSuccess?.(data);
    },

    onError: (error: Error) => {
      console.error("Error submitting episodic evaluation:", error);
      options?.onError?.(error);
    },
  });
}
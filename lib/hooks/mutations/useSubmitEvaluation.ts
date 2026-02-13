import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createEvaluationClient,
  type CreateEvaluationInput,
  type Evaluation,
} from "@/lib/evaluations/client";

interface UseSubmitEvaluationOptions {
  onSuccess?: (data: Evaluation) => void;
  onError?: (error: Error) => void;
}

/**
 * React Query mutation hook for submitting a new evaluation
 *
 * Automatically invalidates related queries after successful submission:
 * - pending-evaluations: Updates the evaluator's pending task list
 * - evaluator-stats: Updates evaluator statistics
 * - notifications: New evaluation notifications
 *
 * @param options - Optional success/error callbacks
 *
 * @returns Mutation object with mutate function, loading state, and error
 *
 * @example
 * ```tsx
 * const submitEvaluation = useSubmitEvaluation({
 *   onSuccess: (data) => {
 *     toast.success(`Evaluation ${data.form_id} submitted successfully`);
 *     router.push("/evaluator/my-evaluations");
 *   },
 *   onError: (error) => {
 *     toast.error(`Failed to submit: ${error.message}`);
 *   }
 * });
 *
 * // In form handler
 * const handleSubmit = (formData) => {
 *   submitEvaluation.mutate({
 *     call_report_id: reportId,
 *     evaluator_id: user.id,
 *     conflict_of_content_score: 8,
 *     characterization_score: 7,
 *     story_progression_score: 9,
 *     whats_next_element_score: 8,
 *     decision: "approve",
 *     decision_notes: "Excellent premise",
 *     ...formData
 *   });
 * };
 * ```
 */
export function useSubmitEvaluation(options?: UseSubmitEvaluationOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateEvaluationInput) => createEvaluationClient(data),

    onSuccess: (data) => {
      // Invalidate pending evaluations for this evaluator
      queryClient.invalidateQueries({
        queryKey: ["pending-evaluations", data.evaluator_id],
      });

      // Invalidate evaluator stats (total evaluations count changed)
      queryClient.invalidateQueries({ queryKey: ["evaluator-stats"] });

      // Invalidate notifications (new evaluation notification created)
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({
        queryKey: ["notifications", "unread-count"],
      });

      options?.onSuccess?.(data);
    },

    onError: (error: Error) => {
      console.error("Error submitting evaluation:", error);
      options?.onError?.(error);
    },
  });
}

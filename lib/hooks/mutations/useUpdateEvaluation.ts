import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  updateEvaluationClient,
  type UpdateEvaluationInput,
  type Evaluation,
} from "@/lib/evaluations/client";

interface UseUpdateEvaluationOptions {
  onSuccess?: (data: Evaluation) => void;
  onError?: (error: Error) => void;
}

/**
 * React Query mutation hook for updating an existing evaluation
 *
 * Automatically invalidates related queries after successful update:
 * - evaluator-stats: Updates may affect statistics
 * - Individual evaluation cache
 *
 * @param options - Optional success/error callbacks
 *
 * @returns Mutation object with mutate function, loading state, and error
 *
 * @example
 * ```tsx
 * const updateEvaluation = useUpdateEvaluation({
 *   onSuccess: (data) => {
 *     toast.success("Evaluation updated successfully");
 *   },
 *   onError: (error) => {
 *     toast.error(`Failed to update: ${error.message}`);
 *   }
 * });
 *
 * // In form handler
 * const handleUpdate = (formData) => {
 *   updateEvaluation.mutate({
 *     id: evaluationId,
 *     premise_conflict_score: 9,
 *     decision: "approve",
 *     decision_notes: "Updated after review",
 *     ...formData
 *   });
 * };
 * ```
 */
export function useUpdateEvaluation(options?: UseUpdateEvaluationOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateEvaluationInput) => updateEvaluationClient(data),

    onSuccess: (data) => {
      // Invalidate evaluator stats (scores may have changed)
      queryClient.invalidateQueries({ queryKey: ["evaluator-stats"] });

      // Invalidate the specific evaluation query if it exists
      queryClient.invalidateQueries({ queryKey: ["evaluation", data.id] });

      // Invalidate pending evaluations (in case decision changed)
      queryClient.invalidateQueries({
        queryKey: ["pending-evaluations", data.evaluator_id],
      });

      options?.onSuccess?.(data);
    },

    onError: (error: Error) => {
      console.error("Error updating evaluation:", error);
      options?.onError?.(error);
    },
  });
}

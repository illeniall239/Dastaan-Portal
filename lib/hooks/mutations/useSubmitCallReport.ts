import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createMeetingClient, type CreateMeetingInput } from "@/lib/meetings/client";
import type { CallReport } from "@/types";

interface UseSubmitCallReportOptions {
  onSuccess?: (data: CallReport) => void;
  onError?: (error: Error) => void;
}

/**
 * React Query mutation hook for submitting call reports with cache invalidation
 *
 * Automatically invalidates call reports queries on success to trigger refetch
 *
 * @param options - Callbacks for success and error handling
 * @returns React Query mutation object with mutate, mutateAsync, status, etc.
 *
 * @example
 * ```tsx
 * const submitMutation = useSubmitCallReport({
 *   onSuccess: () => {
 *     toast.success("Call report submitted successfully!");
 *     router.push("/content-department/call-reports");
 *   },
 *   onError: (error) => {
 *     toast.error(`Failed to submit: ${error.message}`);
 *   }
 * });
 *
 * // In form submit handler
 * submitMutation.mutate(formData);
 * ```
 */
export function useSubmitCallReport(options?: UseSubmitCallReportOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMeetingInput) => createMeetingClient(data),

    onSuccess: (data) => {
      // Invalidate call reports queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: ["call-reports"] });

      // Invalidate dashboard stats that might include call report counts
      queryClient.invalidateQueries({ queryKey: ["dashboard", "stats"] });

      // Invalidate calendar queries if the call report has a meeting date
      queryClient.invalidateQueries({ queryKey: ["calendar"] });

      // Call custom success handler if provided
      options?.onSuccess?.(data);
    },

    onError: (error: Error) => {
      console.error("Error submitting call report:", error);

      // Call custom error handler if provided
      options?.onError?.(error);
    },
  });
}

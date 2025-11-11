import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createContractTermClient, type ContractTerm } from "@/lib/contract-terms/client";
import type { CreateContractTermFormData } from "@/lib/validations/contract-terms";

interface UseCreateContractTermsOptions {
  onSuccess?: (data: ContractTerm) => void;
  onError?: (error: Error) => void;
}

/**
 * React Query mutation hook for creating contract terms
 *
 * Automatically invalidates related queries after successful creation:
 * - dashboard-stats: Updates dashboard with new contract data
 * - contracts-list: Refreshes the contracts list view
 * - contract-detail: Updates specific contract page if currently viewing
 *
 * @param options - Optional success/error callbacks
 *
 * @returns Mutation object with mutate function, loading state, and error
 *
 * @example
 * ```tsx
 * const createContractTerms = useCreateContractTerms({
 *   onSuccess: (data) => {
 *     toast.success(`Contract terms created successfully`);
 *     router.push(`/contracts/${data.contract_id}`);
 *   },
 *   onError: (error) => {
 *     toast.error(`Failed to create contract terms: ${error.message}`);
 *   }
 * });
 *
 * // In form handler
 * const handleSubmit = (formData) => {
 *   createContractTerms.mutate({
 *     contract_id: contractId,
 *     payment_terms: "Net 30",
 *     delivery_schedule: "Quarterly",
 *     ...formData
 *   });
 * };
 * ```
 */
export function useCreateContractTerms(options?: UseCreateContractTermsOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateContractTermFormData) => {
      const result = await createContractTermClient(data);

      if (result.error) {
        throw result.error;
      }

      if (!result.data) {
        throw new Error("Failed to create contract terms");
      }

      return result.data;
    },

    onSuccess: (data) => {
      // Invalidate dashboard stats to update contract counts
      queryClient.invalidateQueries({ queryKey: ["dashboard", "stats"] });

      // Invalidate contract terms list queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ["contract-terms"] });

      // Invalidate specific contract term query if needed
      queryClient.invalidateQueries({ queryKey: ["contract-term", data.id] });

      // Invalidate approved stories (story status changed to in_negotiation)
      queryClient.invalidateQueries({ queryKey: ["approved-stories"] });

      options?.onSuccess?.(data);
    },

    onError: (error: Error) => {
      console.error("Error creating contract terms:", error);
      options?.onError?.(error);
    },
  });
}
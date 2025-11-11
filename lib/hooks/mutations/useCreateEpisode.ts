import { useMutation, useQueryClient } from "@tanstack/react-query";

interface EpisodeInput {
  title: string;
  description?: string;
  duration?: string;
  season_number: number;
  episode_number: number;
  writer_id: string;
  director_id?: string;
  status?: string;
  notes?: string;
}

interface Episode {
  id: string;
  episode_id: string;
  title: string;
  description?: string;
  duration?: string;
  season_number: number;
  episode_number: number;
  writer_id: string;
  director_id?: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface UseCreateEpisodeOptions {
  onSuccess?: (data: Episode) => void;
  onError?: (error: Error) => void;
}

/**
 * React Query mutation hook for creating new episodes
 *
 * Automatically invalidates related queries after successful creation:
 * - dashboard-stats: Updates dashboard counts
 * - episodes-list: Updates the episodes list view
 * - calendar: Updates calendar if episode has scheduling data
 *
 * @param options - Optional success/error callbacks
 *
 * @returns Mutation object with mutate function, loading state, and error
 *
 * @example
 * ```tsx
 * const createEpisode = useCreateEpisode({
 *   onSuccess: (data) => {
 *     toast.success(`Episode ${data.episode_number} created successfully`);
 *     router.push(`/episodes/${data.id}`);
 *   },
 *   onError: (error) => {
 *     toast.error(`Failed to create episode: ${error.message}`);
 *   }
 * });
 *
 * // In form handler
 * const handleSubmit = (formData) => {
 *   createEpisode.mutate({
 *     title: "Pilot Episode",
 *     season_number: 1,
 *     episode_number: 1,
 *     writer_id: "writer123",
 *     status: "planning",
 *     ...formData
 *   });
 * };
 * ```
 */
export function useCreateEpisode(options?: UseCreateEpisodeOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: EpisodeInput) => {
      const response = await fetch("/api/episodes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to create episode: ${response.status}`);
      }

      return await response.json();
    },

    onSuccess: (data) => {
      // Invalidate dashboard stats to update episode counts
      queryClient.invalidateQueries({ queryKey: ["dashboard", "stats"] });

      // Invalidate episodes list queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ["episodes"] });

      // Invalidate any calendar queries that might include episode data
      queryClient.invalidateQueries({ queryKey: ["calendar"] });

      options?.onSuccess?.(data);
    },

    onError: (error: Error) => {
      console.error("Error creating episode:", error);
      options?.onError?.(error);
    },
  });
}
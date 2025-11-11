import type { UpdateEpisodeFormData } from "@/lib/validations/episodes";

/**
 * Update an existing episode
 * Client-side function that calls the API endpoint
 */
export async function updateEpisodeClient(
  episodeId: string,
  data: UpdateEpisodeFormData
): Promise<any> {
  const response = await fetch(`/api/episodes/${episodeId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "Failed to update episode");
  }

  return result.episode;
}

/**
 * Get a single episode by ID
 * Client-side function that calls the API endpoint
 */
export async function getEpisodeClient(episodeId: string): Promise<any> {
  const response = await fetch(`/api/episodes/${episodeId}`);
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "Failed to fetch episode");
  }

  return result.episode;
}

import { createClient } from '@/lib/supabase/server';

export interface GenreArchiveData {
  genre: string;
  count: number;
}

/**
 * Get archived stories grouped by genre
 */
export async function getArchiveByGenre(): Promise<GenreArchiveData[]> {
  const supabase = await createClient();

  // Query archive table and join with stories to get genre information
  const { data: archiveData, error } = await supabase
    .from('archive')
    .select(`
      id,
      story:stories (
        genre
      )
    `);

  if (error) {
    console.error('Error fetching archive by genre:', error);
    return [];
  }

  // Group by genre and count
  const genreCounts: Record<string, number> = {};

  (archiveData || []).forEach((item: any) => {
    if (item.story?.genre) {
      const genre = item.story.genre;
      genreCounts[genre] = (genreCounts[genre] || 0) + 1;
    }
  });

  // Convert to array format with proper capitalization
  const genreLabels: Record<string, string> = {
    drama: 'Drama',
    comedy: 'Comedy',
    action: 'Action',
    thriller: 'Thriller',
    romance: 'Romance',
    horror: 'Horror',
    'sci-fi': 'Sci-Fi',
    fantasy: 'Fantasy',
    documentary: 'Documentary',
    other: 'Other',
  };

  const result = Object.entries(genreCounts).map(([genre, count]) => ({
    genre: genreLabels[genre] || genre,
    count,
  }));

  // Sort by count descending
  return result.sort((a, b) => b.count - a.count);
}

/**
 * Get total archived stories count
 */
export async function getTotalArchivedStories(): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from('archive')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('Error fetching archived stories count:', error);
    return 0;
  }

  return count || 0;
}

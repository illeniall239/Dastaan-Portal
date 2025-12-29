import { createAdminClient } from '@/lib/supabase/admin';

export interface IdeasByGenreData {
  genre: string;
  count: number;
}

/**
 * Get active ideas (call reports) grouped by genre
 * Excludes archived ideas
 */
export async function getIdeasByGenre(): Promise<IdeasByGenreData[]> {
  const supabase = createAdminClient();

  // Query call_reports table, filtering out archived ideas
  const { data: callReports, error } = await supabase
    .from('call_reports')
    .select('genre')
    .is('archived_at', null); // Only active ideas (not archived)

  if (error) {
    console.error('Error fetching ideas by genre:', error);
    return [];
  }

  // Group by genre and count
  const genreCounts: Record<string, number> = {};

  (callReports || []).forEach((report: any) => {
    const genre = report.genre;
    if (genre) {
      genreCounts[genre] = (genreCounts[genre] || 0) + 1;
    }
  });

  // Convert to array format with proper capitalization for known genres
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
    // Use predefined label if exists (case-insensitive match), otherwise use original value
    genre: genreLabels[genre.toLowerCase()] || genre,
    count,
  }));

  // Sort by count descending
  return result.sort((a, b) => b.count - a.count);
}

/**
 * Get total count of active ideas (call reports not archived)
 */
export async function getTotalActiveIdeas(): Promise<number> {
  const supabase = createAdminClient();

  const { count, error } = await supabase
    .from('call_reports')
    .select('*', { count: 'exact', head: true })
    .is('archived_at', null);

  if (error) {
    console.error('Error fetching total active ideas:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Get ideas breakdown by status
 */
export async function getIdeasByStatus() {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('call_reports')
    .select('status')
    .is('archived_at', null);

  if (error) {
    console.error('Error fetching ideas by status:', error);
    return {
      draft: 0,
      ready_for_evaluation: 0,
      in_review: 0,
    };
  }

  const statusCounts = {
    draft: 0,
    ready_for_evaluation: 0,
    in_review: 0,
  };

  (data || []).forEach((item: any) => {
    if (item.status && item.status in statusCounts) {
      statusCounts[item.status as keyof typeof statusCounts]++;
    }
  });

  return statusCounts;
}

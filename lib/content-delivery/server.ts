import { createClient } from '@/lib/supabase/server';
import type { ContentDeliveryItem, ContentDeliveryStats } from '@/types';
import type { PaginationParams } from '@/types/pagination';
import { applyPagination } from '@/lib/utils/pagination';

/**
 * Filters for content delivery queries
 */
export interface ContentDeliveryFilters {
  search?: string;
  genre?: string;
  status?: string;
  contractType?: string;
  timeSlot?: string;
}

/**
 * Get all content delivery items (projects with episode tracking) - DEPRECATED
 * Use getContentDeliveryItemsPaginated instead for better performance
 * @deprecated
 */
export async function getContentDeliveryItems(): Promise<ContentDeliveryItem[]> {
  const result = await getContentDeliveryItemsPaginated({
    page: 1,
    limit: 1000,
    sortBy: 'created_at',
    sortOrder: 'desc'
  });
  return result.items;
}

/**
 * Get content delivery items with pagination and filtering
 * Queries contract terms that have been agreed upon and joins with stories and episodes
 */
export async function getContentDeliveryItemsPaginated(
  paginationParams: Required<PaginationParams>,
  filters?: ContentDeliveryFilters
): Promise<{ items: ContentDeliveryItem[]; count: number }> {
  const supabase = await createClient();

  try {
    // Build base query
    let query = supabase
      .from('negotiations')
      .select(`
        id,
        negotiation_id,
        story_id,
        writer_producer_name,
        genre,
        contract_type,
        suggested_time_slot,
        estimated_episodes,
        project_start_date,
        expected_completion_date,
        status,
        agreed_price,
        currency,
        created_at,
        stories!inner (
          id,
          story_id,
          title
        )
      `, { count: 'exact' })
      .eq('status', 'agreed');

    // Apply filters at database level (much more efficient)
    if (filters?.genre && filters.genre !== 'all') {
      query = query.ilike('genre', filters.genre);
    }
    if (filters?.status && filters.status !== 'all') {
      query = query.ilike('status', filters.status);
    }
    if (filters?.contractType && filters.contractType !== 'all') {
      query = query.ilike('contract_type', filters.contractType);
    }
    if (filters?.timeSlot && filters.timeSlot !== 'all') {
      query = query.ilike('suggested_time_slot', filters.timeSlot);
    }
    if (filters?.search) {
      // Search across multiple fields using OR
      query = query.or(`negotiation_id.ilike.%${filters.search}%,writer_producer_name.ilike.%${filters.search}%,stories.title.ilike.%${filters.search}%,stories.story_id.ilike.%${filters.search}%`);
    }

    // Apply pagination and sorting
    query = applyPagination(query, paginationParams);

    const { data: contractTerms, error, count } = await query;

    if (error) {
      console.error('Error fetching contract terms:', error);
      return { items: [], count: 0 };
    }

    if (!contractTerms || contractTerms.length === 0) {
      return { items: [], count: count || 0 };
    }

    // Get story IDs for episode counting
    const storyIds = contractTerms.map(n => (n.stories as any)?.id).filter(Boolean);

    // Fetch all call reports for these stories
    const { data: callReports } = await supabase
      .from('call_reports')
      .select('id, story_id')
      .in('story_id', storyIds);

    const callReportIds = callReports?.map(cr => cr.id) || [];

    // Fetch episodes count grouped by call_report_id
    const { data: episodes } = await supabase
      .from('episodes')
      .select('id, call_report_id')
      .in('call_report_id', callReportIds);

    // Create a map of story_id to episode count
    const episodeCountByStory: Record<string, number> = {};

    if (episodes && callReports) {
      // Build a map of call_report_id to story_id
      const callReportToStory: Record<string, string> = {};
      callReports.forEach(cr => {
        callReportToStory[cr.id] = cr.story_id;
      });

      // Count episodes per story
      episodes.forEach(ep => {
        const storyId = callReportToStory[ep.call_report_id];
        if (storyId) {
          episodeCountByStory[storyId] = (episodeCountByStory[storyId] || 0) + 1;
        }
      });
    }

    // Transform to content delivery items
    const contentDeliveryItems: ContentDeliveryItem[] = contractTerms.map(contractTerm => {
      const story = contractTerm.stories as any;
      const storyId = story?.id || '';
      const episodesReceived = episodeCountByStory[storyId] || 0;
      const totalEpisodes = contractTerm.estimated_episodes || 0;
      const episodesDue = Math.max(0, totalEpisodes - episodesReceived);
      const completionPercentage = totalEpisodes > 0
        ? Math.round((episodesReceived / totalEpisodes) * 100)
        : 0;

      // Calculate days active
      const startDate = contractTerm.project_start_date
        ? new Date(contractTerm.project_start_date)
        : new Date(contractTerm.created_at);
      const now = new Date();
      const daysActive = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

      return {
        id: contractTerm.id,
        negotiation_id: contractTerm.negotiation_id,
        story_id: story?.story_id || '',
        project_name: story?.title || 'Untitled',
        writer_name: contractTerm.writer_producer_name || 'Unknown',
        genre: contractTerm.genre || 'Unknown',
        contract_type: contractTerm.contract_type || 'Unknown',
        time_slot: contractTerm.suggested_time_slot || null,
        total_episodes: totalEpisodes,
        episodes_received: episodesReceived,
        episodes_due: episodesDue,
        completion_percentage: completionPercentage,
        project_start_date: contractTerm.project_start_date || null,
        expected_completion_date: contractTerm.expected_completion_date || null,
        status: contractTerm.status,
        days_active: daysActive,
        agreed_price: contractTerm.agreed_price || null,
        currency: contractTerm.currency || null,
        created_at: contractTerm.created_at,
      };
    });

    return { items: contentDeliveryItems, count: count || 0 };
  } catch (error) {
    console.error('Error in getContentDeliveryItemsPaginated:', error);
    return { items: [], count: 0 };
  }
}

/**
 * Get content delivery statistics
 */
export async function getContentDeliveryStats(): Promise<ContentDeliveryStats> {
  const items = await getContentDeliveryItems();

  const totalProjects = items.length;
  const totalEpisodesExpected = items.reduce((sum, item) => sum + item.total_episodes, 0);
  const totalEpisodesReceived = items.reduce((sum, item) => sum + item.episodes_received, 0);
  const averageCompletion = totalEpisodesExpected > 0
    ? Math.round((totalEpisodesReceived / totalEpisodesExpected) * 100)
    : 0;

  // Calculate total agreed value and average
  const totalAgreedValue = items.reduce((sum, item) => sum + (item.agreed_price || 0), 0);
  const itemsWithPrice = items.filter(item => item.agreed_price !== null);
  const averageAgreedPrice = itemsWithPrice.length > 0
    ? totalAgreedValue / itemsWithPrice.length
    : 0;

  return {
    total_projects: totalProjects,
    total_episodes_expected: totalEpisodesExpected,
    total_episodes_received: totalEpisodesReceived,
    average_completion: averageCompletion,
    total_agreed_value: totalAgreedValue,
    average_agreed_price: averageAgreedPrice,
  };
}

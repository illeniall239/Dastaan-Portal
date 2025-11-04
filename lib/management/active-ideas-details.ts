import { createClient } from '@/lib/supabase/server';

export interface ActiveIdeaDetail {
  id: string;
  call_report_id: string;
  working_title: string;
  writer_name: string;
  genre: string;
  category: string;
  status: string;
  meeting_date: string;
  days_active: number;
  logline: string | null;
  created_at: string;
}

/**
 * Get active call reports (ideas) by genre
 * These are call reports that haven't been archived yet
 */
export async function getActiveIdeasByGenre(genre?: string): Promise<ActiveIdeaDetail[]> {
  const supabase = await createClient();

  try {
    let query = supabase
      .from('call_reports')
      .select(`
        id,
        call_report_id,
        working_title,
        writer_name,
        genre,
        category,
        status,
        meeting_date,
        logline,
        created_at
      `)
      .is('archived_at', null)
      .order('created_at', { ascending: false });

    // Filter by genre if provided
    if (genre && genre !== 'all') {
      query = query.eq('genre', genre);
    }

    const { data: callReports, error } = await query;

    if (error) {
      console.error('Error fetching active ideas:', error);
      return [];
    }

    const now = new Date();

    return (callReports || []).map((report: any) => {
      const createdAt = new Date(report.created_at);
      const daysActive = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

      return {
        id: report.id,
        call_report_id: report.call_report_id,
        working_title: report.working_title,
        writer_name: report.writer_name,
        genre: report.genre || 'Unspecified',
        category: report.category || 'N/A',
        status: report.status || 'draft',
        meeting_date: report.meeting_date,
        days_active: daysActive,
        logline: report.logline,
        created_at: report.created_at,
      };
    });
  } catch (error) {
    console.error('Error fetching active ideas:', error);
    return [];
  }
}

/**
 * Get statistics for active ideas
 */
export async function getActiveIdeasStats(genre?: string) {
  const ideas = await getActiveIdeasByGenre(genre);

  const byStatus: Record<string, number> = {};
  const byCategory: Record<string, number> = {};

  ideas.forEach(idea => {
    byStatus[idea.status] = (byStatus[idea.status] || 0) + 1;
    byCategory[idea.category] = (byCategory[idea.category] || 0) + 1;
  });

  // Calculate average days active
  const avgDaysActive = ideas.length > 0
    ? Math.round(ideas.reduce((sum, idea) => sum + idea.days_active, 0) / ideas.length)
    : 0;

  return {
    total: ideas.length,
    byStatus,
    byCategory,
    avgDaysActive,
  };
}

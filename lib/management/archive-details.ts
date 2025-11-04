import { createClient } from '@/lib/supabase/server';

export interface ArchiveDetail {
  id: string;
  type: 'story_archive' | 'call_report_rejection';
  title: string;
  writer_name: string;
  genre: string;
  rejection_reason: string;
  rejection_date: string;
  days_in_system: number | null;
  average_score?: number;
  rejection_stage?: string;
  category?: string;
}

/**
 * Get archived stories by genre from the archive table
 */
export async function getArchiveStoriesByGenre(genre?: string): Promise<ArchiveDetail[]> {
  const supabase = await createClient();

  try {
    let query = supabase
      .from('archive')
      .select(`
        id,
        archive_id,
        rejection_stage,
        rejection_date,
        rejection_reason,
        rejection_category,
        time_in_system_days,
        archived_at,
        rejected_by_user:users!archive_rejected_by_fkey(name),
        story:stories!archive_story_id_fkey(
          title,
          writer_originator_name,
          genre,
          category
        )
      `)
      .order('archived_at', { ascending: false });

    // Filter by genre if provided
    if (genre && genre !== 'all') {
      query = query.eq('story.genre', genre);
    }

    const { data: archives, error } = await query;

    if (error) {
      console.error('Error fetching archive stories:', error);
      return [];
    }

    return (archives || []).map((archive: any) => ({
      id: archive.archive_id || archive.id,
      type: 'story_archive' as const,
      title: archive.story?.title || 'Untitled',
      writer_name: archive.story?.writer_originator_name || 'Unknown',
      genre: archive.story?.genre || 'Unspecified',
      rejection_reason: archive.rejection_reason,
      rejection_date: archive.rejection_date || archive.archived_at,
      days_in_system: archive.time_in_system_days,
      rejection_stage: archive.rejection_stage,
      category: archive.story?.category,
    }));
  } catch (error) {
    console.error('Error fetching archive stories:', error);
    return [];
  }
}

/**
 * Get rejected call reports by genre from rejected_archive table
 * Note: rejected_archive doesn't have a direct genre field, need to join or infer
 */
export async function getRejectedCallReportsByGenre(genre?: string): Promise<ArchiveDetail[]> {
  const supabase = await createClient();

  try {
    // Note: rejected_archive table doesn't have a genre field in the schema
    // We'll fetch all and filter if needed, or you may need to add genre to the table
    let query = supabase
      .from('rejected_archive')
      .select(`
        id,
        call_report_id,
        working_title,
        writer_name,
        category,
        average_score,
        total_evaluations,
        rejection_reason,
        archived_at,
        original_created_at
      `)
      .order('archived_at', { ascending: false });

    const { data: rejectedReports, error } = await query;

    if (error) {
      console.error('Error fetching rejected call reports:', error);
      return [];
    }

    // Calculate days in system for rejected call reports
    return (rejectedReports || []).map((report: any) => {
      const createdAt = new Date(report.original_created_at);
      const archivedAt = new Date(report.archived_at);
      const daysInSystem = Math.floor(
        (archivedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        id: report.call_report_id || report.id,
        type: 'call_report_rejection' as const,
        title: report.working_title,
        writer_name: report.writer_name,
        genre: 'N/A', // rejected_archive doesn't have genre field
        rejection_reason: report.rejection_reason || `Low evaluation score: ${report.average_score}`,
        rejection_date: report.archived_at,
        days_in_system: daysInSystem,
        average_score: report.average_score,
        category: report.category,
      };
    });
  } catch (error) {
    console.error('Error fetching rejected call reports:', error);
    return [];
  }
}

/**
 * Get combined archive details (both story archives and rejected call reports)
 * Optionally filter by genre
 */
export async function getCombinedArchiveDetails(genre?: string): Promise<ArchiveDetail[]> {
  const [storyArchives, rejectedReports] = await Promise.all([
    getArchiveStoriesByGenre(genre),
    getRejectedCallReportsByGenre(genre),
  ]);

  // Combine both arrays
  const combined = [...storyArchives, ...rejectedReports];

  // Filter by genre if specified (for rejected reports which don't have genre in DB)
  const filtered = genre && genre !== 'all'
    ? combined.filter(item => {
        // For story archives, genre is already filtered in query
        // For call report rejections, we can't filter by genre as it's not in the table
        return item.type === 'story_archive' || item.genre === 'N/A';
      })
    : combined;

  // Sort by rejection date (most recent first)
  return filtered.sort((a, b) =>
    new Date(b.rejection_date).getTime() - new Date(a.rejection_date).getTime()
  );
}

/**
 * Get archive details stats
 */
export async function getArchiveDetailsStats(genre?: string) {
  const details = await getCombinedArchiveDetails(genre);

  const storyArchiveCount = details.filter(d => d.type === 'story_archive').length;
  const callReportRejectionCount = details.filter(d => d.type === 'call_report_rejection').length;

  // Average days in system
  const validDays = details.filter(d => d.days_in_system !== null).map(d => d.days_in_system!);
  const avgDaysInSystem = validDays.length > 0
    ? Math.round(validDays.reduce((sum, days) => sum + days, 0) / validDays.length)
    : 0;

  // Count by rejection stage
  const byStage: Record<string, number> = {};
  details.forEach(detail => {
    if (detail.rejection_stage) {
      byStage[detail.rejection_stage] = (byStage[detail.rejection_stage] || 0) + 1;
    } else if (detail.type === 'call_report_rejection') {
      byStage['evaluation'] = (byStage['evaluation'] || 0) + 1;
    }
  });

  return {
    total: details.length,
    storyArchiveCount,
    callReportRejectionCount,
    avgDaysInSystem,
    byStage,
  };
}

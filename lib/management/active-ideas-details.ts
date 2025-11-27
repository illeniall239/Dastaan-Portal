import { createClient } from '@/lib/supabase/server';

export interface EvaluatorScores {
  nadeem?: number | null;
  salman?: number | null;
  imran?: number | null;
  [key: string]: number | null | undefined; // Allow dynamic evaluator names
}

export interface ActiveIdeaDetail {
  id: string;
  call_report_id: string;
  working_title: string;
  writer_name: string;
  writer_names: string[]; // All writers from call_report_writers table
  director: string | null;
  genre: string[];
  category: string;
  status: string;
  meeting_date: string;
  days_active: number;
  logline: string | null;
  created_at: string;
  overall_rating: number | null;
  slot: string | null;
  content_type: string | null;
  theme: string | null;
  average_score: number | null;
  evaluation_deadline: string | null;
  total_episodes: number | null;
  received_episodes: number | null;
  completion_percentage: number | null;
  evaluator_scores: EvaluatorScores | null;
}

/**
 * Get active call reports (ideas) by genre
 * These are call reports that haven't been archived yet
 * @param genre - Optional genre filter
 * @param teamId - Optional team_id for team isolation
 * @param userRole - Optional user role for global access check
 */
export async function getActiveIdeasByGenre(
  genre?: string,
  teamId?: string | null,
  userRole?: string | null
): Promise<ActiveIdeaDetail[]> {
  const supabase = await createClient();

  try {
    const hasGlobalAccess = userRole && ['admin', 'management'].includes(userRole);

    let query = supabase
      .from('call_reports')
      .select(`
        id,
        call_report_id,
        working_title,
        writer_name,
        director,
        genre,
        category,
        status,
        meeting_date,
        logline,
        created_at,
        overall_rating,
        slot,
        content_type,
        theme,
        average_score,
        evaluation_deadline,
        total_episodes,
        received_episodes,
        completion_percentage,
        team_id
      `)
      .is('archived_at', null)
      .order('created_at', { ascending: false});

    // TEAM ISOLATION: Apply filter unless admin/management
    if (!hasGlobalAccess && teamId) {
      query = query.eq('team_id', teamId);
    }

    // Filter by genre if provided (genre is now an array)
    if (genre && genre !== 'all') {
      query = query.contains('genre', [genre]);
    }

    const { data: callReports, error } = await query;

    if (error) {
      console.error('Error fetching active ideas:', error);
      return [];
    }

    // Fetch all evaluator scores for these call reports
    const callReportIds = (callReports || []).map((r: any) => r.id);
    const { data: evaluatorScoresData } = callReportIds.length > 0
      ? await supabase
          .from('evaluator_scores')
          .select('call_report_id, evaluator_name, score')
          .in('call_report_id', callReportIds)
      : { data: [] };

    // Fetch all writers for these call reports from call_report_writers junction table
    const { data: callReportWritersData } = callReportIds.length > 0
      ? await supabase
          .from('call_report_writers')
          .select('call_report_id, writers(id, name)')
          .in('call_report_id', callReportIds)
      : { data: [] };

    // Group writers by call_report_id
    const writersByCallReport: Record<string, string[]> = {};
    (callReportWritersData || []).forEach((crw: any) => {
      if (!writersByCallReport[crw.call_report_id]) {
        writersByCallReport[crw.call_report_id] = [];
      }
      if (crw.writers?.name) {
        writersByCallReport[crw.call_report_id].push(crw.writers.name);
      }
    });

    // Group evaluator scores by call_report_id
    const scoresByCallReport: Record<string, EvaluatorScores> = {};
    (evaluatorScoresData || []).forEach((score: any) => {
      if (!scoresByCallReport[score.call_report_id]) {
        scoresByCallReport[score.call_report_id] = {};
      }
      const evaluatorKey = score.evaluator_name.toLowerCase();
      scoresByCallReport[score.call_report_id][evaluatorKey] = score.score;
    });

    const now = new Date();

    return (callReports || []).map((report: any) => {
      const createdAt = new Date(report.created_at);
      const daysActive = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

      // Get writers from junction table, fallback to writer_name if none found
      const writersFromJunction = writersByCallReport[report.id] || [];
      const writerNames = writersFromJunction.length > 0
        ? writersFromJunction
        : (report.writer_name ? [report.writer_name] : []);

      return {
        id: report.id,
        call_report_id: report.call_report_id,
        working_title: report.working_title,
        writer_name: report.writer_name,
        writer_names: writerNames,
        director: report.director,
        genre: Array.isArray(report.genre) ? report.genre : (report.genre ? [report.genre] : ['Other']),
        category: report.category || 'N/A',
        status: report.status || 'draft',
        meeting_date: report.meeting_date,
        days_active: daysActive,
        logline: report.logline,
        created_at: report.created_at,
        overall_rating: report.overall_rating,
        slot: report.slot,
        content_type: report.content_type,
        theme: report.theme,
        average_score: report.average_score,
        evaluation_deadline: report.evaluation_deadline,
        total_episodes: report.total_episodes,
        received_episodes: report.received_episodes,
        completion_percentage: report.completion_percentage,
        evaluator_scores: scoresByCallReport[report.id] || null,
      };
    });
  } catch (error) {
    console.error('Error fetching active ideas:', error);
    return [];
  }
}

/**
 * Get statistics for active ideas
 * @param genre - Optional genre filter
 * @param teamId - Optional team_id for team isolation
 * @param userRole - Optional user role for global access check
 */
export async function getActiveIdeasStats(
  genre?: string,
  teamId?: string | null,
  userRole?: string | null
) {
  const ideas = await getActiveIdeasByGenre(genre, teamId, userRole);

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

/**
 * Get active ideas with full details
 * Returns all details needed for the What's Cooking dashboard
 * @param genre - Optional genre filter
 * @param teamId - Optional team_id for team isolation
 * @param userRole - Optional user role for global access check
 */
export async function getActiveIdeasDetails(
  genre?: string,
  teamId?: string | null,
  userRole?: string | null
) {
  const details = await getActiveIdeasByGenre(genre, teamId, userRole);

  return {
    details,
    total: details.length,
  };
}

/**
 * Episode and production metrics for management dashboard
 */
export interface EpisodeMetrics {
  totalEpisodesPlanned: number;
  totalEpisodesReceived: number;
  overallCompletionPercentage: number;
  projectsNotStarted: number;      // 0% completion
  projectsInProgress: number;      // 1-99% completion
  projectsComplete: number;        // 100% completion
  totalProjects: number;
}

/**
 * Writer productivity metrics
 */
export interface WriterProductivity {
  writerName: string;
  projectCount: number;
  totalEpisodesAssigned: number;
  episodesDelivered: number;
  completionRate: number;
}

/**
 * Get episode-based metrics for management dashboard
 */
export function calculateEpisodeMetrics(ideas: ActiveIdeaDetail[]): EpisodeMetrics {
  let totalEpisodesPlanned = 0;
  let totalEpisodesReceived = 0;
  let projectsNotStarted = 0;
  let projectsInProgress = 0;
  let projectsComplete = 0;

  ideas.forEach(idea => {
    const planned = idea.total_episodes || 0;
    const received = idea.received_episodes || 0;

    totalEpisodesPlanned += planned;
    totalEpisodesReceived += received;

    // Calculate completion status
    if (planned === 0) {
      // No episodes planned yet, count as not started
      projectsNotStarted++;
    } else {
      const completion = (received / planned) * 100;
      if (completion === 0) {
        projectsNotStarted++;
      } else if (completion >= 100) {
        projectsComplete++;
      } else {
        projectsInProgress++;
      }
    }
  });

  const overallCompletionPercentage = totalEpisodesPlanned > 0
    ? Math.round((totalEpisodesReceived / totalEpisodesPlanned) * 100)
    : 0;

  return {
    totalEpisodesPlanned,
    totalEpisodesReceived,
    overallCompletionPercentage,
    projectsNotStarted,
    projectsInProgress,
    projectsComplete,
    totalProjects: ideas.length,
  };
}

/**
 * Get writer productivity metrics
 */
export function calculateWriterProductivity(ideas: ActiveIdeaDetail[]): WriterProductivity[] {
  const writerMap = new Map<string, {
    projectCount: number;
    totalEpisodesAssigned: number;
    episodesDelivered: number;
  }>();

  ideas.forEach(idea => {
    // Use writer_names array (can have multiple writers per project)
    const writers = idea.writer_names.length > 0
      ? idea.writer_names
      : (idea.writer_name ? [idea.writer_name] : []);

    writers.forEach(writerName => {
      if (!writerName) return;

      const existing = writerMap.get(writerName) || {
        projectCount: 0,
        totalEpisodesAssigned: 0,
        episodesDelivered: 0,
      };

      existing.projectCount++;
      existing.totalEpisodesAssigned += idea.total_episodes || 0;
      existing.episodesDelivered += idea.received_episodes || 0;

      writerMap.set(writerName, existing);
    });
  });

  // Convert to array and calculate completion rates
  const result: WriterProductivity[] = [];
  writerMap.forEach((data, writerName) => {
    result.push({
      writerName,
      projectCount: data.projectCount,
      totalEpisodesAssigned: data.totalEpisodesAssigned,
      episodesDelivered: data.episodesDelivered,
      completionRate: data.totalEpisodesAssigned > 0
        ? Math.round((data.episodesDelivered / data.totalEpisodesAssigned) * 100)
        : 0,
    });
  });

  // Sort by project count descending
  return result.sort((a, b) => b.projectCount - a.projectCount);
}

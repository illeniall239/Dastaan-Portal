import { createAdminClient } from '@/lib/supabase/admin';
import { handleError } from '@/lib/errors';

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
  average_initial_assessment?: number | null;
  assessment_count?: number;
  slot: string | null;
  content_type: string | null;
  theme: string | null;
  average_score: number | null;
  evaluation_deadline: string | null;
  total_episodes: number | null;
  received_episodes: number | null;
  completion_percentage: number | null;
  evaluator_scores: EvaluatorScores | null;
  management_member_name: string | null;
  idea_by: string | null;
  developed_by: string | null;
  person_in_charge: string | null;
  one_liner_approved: string | null; // "approved" | "rejected" | "needs_improvement" | "pending" | null
  one_liner_summary: string | null;
  approval_count?: number | null;
  rejection_count?: number | null;
  needs_improvement_count?: number | null;
  total_evaluators?: number | null;
  remarks: string | null;
  // Episode Aging (from consolidated_cms_view)
  actual_received_episodes: number | null;
  first_episode_received_at: string | null;
  last_episode_received_at: string | null;
  revised_episode_count: number | null;
  monthly_episode_receipts: Record<string, number> | null;
  days_since_first_episode: number | null;
  days_since_last_episode: number | null;
  // Episode Approval Counts (from consolidated_cms_view)
  approved_episode_count?: number | null;
  rejected_episode_count?: number | null;
  needs_revision_episode_count?: number | null;
  // Aggregated Team Scores (from consolidated_cms_view)
  content_conflict?: number | null;
  content_characters?: number | null;
  content_progression?: number | null;
  content_freezes?: number | null;
  content_whats_next?: number | null;
  content_overall?: number | null;
  programming_conflict?: number | null;
  programming_characters?: number | null;
  programming_progression?: number | null;
  programming_freezes?: number | null;
  programming_whats_next?: number | null;
  programming_overall?: number | null;
  content_dev_conflict?: number | null;
  content_dev_characters?: number | null;
  content_dev_progression?: number | null;
  content_dev_freezes?: number | null;
  content_dev_whats_next?: number | null;
  content_dev_overall?: number | null;
  management_conflict?: number | null;
  management_characters?: number | null;
  management_progression?: number | null;
  management_freezes?: number | null;
  management_whats_next?: number | null;
  management_overall?: number | null;
  // Per-group evaluator counts
  content_eval_count?: number | null;
  programming_eval_count?: number | null;
  content_dev_eval_count?: number | null;
  management_eval_count?: number | null;
  // Descriptive evaluation completeness
  has_theme_category?: boolean;
  has_audience_focus?: boolean;
  has_no_of_tracks?: boolean;
  has_closing_remarks?: boolean;
  has_themes_of_drama?: boolean;
  // Team
  team_id?: string | null;
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
  const supabase = createAdminClient();

  try {
    const hasGlobalAccess = userRole && ['admin', 'management'].includes(userRole);

    let query = supabase
      .from('consolidated_cms_view')
      .select('*')
      .order('created_at', { ascending: false });

    // TEAM ISOLATION: Apply filter unless admin/management/programmer
    if (!hasGlobalAccess && teamId) {
      query = query.eq('team_id', teamId);
    }

    // Filter by genre if provided
    if (genre && genre !== 'all') {
      query = query.contains('genre', [genre]);
    }

    const { data: results, error } = await query;

    if (error) {
      return handleError(error, {
        context: 'getActiveIdeasByGenre',
        fallbackValue: [],
        userMessage: 'Unable to load active ideas',
        metadata: { genre, teamId, userRole },
      });
    }

    // Fetch descriptive evaluation completeness per call report
    const descMap = new Map<string, any>();
    const { data: rawEvals } = await supabase
      .from('evaluator_forms')
      .select('call_report_id, theme_category, audience_focus, no_of_tracks, closing_remarks, themes_of_drama')
      .not('submitted_at', 'is', null);

    if (rawEvals) {
      const grouped = new Map<string, any[]>();
      for (const row of rawEvals) {
        const list = grouped.get(row.call_report_id) || [];
        list.push(row);
        grouped.set(row.call_report_id, list);
      }
      for (const [crId, rows] of grouped) {
        descMap.set(crId, {
          has_theme_category: rows.some((r: any) => r.theme_category != null),
          has_audience_focus: rows.some((r: any) => r.audience_focus != null),
          has_no_of_tracks: rows.some((r: any) => r.no_of_tracks != null),
          has_closing_remarks: rows.some((r: any) => r.closing_remarks != null && r.closing_remarks !== ''),
          has_themes_of_drama: rows.some((r: any) => r.themes_of_drama != null && Array.isArray(r.themes_of_drama) && r.themes_of_drama.length > 0),
        });
      }
    }

    const now = new Date();

    const msPerDay = 1000 * 60 * 60 * 24;

    return (results || []).map((report: any) => {
      const createdAt = new Date(report.created_at);
      const daysActive = Math.floor((now.getTime() - createdAt.getTime()) / msPerDay);

      const firstEpDate = report.first_episode_received_at ? new Date(report.first_episode_received_at) : null;
      const lastEpDate = report.last_episode_received_at ? new Date(report.last_episode_received_at) : null;

      const desc = descMap.get(report.id);

      return {
        ...report,
        days_active: daysActive,
        days_since_first_episode: firstEpDate ? Math.floor((now.getTime() - firstEpDate.getTime()) / msPerDay) : null,
        days_since_last_episode: lastEpDate ? Math.floor((now.getTime() - lastEpDate.getTime()) / msPerDay) : null,
        writer_names: report.writer_name ? [report.writer_name] : [],
        genre: Array.isArray(report.genre) ? report.genre : (report.genre ? [report.genre] : ['Other']),
        evaluator_scores: null, // Aggregated scores are top-level
        has_theme_category: desc?.has_theme_category ?? false,
        has_audience_focus: desc?.has_audience_focus ?? false,
        has_no_of_tracks: desc?.has_no_of_tracks ?? false,
        has_closing_remarks: desc?.has_closing_remarks ?? false,
        has_themes_of_drama: desc?.has_themes_of_drama ?? false,
      };
    });
  } catch (error) {
    return handleError(error, {
      context: 'getActiveIdeasByGenre',
      fallbackValue: [],
      userMessage: 'Unable to load active ideas',
      metadata: { genre, teamId, userRole },
    });
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

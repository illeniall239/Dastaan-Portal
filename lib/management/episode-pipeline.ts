import { createClient } from '@/lib/supabase/server';

export interface DramaWithEpisodes {
  callReportId: string;
  workingTitle: string;
  totalEpisodes: number;
  evaluatedEpisodes: number;
  pendingEpisodes: number;
}

export interface EpisodeWithProgress {
  episodeId: string;
  episodeNumber: number;
  totalEvaluators: number;
  completedEvaluators: number;
  pendingEvaluators: number;
  progressPercentage: number;
  status: 'completed' | 'in_progress' | 'pending';
}

export interface EvaluatorDetail {
  evaluatorId: string;
  evaluatorName: string;
  status: 'completed' | 'pending';
  overallScore?: number;
  grade?: string;
  evaluatedAt?: string;
}

/**
 * Get all dramas with their episode counts
 */
export async function getDramasWithEpisodes(): Promise<DramaWithEpisodes[]> {
  const supabase = await createClient();

  // Get call reports with episodes
  const { data: callReports, error } = await supabase
    .from('call_reports')
    .select(`
      id,
      working_title,
      episodes (
        id,
        episode_number,
        episodic_evaluations (
          id,
          evaluator_id
        )
      )
    `)
    .eq('meeting_type', 'call_report')
    .not('working_title', 'is', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching dramas with episodes:', error);
    return [];
  }

  const dramasWithEpisodes: DramaWithEpisodes[] = (callReports || [])
    .filter((report: any) => report.episodes && report.episodes.length > 0)
    .map((report: any) => {
      const episodes = report.episodes || [];
      const totalEpisodes = episodes.length;

      // Count evaluated episodes (episodes with at least one evaluation)
      const evaluatedEpisodes = episodes.filter((ep: any) =>
        ep.episodic_evaluations && ep.episodic_evaluations.length > 0
      ).length;

      const pendingEpisodes = totalEpisodes - evaluatedEpisodes;

      return {
        callReportId: report.id,
        workingTitle: report.working_title,
        totalEpisodes,
        evaluatedEpisodes,
        pendingEpisodes,
      };
    });

  return dramasWithEpisodes;
}

/**
 * Get episodes for a specific call report/drama
 */
export async function getEpisodesForDrama(callReportId: string): Promise<EpisodeWithProgress[]> {
  const supabase = await createClient();

  // Get episodes for this call report
  const { data: episodes, error } = await supabase
    .from('episodes')
    .select(`
      id,
      episode_number,
      episodic_evaluations (
        id,
        evaluator_id
      )
    `)
    .or(`call_report_id.eq.${callReportId},story_id.in.(select id from stories where call_report_id = '${callReportId}')`)
    .order('episode_number', { ascending: true });

  if (error) {
    console.error('Error fetching episodes for drama:', error);
    return [];
  }

  // Get total evaluator count (all evaluators in the system)
  const { count: totalEvaluators } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'evaluator');

  const episodesWithProgress: EpisodeWithProgress[] = (episodes || []).map((episode: any) => {
    const evaluations = episode.episodic_evaluations || [];
    const completedEvaluators = evaluations.length;
    const pendingEvaluators = (totalEvaluators || 0) - completedEvaluators;
    const progressPercentage = totalEvaluators
      ? Math.round((completedEvaluators / totalEvaluators) * 100)
      : 0;

    let status: 'completed' | 'in_progress' | 'pending';
    if (completedEvaluators === 0) {
      status = 'pending';
    } else if (completedEvaluators < (totalEvaluators || 0)) {
      status = 'in_progress';
    } else {
      status = 'completed';
    }

    return {
      episodeId: episode.id,
      episodeNumber: episode.episode_number,
      totalEvaluators: totalEvaluators || 0,
      completedEvaluators,
      pendingEvaluators,
      progressPercentage,
      status,
    };
  });

  return episodesWithProgress;
}

/**
 * OPTIMIZED: Get all episodes and evaluator details for multiple dramas in batch
 * Replaces the N+1 query pattern with efficient batch queries
 */
export async function getAllEpisodesAndEvaluatorsBatch(
  dramaIds: string[]
): Promise<{
  episodesByDrama: Record<string, EpisodeWithProgress[]>;
  evaluatorsByEpisode: Record<string, { completed: EvaluatorDetail[]; pending: EvaluatorDetail[] }>;
}> {
  if (dramaIds.length === 0) {
    return { episodesByDrama: {}, evaluatorsByEpisode: {} };
  }

  const supabase = await createClient();

  // Fetch all episodes for all dramas in ONE query
  const { data: allEpisodes } = await supabase
    .from('episodes')
    .select(`
      id,
      episode_number,
      call_report_id,
      story_id,
      episodic_evaluations (
        id,
        evaluator_id,
        overall_score,
        grade,
        created_at,
        events
      )
    `)
    .or(dramaIds.map(id => `call_report_id.eq.${id}`).join(','))
    .order('episode_number', { ascending: true });

  // Get all evaluators in ONE query
  const { data: allEvaluators } = await supabase
    .from('users')
    .select('id, name')
    .eq('role', 'evaluator')
    .order('name', { ascending: true });

  const totalEvaluators = allEvaluators?.length || 0;
  const episodesByDrama: Record<string, EpisodeWithProgress[]> = {};
  const evaluatorsByEpisode: Record<string, { completed: EvaluatorDetail[]; pending: EvaluatorDetail[] }> = {};

  // Group episodes by drama
  dramaIds.forEach(dramaId => {
    episodesByDrama[dramaId] = [];
  });

  // Process all episodes
  (allEpisodes || []).forEach((episode: any) => {
    const dramaId = episode.call_report_id;
    if (!dramaId) return;

    const evaluations = episode.episodic_evaluations || [];
    const completedEvaluators = evaluations.length;
    const pendingEvaluators = totalEvaluators - completedEvaluators;
    const progressPercentage = totalEvaluators
      ? Math.round((completedEvaluators / totalEvaluators) * 100)
      : 0;

    let status: 'completed' | 'in_progress' | 'pending';
    if (completedEvaluators === 0) {
      status = 'pending';
    } else if (completedEvaluators < totalEvaluators) {
      status = 'in_progress';
    } else {
      status = 'completed';
    }

    // Add to episodesByDrama
    episodesByDrama[dramaId].push({
      episodeId: episode.id,
      episodeNumber: episode.episode_number,
      totalEvaluators,
      completedEvaluators,
      pendingEvaluators,
      progressPercentage,
      status,
    });

    // Build evaluatorsByEpisode
    const evaluationMap = new Map(
      evaluations.map((ev: any) => [
        ev.evaluator_id,
        {
          overallScore: ev.overall_score,
          grade: ev.grade,
          evaluatedAt: ev.created_at,
        }
      ])
    );

    const completed: EvaluatorDetail[] = [];
    const pending: EvaluatorDetail[] = [];

    (allEvaluators || []).forEach((evaluator: any) => {
      const evaluation = evaluationMap.get(evaluator.id) as any;

      if (evaluation) {
        completed.push({
          evaluatorId: evaluator.id,
          evaluatorName: evaluator.name,
          status: 'completed',
          overallScore: evaluation.overallScore,
          grade: evaluation.grade,
          evaluatedAt: evaluation.evaluatedAt,
        });
      } else {
        pending.push({
          evaluatorId: evaluator.id,
          evaluatorName: evaluator.name,
          status: 'pending',
        });
      }
    });

    evaluatorsByEpisode[episode.id] = { completed, pending };
  });

  return { episodesByDrama, evaluatorsByEpisode };
}

/**
 * Get evaluator details for a specific episode
 */
export async function getEvaluatorDetailsForEpisode(episodeId: string): Promise<{
  completed: EvaluatorDetail[];
  pending: EvaluatorDetail[];
}> {
  const supabase = await createClient();

  // Get all evaluators
  const { data: allEvaluators } = await supabase
    .from('users')
    .select('id, name')
    .eq('role', 'evaluator')
    .order('name', { ascending: true });

  // Get evaluations for this episode
  const { data: evaluations } = await supabase
    .from('episodic_evaluations')
    .select(`
      id,
      evaluator_id,
      overall_score,
      grade,
      created_at,
      events,
      evaluator:users!episodic_evaluations_evaluator_id_fkey (
        id,
        name
      )
    `)
    .eq('episode_id', episodeId);

  const evaluationMap = new Map(
    (evaluations || []).map((ev: any) => [
      ev.evaluator_id,
      {
        overallScore: ev.overall_score,
        grade: ev.grade,
        evaluatedAt: ev.created_at,
      }
    ])
  );

  const completed: EvaluatorDetail[] = [];
  const pending: EvaluatorDetail[] = [];

  (allEvaluators || []).forEach((evaluator: any) => {
    const evaluation = evaluationMap.get(evaluator.id) as any;

    if (evaluation) {
      completed.push({
        evaluatorId: evaluator.id,
        evaluatorName: evaluator.name,
        status: 'completed',
        overallScore: evaluation.overallScore,
        grade: evaluation.grade,
        evaluatedAt: evaluation.evaluatedAt,
      });
    } else {
      pending.push({
        evaluatorId: evaluator.id,
        evaluatorName: evaluator.name,
        status: 'pending',
      });
    }
  });

  return { completed, pending };
}

/**
 * Get event analysis data for a drama (call report)
 * Returns individual event objects with their impact levels per episode
 */
export interface EventDetail {
  id: string;
  title: string;
  description: string;
  impact: 'High Impact' | 'Medium Impact' | 'Low Impact';
  evaluatorName: string;
}

export interface EventAnalysisData {
  episodeNumber: number;
  totalEvents: number;
  events: EventDetail[];
}

export async function getEventAnalysisForDrama(callReportId: string): Promise<EventAnalysisData[]> {
  const supabase = await createClient();

  // Get all episodes for this drama with their evaluations and evaluator info
  const { data: episodes, error } = await supabase
    .from('episodes')
    .select(`
      id,
      episode_number,
      episodic_evaluations (
        id,
        events,
        evaluator_id,
        evaluator:users!episodic_evaluations_evaluator_id_fkey (
          name
        )
      )
    `)
    .eq('call_report_id', callReportId)
    .order('episode_number', { ascending: true });

  if (error) {
    console.error('Error fetching event analysis data:', error);
    return [];
  }

  if (!episodes || episodes.length === 0) {
    return [];
  }

  // Process each episode
  const analysisData: EventAnalysisData[] = episodes.map((episode: any) => {
    const evaluations = episode.episodic_evaluations || [];
    const allEvents: EventDetail[] = [];

    // Collect all events from all evaluators
    evaluations.forEach((evaluation: any) => {
      const events = evaluation.events || [];
      const evaluatorName = evaluation.evaluator?.name || 'Unknown Evaluator';

      events.forEach((event: any, index: number) => {
        // Only process events with impact (new format)
        if (typeof event === 'object' && event.impact && event.title) {
          allEvents.push({
            id: `${evaluation.id}-event-${index}`,
            title: event.title,
            description: event.description || '',
            impact: event.impact as 'High Impact' | 'Medium Impact' | 'Low Impact',
            evaluatorName,
          });
        }
      });
    });

    return {
      episodeNumber: episode.episode_number,
      totalEvents: allEvents.length,
      events: allEvents,
    };
  });

  return analysisData;
}

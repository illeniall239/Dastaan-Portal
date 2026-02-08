import { createAdminClient } from '@/lib/supabase/admin';
import { cachedQuery, CacheTags } from '@/lib/cache/request-cache';
import { handleError } from '@/lib/errors';

export interface DramaWithEpisodes {
  callReportId: string;
  workingTitle: string;
  totalEpisodes: number;
  receivedEpisodes: number;   // Episodes uploaded/created
  evaluatedEpisodes: number;  // Episodes with evaluations
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
 * OPTIMIZED: Get dramas with their episodes and evaluator details in a single parallel operation
 * CACHED: Uses Next.js request memoization with 5-minute revalidation
 */
export async function getDramasWithEpisodesAndDetails(): Promise<{
  dramas: DramaWithEpisodes[];
  episodesByDrama: Record<string, EpisodeWithProgress[]>;
  evaluatorsByEpisode: Record<string, { completed: EvaluatorDetail[]; pending: EvaluatorDetail[] }>;
}> {
  return cachedQuery(
    async () => {
      const dramas = await getDramasWithEpisodes();
      const dramaIds = dramas.map(d => d.callReportId);

      if (dramaIds.length === 0) {
        return { dramas, episodesByDrama: {}, evaluatorsByEpisode: {} };
      }

      const { episodesByDrama, evaluatorsByEpisode } = await getAllEpisodesAndEvaluatorsBatch(dramaIds);
      return { dramas, episodesByDrama, evaluatorsByEpisode };
    },
    ['dramas-episodes-details'],
    {
      revalidate: 300,
      tags: [CacheTags.EPISODE_PIPELINE]
    }
  )();
}

/**
 * Get all dramas with their episode counts
 */
export async function getDramasWithEpisodes(): Promise<DramaWithEpisodes[]> {
  const supabase = createAdminClient();

  // Step 1: Fetch call reports with planned episode count
  const { data: callReports, error: callReportsError } = await supabase
    .from('call_reports')
    .select('id, working_title, total_episodes')
    .eq('meeting_type', 'call_report')
    .not('working_title', 'is', null)
    .order('created_at', { ascending: false });

  if (callReportsError) {
    return handleError(callReportsError, {
      context: 'getDramasWithEpisodes',
      fallbackValue: [],
      userMessage: 'Failed to fetch dramas list',
    });
  }

  if (!callReports || callReports.length === 0) {
    return [];
  }

  const callReportIds = callReports.map(cr => cr.id);

  // Step 2: Fetch ALL episodes for these call reports
  const { data: episodes, error: episodesError } = await supabase
    .from('episodes')
    .select('id, episode_number, call_report_id')
    .in('call_report_id', callReportIds);

  // Step 3: Fetch ALL evaluations separately to avoid nested query issues
  const { data: allEvaluations } = await supabase
    .from('episodic_evaluations')
    .select('id, episode_id');

  // Build a set of episode IDs that have evaluations
  const episodeHasEvaluations = new Set(
    (allEvaluations || []).map((ev: any) => ev.episode_id)
  );

  // Step 4: Count episodes by call_report_id
  const episodeDataByCallReport: Record<string, {
    received: number;
    evaluated: number;
  }> = {};

  (episodes || []).forEach((ep: any) => {
    if (ep.call_report_id) {
      if (!episodeDataByCallReport[ep.call_report_id]) {
        episodeDataByCallReport[ep.call_report_id] = {
          received: 0,
          evaluated: 0,
        };
      }
      // Count received episodes
      episodeDataByCallReport[ep.call_report_id].received++;

      // Count evaluated episodes (episodes with at least one evaluation)
      if (episodeHasEvaluations.has(ep.id)) {
        episodeDataByCallReport[ep.call_report_id].evaluated++;
      }
    }
  });

  // Step 5: Map call reports with planned vs evaluated counts
  const dramasWithEpisodes: DramaWithEpisodes[] = callReports
    .filter((report: any) => {
      // Show dramas that have received episodes
      const data = episodeDataByCallReport[report.id];
      return data && data.received > 0;
    })
    .map((report: any) => {
      const data = episodeDataByCallReport[report.id];
      const plannedCount = report.total_episodes || 0;
      const evaluatedCount = data?.evaluated || 0;
      const receivedCount = data?.received || 0;
      const pendingEpisodes = Math.max(0, plannedCount - evaluatedCount);

      return {
        callReportId: report.id,
        workingTitle: report.working_title,
        totalEpisodes: plannedCount,           // Planned episodes
        receivedEpisodes: receivedCount,       // Episodes uploaded/created
        evaluatedEpisodes: evaluatedCount,     // Episodes with evaluations
        pendingEpisodes,
      };
    });

  return dramasWithEpisodes;
}

/**
 * Get episodes for a specific call report/drama
 */
export async function getEpisodesForDrama(callReportId: string): Promise<EpisodeWithProgress[]> {
  const supabase = createAdminClient();

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
    return handleError(error, {
      context: 'getEpisodesForDrama',
      fallbackValue: [],
      userMessage: 'Failed to fetch episodes for drama',
      metadata: { callReportId },
    });
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

  const supabase = createAdminClient();

  // Query 1: Fetch episodes WITHOUT nested evaluations
  const { data: allEpisodes, error: episodesError } = await supabase
    .from('episodes')
    .select('id, episode_number, call_report_id')
    .in('call_report_id', dramaIds)
    .order('episode_number', { ascending: true });

  if (episodesError) {
    // Error fetching episodes - return empty results
  }

  const episodeIds = allEpisodes?.map(e => e.id) || [];

  // Query 2: OPTIMIZED - Fetch evaluations in chunks to avoid URL length limits
  // Chunk size of 100 episode IDs is safe for .in() queries
  const CHUNK_SIZE = 100;
  const allEvaluations = [];

  for (let i = 0; i < episodeIds.length; i += CHUNK_SIZE) {
    const chunk = episodeIds.slice(i, i + CHUNK_SIZE);
    const { data, error } = await supabase
      .from('episodic_evaluations')
      .select('id, episode_id, evaluator_id, overall_average, overall_grade, created_at, events')
      .in('episode_id', chunk);

    if (!error && data) {
      allEvaluations.push(...data);
    }
  }

  // Query 3: Get all evaluators
  const { data: allEvaluators } = await supabase
    .from('users')
    .select('id, name')
    .eq('role', 'evaluator')
    .order('name', { ascending: true });

  const totalEvaluators = allEvaluators?.length || 0;

  // Build evaluation map: episode_id -> evaluation[]
  const evaluationsByEpisodeMap: Record<string, any[]> = {};
  (allEvaluations || []).forEach((evaluation: any) => {
    if (!evaluationsByEpisodeMap[evaluation.episode_id]) {
      evaluationsByEpisodeMap[evaluation.episode_id] = [];
    }
    evaluationsByEpisodeMap[evaluation.episode_id].push(evaluation);
  });

  const episodesByDrama: Record<string, EpisodeWithProgress[]> = {};
  const evaluatorsByEpisode: Record<string, { completed: EvaluatorDetail[]; pending: EvaluatorDetail[] }> = {};

  // Group episodes by drama
  dramaIds.forEach(dramaId => {
    episodesByDrama[dramaId] = [];
  });

  // Process all episodes
  (allEpisodes || []).forEach((episode: any) => {
    const dramaId = episode.call_report_id;

    if (!dramaId || !episodesByDrama[dramaId]) {
      return;
    }

    // Get evaluations for this episode from the map
    const evaluations = evaluationsByEpisodeMap[episode.id] || [];
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
          overallScore: ev.overall_average,
          grade: ev.overall_grade,
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
  const supabase = createAdminClient();

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
      overall_average,
      overall_grade,
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
        overallScore: ev.overall_average,
        grade: ev.overall_grade,
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
  const supabase = createAdminClient();

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
    return handleError(error, {
      context: 'getEventAnalysisForDrama',
      fallbackValue: [],
      userMessage: 'Failed to fetch event analysis data',
      metadata: { callReportId },
    });
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

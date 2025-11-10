/**
 * Episode Pipeline Service
 *
 * Handles analytics for episodic evaluation pipeline.
 * Tracks evaluation progress across dramas and episodes with evaluator details.
 *
 * Usage:
 * ```typescript
 * const service = new EpisodePipelineService('server');
 * const dramas = await service.getDramasWithEpisodes();
 * const episodes = await service.getEpisodesForDrama(callReportId);
 * const evaluators = await service.getEvaluatorDetailsForEpisode(episodeId);
 * ```
 */

import {
  CallReportRepository,
  EpisodeRepository,
  EpisodicEvaluationRepository,
  UserRepository,
  type RepositoryContextType,
} from '@/lib/repositories';
import { BaseAnalyticsService } from './base-analytics-service';
import { logger } from '@/lib/logger';

/**
 * Drama with episodes overview
 */
export interface DramaWithEpisodes {
  callReportId: string;
  workingTitle: string;
  totalEpisodes: number;
  evaluatedEpisodes: number;
  pendingEpisodes: number;
}

/**
 * Episode with evaluation progress
 */
export interface EpisodeWithProgress {
  episodeId: string;
  episodeNumber: number;
  totalEvaluators: number;
  completedEvaluators: number;
  pendingEvaluators: number;
  progressPercentage: number;
  status: 'completed' | 'in_progress' | 'pending';
}

/**
 * Evaluator detail with completion status
 */
export interface EvaluatorDetail {
  evaluatorId: string;
  evaluatorName: string;
  status: 'completed' | 'pending';
  overallScore?: number;
  grade?: string;
  evaluatedAt?: string;
}

/**
 * Event detail from episodic evaluation
 */
export interface EventDetail {
  id: string;
  title: string;
  description: string;
  impact: 'High Impact' | 'Medium Impact' | 'Low Impact';
  evaluatorName: string;
}

/**
 * Event analysis data per episode
 */
export interface EventAnalysisData {
  episodeNumber: number;
  totalEvents: number;
  events: EventDetail[];
}

/**
 * Episode pipeline service
 * Provides detailed tracking of episodic evaluation workflow
 */
export class EpisodePipelineService extends BaseAnalyticsService {
  private callReportRepo: CallReportRepository;
  private episodeRepo: EpisodeRepository;
  private episodicEvalRepo: EpisodicEvaluationRepository;
  private userRepo: UserRepository;

  constructor(context: RepositoryContextType = 'server') {
    super();
    this.callReportRepo = new CallReportRepository(context);
    this.episodeRepo = new EpisodeRepository(context);
    this.episodicEvalRepo = new EpisodicEvaluationRepository(context);
    this.userRepo = new UserRepository(context);
  }

  /**
   * Get all dramas with their episode counts
   * Includes total, evaluated, and pending episode counts
   *
   * @returns Array of dramas with episode statistics
   */
  async getDramasWithEpisodes(): Promise<DramaWithEpisodes[]> {
    try {
      logger.info('Getting dramas with episodes');

      return await this.withCache(
        'analytics:dramas-with-episodes',
        async () => {
          // Get call reports with episodes
          const callReports = await this.callReportRepo.findAll({
            select: `
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
            `,
            filters: {
              meeting_type: 'call_report',
              working_title: { not: null },
            },
            order: { column: 'created_at', ascending: false },
          });

          // Filter and transform call reports to dramas with episodes
          const dramasWithEpisodes: DramaWithEpisodes[] = callReports
            .filter((report: any) => report.episodes && report.episodes.length > 0)
            .map((report: any) => {
              const episodes = report.episodes || [];
              const totalEpisodes = episodes.length;

              // Count evaluated episodes (episodes with at least one evaluation)
              const evaluatedEpisodes = episodes.filter(
                (ep: any) => ep.episodic_evaluations && ep.episodic_evaluations.length > 0
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

          logger.info(`Found ${dramasWithEpisodes.length} dramas with episodes`);
          return dramasWithEpisodes;
        },
        300 // 5 minute cache
      );
    } catch (error) {
      this.handleError(error, 'get dramas with episodes');
    }
  }

  /**
   * Get episodes for a specific call report/drama
   * Includes evaluator progress for each episode
   *
   * @param callReportId - Call report ID
   * @returns Array of episodes with progress
   */
  async getEpisodesForDrama(callReportId: string): Promise<EpisodeWithProgress[]> {
    try {
      logger.info(`Getting episodes for drama: ${callReportId}`);

      return await this.withCache(
        `analytics:episodes-for-drama:${callReportId}`,
        async () => {
          // Get episodes for this call report
          const episodes = await this.episodeRepo.findAll({
            select: `
              id,
              episode_number,
              episodic_evaluations (
                id,
                evaluator_id
              )
            `,
            filters: {
              call_report_id: callReportId,
            },
            order: { column: 'episode_number', ascending: true },
          });

          // Get total evaluator count
          const evaluators = await this.userRepo.findByRole('evaluator');
          const totalEvaluators = evaluators.length;

          // Transform episodes with progress
          const episodesWithProgress: EpisodeWithProgress[] = episodes.map((episode: any) => {
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

            return {
              episodeId: episode.id,
              episodeNumber: episode.episode_number,
              totalEvaluators,
              completedEvaluators,
              pendingEvaluators,
              progressPercentage,
              status,
            };
          });

          logger.info(
            `Found ${episodesWithProgress.length} episodes for drama ${callReportId}`
          );
          return episodesWithProgress;
        },
        300 // 5 minute cache
      );
    } catch (error) {
      this.handleError(error, `get episodes for drama (${callReportId})`);
    }
  }

  /**
   * OPTIMIZED: Get all episodes and evaluator details for multiple dramas in batch
   * Replaces the N+1 query pattern with efficient batch queries
   *
   * @param dramaIds - Array of call report IDs
   * @returns Episodes grouped by drama and evaluators grouped by episode
   */
  async getAllEpisodesAndEvaluatorsBatch(dramaIds: string[]): Promise<{
    episodesByDrama: Record<string, EpisodeWithProgress[]>;
    evaluatorsByEpisode: Record<string, { completed: EvaluatorDetail[]; pending: EvaluatorDetail[] }>;
  }> {
    try {
      logger.info(`Getting episodes and evaluators for ${dramaIds.length} dramas (batch)`);

      if (dramaIds.length === 0) {
        return { episodesByDrama: {}, evaluatorsByEpisode: {} };
      }

      return await this.withCache(
        `analytics:episodes-evaluators-batch:${dramaIds.join(',')}`,
        async () => {
          // Fetch all episodes for all dramas in ONE query
          const allEpisodes = await this.episodeRepo.findAll({
            select: `
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
            `,
            filters: {
              call_report_id: dramaIds,
            },
            order: { column: 'episode_number', ascending: true },
          });

          // Get all evaluators in ONE query
          const allEvaluators = await this.userRepo.findByRole('evaluator', {
            select: 'id, name',
            order: { column: 'name', ascending: true },
          });

          const totalEvaluators = allEvaluators.length;
          const episodesByDrama: Record<string, EpisodeWithProgress[]> = {};
          const evaluatorsByEpisode: Record<
            string,
            { completed: EvaluatorDetail[]; pending: EvaluatorDetail[] }
          > = {};

          // Initialize episodesByDrama for each drama
          dramaIds.forEach((dramaId) => {
            episodesByDrama[dramaId] = [];
          });

          // Process all episodes
          allEpisodes.forEach((episode: any) => {
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
            const evaluationMap = new Map<string, { overallScore: number; grade: string; evaluatedAt: string }>(
              evaluations.map((ev: any) => [
                ev.evaluator_id,
                {
                  overallScore: ev.overall_score,
                  grade: ev.grade,
                  evaluatedAt: ev.created_at,
                },
              ])
            );

            const completed: EvaluatorDetail[] = [];
            const pending: EvaluatorDetail[] = [];

            allEvaluators.forEach((evaluator: any) => {
              const evaluation = evaluationMap.get(evaluator.id);

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

          logger.info(
            `Batch processed ${allEpisodes.length} episodes across ${dramaIds.length} dramas`
          );

          return { episodesByDrama, evaluatorsByEpisode };
        },
        300 // 5 minute cache
      );
    } catch (error) {
      this.handleError(error, `get episodes and evaluators batch`);
    }
  }

  /**
   * Get evaluator details for a specific episode
   * Shows which evaluators have completed and which are pending
   *
   * @param episodeId - Episode ID
   * @returns Completed and pending evaluators
   */
  async getEvaluatorDetailsForEpisode(episodeId: string): Promise<{
    completed: EvaluatorDetail[];
    pending: EvaluatorDetail[];
  }> {
    try {
      logger.info(`Getting evaluator details for episode: ${episodeId}`);

      return await this.withCache(
        `analytics:evaluator-details:${episodeId}`,
        async () => {
          // Get all evaluators
          const allEvaluators = await this.userRepo.findByRole('evaluator', {
            select: 'id, name',
            order: { column: 'name', ascending: true },
          });

          // Get evaluations for this episode
          const evaluations = await this.episodicEvalRepo.findAll({
            select: `
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
            `,
            filters: {
              episode_id: episodeId,
            },
          });

          // Build evaluation map
          const evaluationMap = new Map<string, { overallScore: number; grade: string; evaluatedAt: string }>(
            evaluations.map((ev: any) => [
              ev.evaluator_id,
              {
                overallScore: ev.overall_score,
                grade: ev.grade,
                evaluatedAt: ev.created_at,
              },
            ])
          );

          const completed: EvaluatorDetail[] = [];
          const pending: EvaluatorDetail[] = [];

          // Categorize evaluators
          allEvaluators.forEach((evaluator: any) => {
            const evaluation = evaluationMap.get(evaluator.id);

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

          logger.info(
            `Episode ${episodeId}: ${completed.length} completed, ${pending.length} pending evaluators`
          );

          return { completed, pending };
        },
        300 // 5 minute cache
      );
    } catch (error) {
      this.handleError(error, `get evaluator details for episode (${episodeId})`);
    }
  }

  /**
   * Get event analysis data for a drama (call report)
   * Returns individual event objects with their impact levels per episode
   *
   * @param callReportId - Call report ID
   * @returns Event analysis data grouped by episode
   */
  async getEventAnalysisForDrama(callReportId: string): Promise<EventAnalysisData[]> {
    try {
      logger.info(`Getting event analysis for drama: ${callReportId}`);

      return await this.withCache(
        `analytics:event-analysis:${callReportId}`,
        async () => {
          // Get all episodes for this drama with their evaluations and evaluator info
          const episodes = await this.episodeRepo.findAll({
            select: `
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
            `,
            filters: {
              call_report_id: callReportId,
            },
            order: { column: 'episode_number', ascending: true },
          });

          if (episodes.length === 0) {
            logger.info(`No episodes found for drama ${callReportId}`);
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

          logger.info(
            `Event analysis for drama ${callReportId}: ${analysisData.length} episodes analyzed`
          );

          return analysisData;
        },
        300 // 5 minute cache
      );
    } catch (error) {
      this.handleError(error, `get event analysis for drama (${callReportId})`);
    }
  }

  /**
   * Get overall pipeline statistics
   * Summary of all dramas, episodes, and evaluation progress
   *
   * @returns Pipeline statistics
   */
  async getPipelineOverview(): Promise<{
    totalDramas: number;
    totalEpisodes: number;
    totalEvaluations: number;
    avgProgressPercentage: number;
    dramasWithAllEpisodesEvaluated: number;
  }> {
    try {
      logger.info('Getting pipeline overview');

      return await this.withCache(
        'analytics:pipeline-overview',
        async () => {
          const dramas = await this.getDramasWithEpisodes();

          const totalDramas = dramas.length;
          const totalEpisodes = dramas.reduce((sum, d) => sum + d.totalEpisodes, 0);
          const dramasWithAllEpisodesEvaluated = dramas.filter(
            (d) => d.pendingEpisodes === 0 && d.totalEpisodes > 0
          ).length;

          // Get all evaluations count
          const allEvaluations = await this.episodicEvalRepo.findAll({
            select: 'id',
          });
          const totalEvaluations = allEvaluations.length;

          // Calculate average progress
          const avgProgressPercentage =
            totalEpisodes > 0
              ? Math.round(
                  (dramas.reduce((sum, d) => sum + d.evaluatedEpisodes, 0) / totalEpisodes) * 100
                )
              : 0;

          logger.info(
            `Pipeline overview: ${totalDramas} dramas, ${totalEpisodes} episodes, ${totalEvaluations} evaluations`
          );

          return {
            totalDramas,
            totalEpisodes,
            totalEvaluations,
            avgProgressPercentage,
            dramasWithAllEpisodesEvaluated,
          };
        },
        300 // 5 minute cache
      );
    } catch (error) {
      this.handleError(error, 'get pipeline overview');
    }
  }

  /**
   * Invalidate cache when episode pipeline data changes
   */
  async invalidateEpisodePipelineCache(): Promise<void> {
    await this.invalidateCache('analytics:dramas-with-episodes');
    await this.invalidateCache('analytics:pipeline-overview');
    // Note: Drama and episode-specific cache keys would need to be tracked separately
    logger.info('Episode pipeline cache invalidated');
  }
}

/**
 * Helper function to create an EpisodePipelineService instance
 */
export function createEpisodePipelineService(
  context: RepositoryContextType = 'server'
): EpisodePipelineService {
  return new EpisodePipelineService(context);
}

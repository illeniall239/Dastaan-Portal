/**
 * Pipeline Analytics Service
 *
 * Handles analytics for pipeline stages, flow tracking, and bottleneck detection.
 * Provides comprehensive overview of story progress through workflow stages.
 *
 * Usage:
 * ```typescript
 * const service = new PipelineAnalyticsService('server');
 * const overview = await service.getPipelineOverview();
 * const stageDetails = await service.getStageDetails('in_evaluation');
 * ```
 */

import { StoryRepository, type RepositoryContextType } from '@/lib/repositories';
import { BaseAnalyticsService, TimeUtils, StatsUtils } from './base-analytics-service';
import { logger } from '@/lib/logger';

/**
 * Pipeline stage data structure
 */
export interface PipelineStageData {
  stage: string;
  displayName: string;
  count: number;
  avgTimeInStage: number; // in days
  conversionRate: number; // percentage moving to next stage
  bottleneck: boolean;
}

/**
 * Pipeline overview data structure
 */
export interface PipelineOverview {
  totalStories: number;
  activePipeline: number;
  completedThisMonth: number;
  avgTimeToCompletion: number;
  stages: PipelineStageData[];
}

/**
 * Stage details with story information
 */
export interface StageDetailedStory {
  id: string;
  story_id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
  creator_name: string;
  creator_email: string;
  days_in_stage: number;
}

/**
 * Pipeline flow data for Sankey/flow diagrams
 */
export interface PipelineFlow {
  from: string;
  to: string;
  value: number;
}

/**
 * Stage time breakdown
 */
export interface StageTimeBreakdown {
  stage: string;
  avgDays: number;
  minDays: number;
  maxDays: number;
}

/**
 * Stage name mapping
 */
const STAGE_MAPPING: Record<string, string> = {
  submitted: 'Submission',
  in_call_review: 'Call Review',
  in_evaluation: 'Evaluation',
  approved: 'Approved',
  in_negotiation: 'Negotiation',
  in_legal_review: 'Legal Review',
  contracted: 'Contract',
  in_payment: 'Payment',
  rejected: 'Rejected',
  archived: 'Archived',
};

/**
 * Pipeline analytics service
 * Uses StoryRepository instead of direct Supabase queries
 */
export class PipelineAnalyticsService extends BaseAnalyticsService {
  private storyRepo: StoryRepository;

  constructor(context: RepositoryContextType = 'server') {
    super();
    this.storyRepo = new StoryRepository(context);
  }

  /**
   * Get comprehensive pipeline overview with stage-by-stage breakdown
   *
   * @returns Pipeline overview with all metrics
   */
  async getPipelineOverview(): Promise<PipelineOverview> {
    try {
      logger.info('Getting pipeline overview');

      return await this.withCache(
        'analytics:pipeline-overview',
        async () => {
          // Get all stories with minimal fields (optimized query)
          const stories = await this.storyRepo.findAll({
            select: 'id, story_id, status, created_at, updated_at',
            order: { column: 'created_at', ascending: false },
          });

          const totalStories = stories.length;

          // Count stories by status
          const statusCounts = StatsUtils.countBy(stories, (s) => s.status);

          // Active pipeline = not rejected or archived
          const activePipeline = stories.filter(
            (s) => !['rejected', 'archived'].includes(s.status)
          ).length;

          // Completed this month (stories that reached payment or contracted stage this month)
          const now = new Date();
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          const completedThisMonth = stories.filter(
            (s) => ['in_payment', 'contracted'].includes(s.status) && new Date(s.updated_at) >= startOfMonth
          ).length;

          // Calculate avg time to completion (for stories in payment or contracted)
          const completedStories = stories.filter((s) => ['in_payment', 'contracted'].includes(s.status));
          let avgTimeToCompletion = 0;

          if (completedStories.length > 0) {
            const completionTimes = completedStories.map((story) => {
              return TimeUtils.daysBetween(
                new Date(story.created_at),
                new Date(story.updated_at)
              );
            });
            avgTimeToCompletion = Math.round(StatsUtils.average(completionTimes));
          }

          // Build stage data
          const stages: PipelineStageData[] = Object.entries(STAGE_MAPPING)
            .filter(([status]) => !['rejected', 'archived'].includes(status))
            .map(([status, displayName]) => {
              const count = statusCounts[status] || 0;

              // Calculate avg time in stage
              const storiesInStage = stories.filter((s) => s.status === status);
              let avgTimeInStage = 0;

              if (storiesInStage.length > 0) {
                const stageTimes = storiesInStage.map((story) =>
                  TimeUtils.daysSince(story.updated_at)
                );
                avgTimeInStage = StatsUtils.round(StatsUtils.average(stageTimes), 1);
              }

              // Mark as bottleneck if avg time > 7 days or count is unusually high
              const bottleneck = avgTimeInStage > 7 || count > activePipeline * 0.3;

              return {
                stage: status,
                displayName,
                count,
                avgTimeInStage,
                conversionRate: 0, // TODO: Calculate with status_history table
                bottleneck,
              };
            });

          logger.info(
            `Pipeline overview: ${totalStories} total, ${activePipeline} active, ${completedThisMonth} completed this month`
          );

          return {
            totalStories,
            activePipeline,
            completedThisMonth,
            avgTimeToCompletion,
            stages,
          };
        },
        300 // 5 minute cache
      );
    } catch (error) {
      this.handleError(error, 'get pipeline overview');
    }
  }

  /**
   * Get detailed breakdown for a specific pipeline stage
   *
   * @param stage - Stage to get details for
   * @returns Array of stories in the stage with detailed info
   */
  async getStageDetails(stage: string): Promise<StageDetailedStory[]> {
    try {
      logger.info(`Getting stage details for: ${stage}`);

      return await this.withCache(
        `analytics:stage-details:${stage}`,
        async () => {
          const stories = await this.storyRepo.findAll({
            select: `
              id,
              story_id,
              title,
              status,
              created_at,
              updated_at,
              creator:users!stories_created_by_fkey(name, email)
            `,
            filters: { status: stage },
            order: { column: 'updated_at', ascending: true },
          });

          // Transform to detailed format
          const detailedStories: StageDetailedStory[] = stories.map((story: any) => ({
            id: story.id,
            story_id: story.story_id,
            title: story.title,
            status: story.status,
            created_at: story.created_at,
            updated_at: story.updated_at,
            creator_name: story.creator?.name || 'Unknown',
            creator_email: story.creator?.email || '',
            days_in_stage: TimeUtils.daysSince(story.updated_at),
          }));

          logger.info(`Found ${detailedStories.length} stories in stage ${stage}`);
          return detailedStories;
        },
        180 // 3 minute cache
      );
    } catch (error) {
      this.handleError(error, `get stage details for ${stage}`);
    }
  }

  /**
   * Get pipeline flow data for Sankey/flow diagram
   * Note: Requires status_history table for accurate flow tracking
   *
   * @returns Array of flow data between stages
   */
  async getPipelineFlowData(): Promise<PipelineFlow[]> {
    try {
      logger.info('Getting pipeline flow data');

      return await this.withCache(
        'analytics:pipeline-flow',
        async () => {
          // TODO: Implement with status_history table when available
          // For now, return simplified flow based on current distribution
          const stories = await this.storyRepo.findAll({
            select: 'status',
          });

          const statusCounts = StatsUtils.countBy(stories, (s) => s.status);

          // Simplified flow based on typical progression
          const flows: PipelineFlow[] = [
            {
              from: 'Submission',
              to: 'Call Report',
              value: statusCounts['in_call_report'] || 0,
            },
            {
              from: 'Call Report',
              to: 'Evaluation',
              value: statusCounts['in_evaluation'] || 0,
            },
            {
              from: 'Evaluation',
              to: 'Approval',
              value: statusCounts['in_approval'] || 0,
            },
            {
              from: 'Approval',
              to: 'Negotiation',
              value: statusCounts['in_negotiation'] || 0,
            },
            {
              from: 'Negotiation',
              to: 'Legal Review',
              value: statusCounts['in_legal_review'] || 0,
            },
            {
              from: 'Legal Review',
              to: 'Contract',
              value: statusCounts['in_contract'] || 0,
            },
            {
              from: 'Contract',
              to: 'Payment',
              value: statusCounts['in_payment'] || 0,
            },
            {
              from: 'Payment',
              to: 'Archived',
              value: statusCounts['archived'] || 0,
            },
          ];

          logger.info('Pipeline flow data calculated');
          return flows;
        },
        300 // 5 minute cache
      );
    } catch (error) {
      this.handleError(error, 'get pipeline flow data');
    }
  }

  /**
   * Get time spent in each stage breakdown
   * Note: More accurate with status_history table
   *
   * @returns Array of stage time breakdowns
   */
  async getStageTimeBreakdown(): Promise<StageTimeBreakdown[]> {
    try {
      logger.info('Getting stage time breakdown');

      return await this.withCache(
        'analytics:stage-time-breakdown',
        async () => {
          // Get contracted and in_payment stories for time analysis
          const stories = await this.storyRepo.findAll({
            select: 'status, created_at, updated_at',
            filters: {
              status: ['contracted', 'in_payment'],
            },
          });

          // Accurate calculation requires a status_history table (not yet implemented)
          // Return zeros to avoid displaying fake data
          const breakdown: StageTimeBreakdown[] = Object.entries(STAGE_MAPPING)
            .filter(([status]) => !['rejected', 'archived'].includes(status))
            .map(([_, displayName]) => ({
              stage: displayName,
              avgDays: 0,
              minDays: 0,
              maxDays: 0,
            }));

          logger.info('Stage time breakdown calculated (placeholder data)');
          return breakdown;
        },
        600 // 10 minute cache (less frequently changing)
      );
    } catch (error) {
      this.handleError(error, 'get stage time breakdown');
    }
  }

  /**
   * Get bottleneck stages
   *
   * @returns Array of stages that are bottlenecks
   */
  async getBottleneckStages(): Promise<PipelineStageData[]> {
    try {
      logger.info('Getting bottleneck stages');

      const overview = await this.getPipelineOverview();
      const bottlenecks = overview.stages.filter((stage) => stage.bottleneck);

      logger.info(`Found ${bottlenecks.length} bottleneck stages`);
      return bottlenecks;
    } catch (error) {
      this.handleError(error, 'get bottleneck stages');
    }
  }

  /**
   * Get stories stuck in a specific stage
   *
   * @param stage - Stage to check
   * @param daysThreshold - Number of days to consider stuck (default: 14)
   * @returns Array of stuck stories
   */
  async getStuckStoriesInStage(
    stage: string,
    daysThreshold: number = 14
  ): Promise<StageDetailedStory[]> {
    try {
      logger.info(`Getting stuck stories in stage ${stage} (>${daysThreshold} days)`);

      const allStories = await this.getStageDetails(stage);
      const stuck = allStories.filter((story) => story.days_in_stage > daysThreshold);

      logger.info(`Found ${stuck.length} stuck stories in ${stage}`);
      return stuck;
    } catch (error) {
      this.handleError(error, `get stuck stories in stage ${stage}`);
    }
  }

  /**
   * Invalidate cache when pipeline changes
   */
  async invalidatePipelineCache(): Promise<void> {
    await this.invalidateCache('analytics:pipeline-overview');
    await this.invalidateCache('analytics:pipeline-flow');
    await this.invalidateCache('analytics:stage-time-breakdown');
    // Note: stage-details cache keys are dynamic, would need to track them
    logger.info('Pipeline cache invalidated');
  }
}

/**
 * Helper function to create a PipelineAnalyticsService instance
 */
export function createPipelineAnalyticsService(
  context: RepositoryContextType = 'server'
): PipelineAnalyticsService {
  return new PipelineAnalyticsService(context);
}

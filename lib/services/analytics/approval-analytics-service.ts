/**
 * Approval Analytics Service
 *
 * Handles analytics for pending approvals in the management dashboard.
 * Tracks stories awaiting executive approval after evaluation completion.
 *
 * Usage:
 * ```typescript
 * const service = new ApprovalAnalyticsService('server');
 * const approvals = await service.getPendingApprovals();
 * const stats = await service.getPendingApprovalsStats();
 * ```
 */

import { StoryRepository, type RepositoryContextType } from '@/lib/repositories';
import { BaseAnalyticsService, TimeUtils, StatsUtils } from './base-analytics-service';
import { logger } from '@/lib/logger';

/**
 * Pending approval data structure
 */
export interface PendingApproval {
  id: string;
  story_id: string;
  title: string;
  genre: string;
  creator_name: string;
  creator_id: string;
  submitted_date: string;
  days_pending: number;
  evaluation_score: number;
  evaluation_count: number;
  recommendation: string;
}

/**
 * Pending approvals statistics
 */
export interface PendingApprovalsStats {
  total: number;
  urgentCount: number; // > 7 days pending
  avgDaysPending: number;
  avgEvaluationScore: number;
}

/**
 * Approval analytics service
 * Uses StoryRepository instead of direct Supabase queries
 */
export class ApprovalAnalyticsService extends BaseAnalyticsService {
  private storyRepo: StoryRepository;

  constructor(context: RepositoryContextType = 'server') {
    super();
    this.storyRepo = new StoryRepository(context);
  }

  /**
   * Get all pending approvals
   * Stories that have been evaluated and approved, awaiting executive approval
   *
   * @returns Array of pending approvals with evaluation data
   */
  async getPendingApprovals(): Promise<PendingApproval[]> {
    try {
      logger.info('Getting pending approvals');

      return await this.withCache(
        'analytics:pending-approvals',
        async () => {
          // Get stories with status = 'approved' (evaluated and approved, awaiting executive approval)
          const stories = await this.storyRepo.findAll({
            select: `
              id,
              story_id,
              title,
              genre,
              created_at,
              updated_at,
              creator:users!stories_created_by_fkey (
                id,
                name
              ),
              evaluation_logs (
                total_avg_score,
                completed_evaluations,
                recommendation
              )
            `,
            filters: {
              status: 'approved',
            },
            order: { column: 'updated_at', ascending: true }, // Oldest first
          });

          // Transform to PendingApproval format with calculated metrics
          const pendingApprovals: PendingApproval[] = stories.map((story: any) => {
            const evaluationLog =
              Array.isArray(story.evaluation_logs) && story.evaluation_logs.length > 0
                ? story.evaluation_logs[0]
                : null;

            return {
              id: story.id,
              story_id: story.story_id,
              title: story.title,
              genre: story.genre || 'Unspecified',
              creator_name: story.creator?.name || 'Unknown',
              creator_id: story.creator?.id || '',
              submitted_date: story.updated_at,
              days_pending: TimeUtils.daysSince(story.updated_at),
              evaluation_score: evaluationLog?.total_avg_score || 0,
              evaluation_count: evaluationLog?.completed_evaluations || 0,
              recommendation: evaluationLog?.recommendation || 'N/A',
            };
          });

          logger.info(`Found ${pendingApprovals.length} pending approvals`);
          return pendingApprovals;
        },
        300 // 5 minute cache
      );
    } catch (error) {
      this.handleError(error, 'get pending approvals');
    }
  }

  /**
   * Get pending approvals statistics
   * Includes totals, urgent count, and averages
   *
   * @returns Statistics object
   */
  async getPendingApprovalsStats(): Promise<PendingApprovalsStats> {
    try {
      logger.info('Getting pending approvals statistics');

      return await this.withCache(
        'analytics:pending-approvals-stats',
        async () => {
          const approvals = await this.getPendingApprovals();

          const stats: PendingApprovalsStats = {
            total: approvals.length,
            urgentCount: approvals.filter((a) => a.days_pending > 7).length,
            avgDaysPending: 0,
            avgEvaluationScore: 0,
          };

          // Calculate averages
          if (approvals.length > 0) {
            const avgDays = StatsUtils.average(approvals.map((a) => a.days_pending));
            stats.avgDaysPending = Math.round(avgDays);

            const avgScore = StatsUtils.average(approvals.map((a) => a.evaluation_score));
            stats.avgEvaluationScore = StatsUtils.round(avgScore, 2);
          }

          logger.info(
            `Pending approvals stats: ${stats.total} total, ${stats.urgentCount} urgent, avg ${stats.avgDaysPending} days`
          );
          return stats;
        },
        300 // 5 minute cache
      );
    } catch (error) {
      this.handleError(error, 'get pending approvals stats');
    }
  }

  /**
   * Get urgent approvals (pending for more than threshold days)
   *
   * @param daysThreshold - Number of days to consider urgent (default: 7)
   * @returns Array of urgent approvals
   */
  async getUrgentApprovals(daysThreshold: number = 7): Promise<PendingApproval[]> {
    try {
      logger.info(`Getting urgent approvals (>${daysThreshold} days)`);

      const allApprovals = await this.getPendingApprovals();
      const urgent = allApprovals.filter((a) => a.days_pending > daysThreshold);

      logger.info(`Found ${urgent.length} urgent approvals`);
      return urgent;
    } catch (error) {
      this.handleError(error, `get urgent approvals (threshold: ${daysThreshold})`);
    }
  }

  /**
   * Get approvals by recommendation
   *
   * @param recommendation - Recommendation to filter by
   * @returns Array of approvals with the specified recommendation
   */
  async getApprovalsByRecommendation(recommendation: string): Promise<PendingApproval[]> {
    try {
      logger.info(`Getting approvals by recommendation: ${recommendation}`);

      const allApprovals = await this.getPendingApprovals();
      return allApprovals.filter((a) => a.recommendation === recommendation);
    } catch (error) {
      this.handleError(error, `get approvals by recommendation ${recommendation}`);
    }
  }

  /**
   * Get high-scoring approvals (score above threshold)
   *
   * @param scoreThreshold - Minimum score (default: 7.5)
   * @returns Array of high-scoring approvals
   */
  async getHighScoringApprovals(scoreThreshold: number = 7.5): Promise<PendingApproval[]> {
    try {
      logger.info(`Getting high-scoring approvals (>${scoreThreshold})`);

      const allApprovals = await this.getPendingApprovals();
      const highScoring = allApprovals.filter((a) => a.evaluation_score >= scoreThreshold);

      logger.info(`Found ${highScoring.length} high-scoring approvals`);
      return highScoring;
    } catch (error) {
      this.handleError(error, `get high-scoring approvals (threshold: ${scoreThreshold})`);
    }
  }

  /**
   * Invalidate cache when approvals change
   */
  async invalidateApprovalsCache(): Promise<void> {
    await this.invalidateCache('analytics:pending-approvals');
    await this.invalidateCache('analytics:pending-approvals-stats');
    logger.info('Approvals cache invalidated');
  }
}

/**
 * Helper function to create an ApprovalAnalyticsService instance
 */
export function createApprovalAnalyticsService(
  context: RepositoryContextType = 'server'
): ApprovalAnalyticsService {
  return new ApprovalAnalyticsService(context);
}

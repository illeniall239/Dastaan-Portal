/**
 * Active Ideas Details Service
 *
 * Handles detailed analytics for active ideas (call reports).
 * Provides detailed information about call reports pending evaluation.
 *
 * Usage:
 * ```typescript
 * const service = new ActiveIdeasDetailsService('server');
 * const ideas = await service.getActiveIdeasByGenre();
 * const stats = await service.getActiveIdeasStats();
 * ```
 */

import { CallReportRepository, type RepositoryContextType } from '@/lib/repositories';
import { BaseAnalyticsService, TimeUtils, StatsUtils } from './base-analytics-service';
import { logger } from '@/lib/logger';

/**
 * Active idea detail data structure
 */
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
 * Active ideas statistics
 */
export interface ActiveIdeasStats {
  total: number;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
  avgDaysActive: number;
}

/**
 * Active ideas details service
 * Provides detailed view of active call reports (ideas)
 */
export class ActiveIdeasDetailsService extends BaseAnalyticsService {
  private callReportRepo: CallReportRepository;

  constructor(context: RepositoryContextType = 'server') {
    super();
    this.callReportRepo = new CallReportRepository(context);
  }

  /**
   * Get active call reports (ideas) by genre
   * Excludes archived ideas
   *
   * @param genre - Optional genre filter ('all' or specific genre)
   * @returns Array of active idea details
   */
  async getActiveIdeasByGenre(genre?: string): Promise<ActiveIdeaDetail[]> {
    try {
      logger.info(`Getting active ideas${genre && genre !== 'all' ? ` for genre: ${genre}` : ''}`);

      const cacheKey = genre && genre !== 'all'
        ? `analytics:active-ideas:genre:${genre}`
        : 'analytics:active-ideas:all';

      return await this.withCache(
        cacheKey,
        async () => {
          // Build query options
          const options: any = {
            select: `
              id,
              call_report_id,
              working_title,
              writer_name,
              genre,
              category,
              status,
              meeting_date,
              logline,
              created_at,
              archived_at
            `,
            order: { column: 'created_at', ascending: false },
          };

          // Add genre filter if specified
          if (genre && genre !== 'all') {
            options.filters = { genre };
          }

          // Get all call reports
          const callReports = await this.callReportRepo.findAll(options);

          // Filter out archived ideas (archived_at is null)
          const activeReports = callReports.filter((report: any) => !report.archived_at);

          // Transform to ActiveIdeaDetail format with calculated metrics
          const ideas: ActiveIdeaDetail[] = activeReports.map((report: any) => ({
            id: report.id,
            call_report_id: report.call_report_id,
            working_title: report.working_title,
            writer_name: report.writer_name,
            genre: report.genre || 'Unspecified',
            category: report.category || 'N/A',
            status: report.status || 'draft',
            meeting_date: report.meeting_date,
            days_active: TimeUtils.daysSince(report.created_at),
            logline: report.logline,
            created_at: report.created_at,
          }));

          logger.info(
            `Found ${ideas.length} active ideas${genre && genre !== 'all' ? ` for genre ${genre}` : ''}`
          );

          return ideas;
        },
        300 // 5 minute cache
      );
    } catch (error) {
      this.handleError(error, `get active ideas by genre${genre ? ` (${genre})` : ''}`);
    }
  }

  /**
   * Get statistics for active ideas
   * Includes breakdowns by status, category, and average days active
   *
   * @param genre - Optional genre filter
   * @returns Statistics object
   */
  async getActiveIdeasStats(genre?: string): Promise<ActiveIdeasStats> {
    try {
      logger.info(`Getting active ideas stats${genre && genre !== 'all' ? ` for genre: ${genre}` : ''}`);

      const cacheKey = genre && genre !== 'all'
        ? `analytics:active-ideas-stats:genre:${genre}`
        : 'analytics:active-ideas-stats:all';

      return await this.withCache(
        cacheKey,
        async () => {
          const ideas = await this.getActiveIdeasByGenre(genre);

          const stats: ActiveIdeasStats = {
            total: ideas.length,
            byStatus: StatsUtils.countBy(ideas, (idea) => idea.status),
            byCategory: StatsUtils.countBy(ideas, (idea) => idea.category),
            avgDaysActive: 0,
          };

          // Calculate average days active
          if (ideas.length > 0) {
            const avgDays = StatsUtils.average(ideas.map((idea) => idea.days_active));
            stats.avgDaysActive = Math.round(avgDays);
          }

          logger.info(
            `Active ideas stats: ${stats.total} total, avg ${stats.avgDaysActive} days active`
          );

          return stats;
        },
        300 // 5 minute cache
      );
    } catch (error) {
      this.handleError(error, `get active ideas stats${genre ? ` (${genre})` : ''}`);
    }
  }

  /**
   * Get ideas by status
   *
   * @param status - Status filter
   * @param genre - Optional genre filter
   * @returns Array of active ideas with the specified status
   */
  async getIdeasByStatus(status: string, genre?: string): Promise<ActiveIdeaDetail[]> {
    try {
      logger.info(`Getting active ideas by status: ${status}`);

      const allIdeas = await this.getActiveIdeasByGenre(genre);
      return allIdeas.filter((idea) => idea.status === status);
    } catch (error) {
      this.handleError(error, `get ideas by status (${status})`);
    }
  }

  /**
   * Get ideas by category
   *
   * @param category - Category filter
   * @param genre - Optional genre filter
   * @returns Array of active ideas with the specified category
   */
  async getIdeasByCategory(category: string, genre?: string): Promise<ActiveIdeaDetail[]> {
    try {
      logger.info(`Getting active ideas by category: ${category}`);

      const allIdeas = await this.getActiveIdeasByGenre(genre);
      return allIdeas.filter((idea) => idea.category === category);
    } catch (error) {
      this.handleError(error, `get ideas by category (${category})`);
    }
  }

  /**
   * Get stale ideas (active for more than threshold days)
   *
   * @param daysThreshold - Number of days to consider stale (default: 30)
   * @param genre - Optional genre filter
   * @returns Array of stale ideas
   */
  async getStaleIdeas(daysThreshold: number = 30, genre?: string): Promise<ActiveIdeaDetail[]> {
    try {
      logger.info(`Getting stale ideas (>${daysThreshold} days)`);

      const allIdeas = await this.getActiveIdeasByGenre(genre);
      const stale = allIdeas.filter((idea) => idea.days_active > daysThreshold);

      logger.info(`Found ${stale.length} stale ideas`);
      return stale;
    } catch (error) {
      this.handleError(error, `get stale ideas (threshold: ${daysThreshold})`);
    }
  }

  /**
   * Get draft ideas
   *
   * @param genre - Optional genre filter
   * @returns Array of draft ideas
   */
  async getDraftIdeas(genre?: string): Promise<ActiveIdeaDetail[]> {
    return this.getIdeasByStatus('draft', genre);
  }

  /**
   * Get ideas ready for evaluation
   *
   * @param genre - Optional genre filter
   * @returns Array of ideas ready for evaluation
   */
  async getIdeasReadyForEvaluation(genre?: string): Promise<ActiveIdeaDetail[]> {
    return this.getIdeasByStatus('ready_for_evaluation', genre);
  }

  /**
   * Invalidate cache when ideas change
   */
  async invalidateIdeasCache(): Promise<void> {
    await this.invalidateCache('analytics:active-ideas:all');
    await this.invalidateCache('analytics:active-ideas-stats:all');
    // Note: Genre-specific cache keys would need to be tracked separately
    logger.info('Active ideas cache invalidated');
  }
}

/**
 * Helper function to create an ActiveIdeasDetailsService instance
 */
export function createActiveIdeasDetailsService(
  context: RepositoryContextType = 'server'
): ActiveIdeasDetailsService {
  return new ActiveIdeasDetailsService(context);
}

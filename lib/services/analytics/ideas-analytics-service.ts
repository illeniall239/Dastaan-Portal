/**
 * Ideas Analytics Service
 *
 * Handles analytics for active ideas (call reports).
 * Provides grouping by genre and status tracking.
 *
 * Usage:
 * ```typescript
 * const service = new IdeasAnalyticsService('server');
 * const byGenre = await service.getIdeasByGenre();
 * const byStatus = await service.getIdeasByStatus();
 * ```
 */

import { CallReportRepository, type RepositoryContextType } from '@/lib/repositories';
import { BaseAnalyticsService, StatsUtils } from './base-analytics-service';
import { logger } from '@/lib/logger';

/**
 * Ideas by genre data structure
 */
export interface IdeasByGenreData {
  genre: string;
  count: number;
}

/**
 * Ideas by status data structure
 */
export interface IdeasByStatusData {
  draft: number;
  ready_for_evaluation: number;
  in_review: number;
}

/**
 * Genre label mapping
 */
const GENRE_LABELS: Record<string, string> = {
  drama: 'Drama',
  comedy: 'Comedy',
  action: 'Action',
  thriller: 'Thriller',
  romance: 'Romance',
  horror: 'Horror',
  'sci-fi': 'Sci-Fi',
  fantasy: 'Fantasy',
  documentary: 'Documentary',
  other: 'Other',
};

/**
 * Ideas analytics service
 * Uses CallReportRepository for data access
 */
export class IdeasAnalyticsService extends BaseAnalyticsService {
  private callReportRepo: CallReportRepository;

  constructor(context: RepositoryContextType = 'server') {
    super();
    this.callReportRepo = new CallReportRepository(context);
  }

  /**
   * Get active ideas (call reports) grouped by genre
   * Excludes archived ideas
   *
   * @returns Array of genre counts sorted by count descending
   */
  async getIdeasByGenre(): Promise<IdeasByGenreData[]> {
    try {
      logger.info('Getting ideas by genre');

      return await this.withCache(
        'analytics:ideas-by-genre',
        async () => {
          // Get all active call reports (not archived)
          const callReports = await this.callReportRepo.findAll({
            select: 'genre, archived_at',
          });

          // Filter out archived ideas
          const activeReports = callReports.filter((report: any) => !report.archived_at);

          // Group by genre and count
          const genreCounts: Record<string, number> = {};

          activeReports.forEach((report: any) => {
            const genre = report.genre;
            if (genre) {
              genreCounts[genre] = (genreCounts[genre] || 0) + 1;
            }
          });

          // Convert to array format with proper capitalization
          const result = Object.entries(genreCounts).map(([genre, count]) => ({
            genre: GENRE_LABELS[genre.toLowerCase()] || genre,
            count,
          }));

          // Sort by count descending
          const sorted = result.sort((a, b) => b.count - a.count);

          logger.info(`Found ${sorted.length} genres in active ideas`);
          return sorted;
        },
        300 // 5 minute cache
      );
    } catch (error) {
      this.handleError(error, 'get ideas by genre');
    }
  }

  /**
   * Get total count of active ideas (call reports not archived)
   *
   * @returns Total number of active ideas
   */
  async getTotalActiveIdeas(): Promise<number> {
    try {
      logger.info('Getting total active ideas count');

      return await this.withCache(
        'analytics:total-active-ideas',
        async () => {
          const callReports = await this.callReportRepo.findAll({
            select: 'id, archived_at',
          });

          // Filter out archived ideas
          const activeCount = callReports.filter((report: any) => !report.archived_at).length;

          logger.info(`Total active ideas: ${activeCount}`);
          return activeCount;
        },
        300 // 5 minute cache
      );
    } catch (error) {
      this.handleError(error, 'get total active ideas');
    }
  }

  /**
   * Get ideas breakdown by status
   *
   * @returns Object with counts by status
   */
  async getIdeasByStatus(): Promise<IdeasByStatusData> {
    try {
      logger.info('Getting ideas by status');

      return await this.withCache(
        'analytics:ideas-by-status',
        async () => {
          const callReports = await this.callReportRepo.findAll({
            select: 'status, archived_at',
          });

          // Filter out archived ideas
          const activeReports = callReports.filter((report: any) => !report.archived_at);

          const statusCounts: IdeasByStatusData = {
            draft: 0,
            ready_for_evaluation: 0,
            in_review: 0,
          };

          activeReports.forEach((report: any) => {
            if (report.status && report.status in statusCounts) {
              statusCounts[report.status as keyof IdeasByStatusData]++;
            }
          });

          logger.info(
            `Ideas by status: ${statusCounts.draft} draft, ${statusCounts.ready_for_evaluation} ready, ${statusCounts.in_review} in review`
          );

          return statusCounts;
        },
        300 // 5 minute cache
      );
    } catch (error) {
      this.handleError(error, 'get ideas by status');
    }
  }

  /**
   * Get ideas statistics
   *
   * @returns Comprehensive ideas statistics
   */
  async getIdeasStats(): Promise<{
    total: number;
    byGenre: IdeasByGenreData[];
    byStatus: IdeasByStatusData;
    topGenre: string | null;
  }> {
    try {
      logger.info('Getting ideas statistics');

      const [total, byGenre, byStatus] = await Promise.all([
        this.getTotalActiveIdeas(),
        this.getIdeasByGenre(),
        this.getIdeasByStatus(),
      ]);

      const topGenre = byGenre.length > 0 ? byGenre[0].genre : null;

      return {
        total,
        byGenre,
        byStatus,
        topGenre,
      };
    } catch (error) {
      this.handleError(error, 'get ideas stats');
    }
  }

  /**
   * Get ideas in draft status
   *
   * @returns Number of draft ideas
   */
  async getDraftIdeas(): Promise<number> {
    try {
      const byStatus = await this.getIdeasByStatus();
      return byStatus.draft;
    } catch (error) {
      this.handleError(error, 'get draft ideas');
    }
  }

  /**
   * Get ideas ready for evaluation
   *
   * @returns Number of ideas ready for evaluation
   */
  async getIdeasReadyForEvaluation(): Promise<number> {
    try {
      const byStatus = await this.getIdeasByStatus();
      return byStatus.ready_for_evaluation;
    } catch (error) {
      this.handleError(error, 'get ideas ready for evaluation');
    }
  }

  /**
   * Invalidate cache when ideas change
   */
  async invalidateIdeasCache(): Promise<void> {
    await this.invalidateCache('analytics:ideas-by-genre');
    await this.invalidateCache('analytics:total-active-ideas');
    await this.invalidateCache('analytics:ideas-by-status');
    logger.info('Ideas cache invalidated');
  }
}

/**
 * Helper function to create an IdeasAnalyticsService instance
 */
export function createIdeasAnalyticsService(
  context: RepositoryContextType = 'server'
): IdeasAnalyticsService {
  return new IdeasAnalyticsService(context);
}

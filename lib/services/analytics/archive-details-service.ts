/**
 * Archive Details Service
 *
 * Handles detailed analytics for archived stories and rejected call reports.
 * Combines data from archive and rejected_archive tables.
 *
 * Usage:
 * ```typescript
 * const service = new ArchiveDetailsService('server');
 * const combined = await service.getCombinedArchiveDetails();
 * const stats = await service.getArchiveDetailsStats('Drama');
 * ```
 */

import { ArchiveRepository, type RepositoryContextType } from '@/lib/repositories';
import { BaseAnalyticsService, TimeUtils, StatsUtils } from './base-analytics-service';
import { logger } from '@/lib/logger';

/**
 * Archive detail data structure
 * Unified format for both story archives and rejected call reports
 */
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
 * Archive details statistics
 */
export interface ArchiveDetailsStats {
  total: number;
  storyArchiveCount: number;
  callReportRejectionCount: number;
  avgDaysInSystem: number;
  byStage: Record<string, number>;
}

/**
 * Archive details service
 * Provides unified view of archived stories and rejected call reports
 */
export class ArchiveDetailsService extends BaseAnalyticsService {
  private archiveRepo: ArchiveRepository;

  constructor(context: RepositoryContextType = 'server') {
    super();
    this.archiveRepo = new ArchiveRepository(context);
  }

  /**
   * Get archived stories by genre
   * Fetches from archive table with story joins
   *
   * @param genre - Optional genre filter ('all' or specific genre)
   * @returns Array of archive details for stories
   */
  async getArchiveStoriesByGenre(genre?: string): Promise<ArchiveDetail[]> {
    try {
      logger.info(`Getting archive stories${genre && genre !== 'all' ? ` for genre: ${genre}` : ''}`);

      const cacheKey = genre && genre !== 'all'
        ? `analytics:archive-stories:genre:${genre}`
        : 'analytics:archive-stories:all';

      return await this.withCache(
        cacheKey,
        async () => {
          // Get story archives with joins
          const archives = genre && genre !== 'all'
            ? await this.archiveRepo.findStoryArchivesByGenre(genre, {
                select: `
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
                `,
              })
            : await this.archiveRepo.findAllStoryArchives({
                select: `
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
                `,
              });

          // Transform to unified ArchiveDetail format
          const details: ArchiveDetail[] = archives.map((archive: any) => ({
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

          logger.info(
            `Found ${details.length} archived stories${genre && genre !== 'all' ? ` for genre ${genre}` : ''}`
          );

          return details;
        },
        600 // 10 minute cache (archive data changes infrequently)
      );
    } catch (error) {
      this.handleError(error, `get archive stories by genre${genre ? ` (${genre})` : ''}`);
    }
  }

  /**
   * Get rejected call reports
   * Fetches from rejected_archive table
   * Note: rejected_archive doesn't have genre field, so genre filtering is not supported
   *
   * @returns Array of archive details for rejected call reports
   */
  async getRejectedCallReportsByGenre(): Promise<ArchiveDetail[]> {
    try {
      logger.info('Getting rejected call reports');

      return await this.withCache(
        'analytics:rejected-reports',
        async () => {
          // Get rejected call reports
          const rejectedReports = await this.archiveRepo.findAllRejectedReports({
            select: `
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
            `,
          });

          // Transform to unified ArchiveDetail format with calculated days
          const details: ArchiveDetail[] = rejectedReports.map((report: any) => {
            // Calculate days in system
            let daysInSystem: number | null = null;
            if (report.original_created_at && report.archived_at) {
              const createdAt = new Date(report.original_created_at);
              const archivedAt = new Date(report.archived_at);
              daysInSystem = Math.floor(
                (archivedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
              );
            }

            return {
              id: report.call_report_id || report.id,
              type: 'call_report_rejection' as const,
              title: report.working_title,
              writer_name: report.writer_name,
              genre: 'N/A', // rejected_archive doesn't have genre field
              rejection_reason:
                report.rejection_reason ||
                (report.average_score ? `Low evaluation score: ${report.average_score}` : 'Unknown'),
              rejection_date: report.archived_at,
              days_in_system: daysInSystem,
              average_score: report.average_score,
              category: report.category,
            };
          });

          logger.info(`Found ${details.length} rejected call reports`);

          return details;
        },
        600 // 10 minute cache (archive data changes infrequently)
      );
    } catch (error) {
      this.handleError(error, 'get rejected call reports');
    }
  }

  /**
   * Get combined archive details
   * Merges both story archives and rejected call reports
   * Sorted by rejection date (most recent first)
   *
   * @param genre - Optional genre filter (only applies to story archives)
   * @returns Array of all archive details
   */
  async getCombinedArchiveDetails(genre?: string): Promise<ArchiveDetail[]> {
    try {
      logger.info(`Getting combined archive details${genre && genre !== 'all' ? ` for genre: ${genre}` : ''}`);

      const cacheKey = genre && genre !== 'all'
        ? `analytics:archive-combined:genre:${genre}`
        : 'analytics:archive-combined:all';

      return await this.withCache(
        cacheKey,
        async () => {
          // Fetch both types in parallel
          const [storyArchives, rejectedReports] = await Promise.all([
            this.getArchiveStoriesByGenre(genre),
            this.getRejectedCallReportsByGenre(),
          ]);

          // Combine both arrays
          const combined = [...storyArchives, ...rejectedReports];

          // Filter by genre if specified
          // Note: For rejected reports, genre is 'N/A', so they're excluded if genre filter is applied
          const filtered = genre && genre !== 'all'
            ? combined.filter(item => {
                // Story archives are already filtered, rejected reports don't have genre
                return item.type === 'story_archive' || item.genre === 'N/A';
              })
            : combined;

          // Sort by rejection date (most recent first)
          const sorted = filtered.sort(
            (a, b) =>
              new Date(b.rejection_date).getTime() - new Date(a.rejection_date).getTime()
          );

          logger.info(
            `Found ${sorted.length} total archive items (${storyArchives.length} stories, ${rejectedReports.length} call reports)`
          );

          return sorted;
        },
        600 // 10 minute cache (archive data changes infrequently)
      );
    } catch (error) {
      this.handleError(error, `get combined archive details${genre ? ` (${genre})` : ''}`);
    }
  }

  /**
   * Get archive details statistics
   * Includes counts by type, average days in system, and breakdown by rejection stage
   *
   * @param genre - Optional genre filter
   * @returns Statistics object
   */
  async getArchiveDetailsStats(genre?: string): Promise<ArchiveDetailsStats> {
    try {
      logger.info(`Getting archive details stats${genre && genre !== 'all' ? ` for genre: ${genre}` : ''}`);

      const cacheKey = genre && genre !== 'all'
        ? `analytics:archive-stats:genre:${genre}`
        : 'analytics:archive-stats:all';

      return await this.withCache(
        cacheKey,
        async () => {
          const details = await this.getCombinedArchiveDetails(genre);

          // Count by type
          const storyArchiveCount = details.filter((d) => d.type === 'story_archive').length;
          const callReportRejectionCount = details.filter(
            (d) => d.type === 'call_report_rejection'
          ).length;

          // Calculate average days in system
          const validDays = details
            .filter((d) => d.days_in_system !== null)
            .map((d) => d.days_in_system!);

          const avgDaysInSystem =
            validDays.length > 0
              ? Math.round(validDays.reduce((sum, days) => sum + days, 0) / validDays.length)
              : 0;

          // Count by rejection stage
          const byStage: Record<string, number> = {};
          details.forEach((detail) => {
            if (detail.rejection_stage) {
              byStage[detail.rejection_stage] = (byStage[detail.rejection_stage] || 0) + 1;
            } else if (detail.type === 'call_report_rejection') {
              byStage['evaluation'] = (byStage['evaluation'] || 0) + 1;
            }
          });

          const stats: ArchiveDetailsStats = {
            total: details.length,
            storyArchiveCount,
            callReportRejectionCount,
            avgDaysInSystem,
            byStage,
          };

          logger.info(
            `Archive stats: ${stats.total} total (${stats.storyArchiveCount} stories, ${stats.callReportRejectionCount} call reports), avg ${stats.avgDaysInSystem} days in system`
          );

          return stats;
        },
        600 // 10 minute cache (archive data changes infrequently)
      );
    } catch (error) {
      this.handleError(error, `get archive details stats${genre ? ` (${genre})` : ''}`);
    }
  }

  /**
   * Get items by rejection stage
   *
   * @param stage - Rejection stage filter
   * @param genre - Optional genre filter
   * @returns Array of archive details
   */
  async getItemsByRejectionStage(stage: string, genre?: string): Promise<ArchiveDetail[]> {
    try {
      logger.info(`Getting archive items by rejection stage: ${stage}`);

      const allItems = await this.getCombinedArchiveDetails(genre);
      return allItems.filter(
        (item) =>
          item.rejection_stage === stage ||
          (stage === 'evaluation' && item.type === 'call_report_rejection')
      );
    } catch (error) {
      this.handleError(error, `get items by rejection stage (${stage})`);
    }
  }

  /**
   * Get items with long system time
   *
   * @param daysThreshold - Minimum days in system (default: 60)
   * @param genre - Optional genre filter
   * @returns Array of archive details
   */
  async getItemsWithLongSystemTime(
    daysThreshold: number = 60,
    genre?: string
  ): Promise<ArchiveDetail[]> {
    try {
      logger.info(`Getting archive items with >${daysThreshold} days in system`);

      const allItems = await this.getCombinedArchiveDetails(genre);
      const longItems = allItems.filter(
        (item) => item.days_in_system !== null && item.days_in_system > daysThreshold
      );

      logger.info(`Found ${longItems.length} items with long system time`);
      return longItems;
    } catch (error) {
      this.handleError(error, `get items with long system time (threshold: ${daysThreshold})`);
    }
  }

  /**
   * Invalidate cache when archive data changes
   */
  async invalidateArchiveCache(): Promise<void> {
    await this.invalidateCache('analytics:archive-stories:all');
    await this.invalidateCache('analytics:rejected-reports');
    await this.invalidateCache('analytics:archive-combined:all');
    await this.invalidateCache('analytics:archive-stats:all');
    // Note: Genre-specific cache keys would need to be tracked separately
    logger.info('Archive details cache invalidated');
  }
}

/**
 * Helper function to create an ArchiveDetailsService instance
 */
export function createArchiveDetailsService(
  context: RepositoryContextType = 'server'
): ArchiveDetailsService {
  return new ArchiveDetailsService(context);
}

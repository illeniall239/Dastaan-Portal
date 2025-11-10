/**
 * Project Analytics Service
 *
 * Handles analytics for active projects in the management dashboard.
 * Provides data for active projects overview, statistics, and trends.
 *
 * Usage:
 * ```typescript
 * const service = new ProjectAnalyticsService('server');
 * const projects = await service.getActiveProjects();
 * const stats = await service.getActiveProjectsStats();
 * ```
 */

import { StoryRepository, type RepositoryContextType } from '@/lib/repositories';
import { BaseAnalyticsService, TimeUtils, StatsUtils } from './base-analytics-service';
import { logger } from '@/lib/logger';

/**
 * Active project data structure
 */
export interface ActiveProject {
  id: string;
  story_id: string;
  title: string;
  status: string;
  genre: string;
  creator_name: string;
  creator_id: string;
  days_active: number;
  last_update: string;
  created_at: string;
}

/**
 * Active projects statistics
 */
export interface ActiveProjectsStats {
  total: number;
  byStatus: Record<string, number>;
  byGenre: Record<string, number>;
  avgDaysActive: number;
}

/**
 * Project analytics service
 * Uses StoryRepository instead of direct Supabase queries
 */
export class ProjectAnalyticsService extends BaseAnalyticsService {
  private storyRepo: StoryRepository;

  constructor(context: RepositoryContextType = 'server') {
    super();
    this.storyRepo = new StoryRepository(context);
  }

  /**
   * Get all active projects
   * Active = not completed, rejected, or archived
   *
   * @returns Array of active projects with calculated metrics
   */
  async getActiveProjects(): Promise<ActiveProject[]> {
    try {
      logger.info('Getting active projects');

      return await this.withCache(
        'analytics:active-projects',
        async () => {
          // Get stories that are active (not completed, rejected, or archived)
          // Also filter by meeting_type = 'call_report' via call_reports join
          const stories = await this.storyRepo.findAll({
            select: `
              id,
              story_id,
              title,
              status,
              genre,
              created_at,
              updated_at,
              created_by,
              creator:users!stories_created_by_fkey (
                id,
                name
              ),
              call_reports!inner (
                meeting_type
              )
            `,
            filters: {
              'call_reports.meeting_type': 'call_report',
            },
            order: { column: 'updated_at', ascending: false },
          });

          // Filter out completed/rejected/archived stories
          const activeStories = stories.filter((story: any) =>
            !['completed', 'rejected', 'archived'].includes(story.status)
          );

          // Transform to ActiveProject format with calculated metrics
          const activeProjects: ActiveProject[] = activeStories.map((story: any) => {
            return {
              id: story.id,
              story_id: story.story_id,
              title: story.title,
              status: story.status,
              genre: story.genre || 'Unspecified',
              creator_name: story.creator?.name || 'Unknown',
              creator_id: story.creator?.id || '',
              days_active: TimeUtils.daysSince(story.created_at),
              last_update: story.updated_at,
              created_at: story.created_at,
            };
          });

          logger.info(`Found ${activeProjects.length} active projects`);
          return activeProjects;
        },
        300 // 5 minute cache
      );
    } catch (error) {
      this.handleError(error, 'get active projects');
    }
  }

  /**
   * Get active projects statistics
   * Includes totals, breakdowns by status/genre, and averages
   *
   * @returns Statistics object
   */
  async getActiveProjectsStats(): Promise<ActiveProjectsStats> {
    try {
      logger.info('Getting active projects statistics');

      return await this.withCache(
        'analytics:active-projects-stats',
        async () => {
          const projects = await this.getActiveProjects();

          const stats: ActiveProjectsStats = {
            total: projects.length,
            byStatus: StatsUtils.countBy(projects, (p) => p.status),
            byGenre: StatsUtils.countBy(projects, (p) => p.genre),
            avgDaysActive: 0,
          };

          // Calculate average days active
          if (projects.length > 0) {
            const avgDays = StatsUtils.average(projects.map((p) => p.days_active));
            stats.avgDaysActive = Math.round(avgDays);
          }

          logger.info(`Active projects stats: ${stats.total} total, avg ${stats.avgDaysActive} days`);
          return stats;
        },
        300 // 5 minute cache
      );
    } catch (error) {
      this.handleError(error, 'get active projects stats');
    }
  }

  /**
   * Get active projects by status
   *
   * @param status - Story status to filter by
   * @returns Array of active projects with the specified status
   */
  async getActiveProjectsByStatus(status: string): Promise<ActiveProject[]> {
    try {
      logger.info(`Getting active projects by status: ${status}`);

      const allProjects = await this.getActiveProjects();
      return allProjects.filter((p) => p.status === status);
    } catch (error) {
      this.handleError(error, `get active projects by status ${status}`);
    }
  }

  /**
   * Get active projects by genre
   *
   * @param genre - Genre to filter by
   * @returns Array of active projects in the specified genre
   */
  async getActiveProjectsByGenre(genre: string): Promise<ActiveProject[]> {
    try {
      logger.info(`Getting active projects by genre: ${genre}`);

      const allProjects = await this.getActiveProjects();
      return allProjects.filter((p) => p.genre === genre);
    } catch (error) {
      this.handleError(error, `get active projects by genre ${genre}`);
    }
  }

  /**
   * Get stale projects (active for more than threshold days)
   *
   * @param daysThreshold - Number of days to consider stale (default: 30)
   * @returns Array of stale projects
   */
  async getStaleProjects(daysThreshold: number = 30): Promise<ActiveProject[]> {
    try {
      logger.info(`Getting stale projects (>${daysThreshold} days)`);

      const allProjects = await this.getActiveProjects();
      const stale = allProjects.filter((p) => p.days_active > daysThreshold);

      logger.info(`Found ${stale.length} stale projects`);
      return stale;
    } catch (error) {
      this.handleError(error, `get stale projects (threshold: ${daysThreshold})`);
    }
  }

  /**
   * Invalidate cache when projects change
   */
  async invalidateProjectsCache(): Promise<void> {
    await this.invalidateCache('analytics:active-projects');
    await this.invalidateCache('analytics:active-projects-stats');
    logger.info('Projects cache invalidated');
  }
}

/**
 * Helper function to create a ProjectAnalyticsService instance
 */
export function createProjectAnalyticsService(
  context: RepositoryContextType = 'server'
): ProjectAnalyticsService {
  return new ProjectAnalyticsService(context);
}

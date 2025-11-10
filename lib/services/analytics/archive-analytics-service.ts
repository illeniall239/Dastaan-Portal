/**
 * Archive Analytics Service
 *
 * Handles analytics for archived stories.
 * Provides grouping by genre and total counts.
 *
 * Usage:
 * ```typescript
 * const service = new ArchiveAnalyticsService('server');
 * const byGenre = await service.getArchiveByGenre();
 * const total = await service.getTotalArchivedStories();
 * ```
 */

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createBrowserClient } from '@/lib/supabase/client';
import { createAdminClient } from '@/lib/supabase/admin';
import type { RepositoryContextType } from '@/lib/repositories';
import { BaseAnalyticsService, StatsUtils } from './base-analytics-service';
import { logger } from '@/lib/logger';

/**
 * Genre archive data structure
 */
export interface GenreArchiveData {
  genre: string;
  count: number;
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
 * Archive analytics service
 * TODO: Create ArchiveRepository for better abstraction
 */
export class ArchiveAnalyticsService extends BaseAnalyticsService {
  private context: RepositoryContextType;

  constructor(context: RepositoryContextType = 'server') {
    super();
    this.context = context;
  }

  /**
   * Get Supabase client based on context
   */
  private async getClient() {
    switch (this.context) {
      case 'server':
        return await createServerClient();
      case 'client':
        return createBrowserClient();
      case 'admin':
        return createAdminClient();
      default:
        throw new Error(`Invalid repository context type: ${this.context}`);
    }
  }

  /**
   * Get archived stories grouped by genre
   *
   * @returns Array of genre counts sorted by count descending
   */
  async getArchiveByGenre(): Promise<GenreArchiveData[]> {
    try {
      logger.info('Getting archive by genre');

      return await this.withCache(
        'analytics:archive-by-genre',
        async () => {
          const supabase = await this.getClient();

          // Query archive table and join with stories to get genre information
          const { data: archiveData, error } = await supabase.from('archive').select(`
              id,
              story:stories (
                genre
              )
            `);

          if (error) {
            throw new Error(`Failed to fetch archive by genre: ${error.message}`);
          }

          // Group by genre and count
          const genreCounts: Record<string, number> = {};

          (archiveData || []).forEach((item: any) => {
            if (item.story?.genre) {
              const genre = item.story.genre;
              genreCounts[genre] = (genreCounts[genre] || 0) + 1;
            }
          });

          // Convert to array format with proper capitalization
          const result = Object.entries(genreCounts).map(([genre, count]) => ({
            genre: GENRE_LABELS[genre] || genre,
            count,
          }));

          // Sort by count descending
          const sorted = result.sort((a, b) => b.count - a.count);

          logger.info(`Found ${sorted.length} genres in archive`);
          return sorted;
        },
        600 // 10 minute cache (archived data changes infrequently)
      );
    } catch (error) {
      this.handleError(error, 'get archive by genre');
    }
  }

  /**
   * Get total archived stories count
   *
   * @returns Total number of archived stories
   */
  async getTotalArchivedStories(): Promise<number> {
    try {
      logger.info('Getting total archived stories count');

      return await this.withCache(
        'analytics:total-archived-stories',
        async () => {
          const supabase = await this.getClient();

          const { count, error } = await supabase
            .from('archive')
            .select('*', { count: 'exact', head: true });

          if (error) {
            throw new Error(`Failed to fetch archived stories count: ${error.message}`);
          }

          logger.info(`Total archived stories: ${count || 0}`);
          return count || 0;
        },
        600 // 10 minute cache
      );
    } catch (error) {
      this.handleError(error, 'get total archived stories');
    }
  }

  /**
   * Get archive statistics
   *
   * @returns Statistics object
   */
  async getArchiveStats(): Promise<{
    total: number;
    byGenre: GenreArchiveData[];
    topGenre: string | null;
  }> {
    try {
      logger.info('Getting archive statistics');

      const [total, byGenre] = await Promise.all([
        this.getTotalArchivedStories(),
        this.getArchiveByGenre(),
      ]);

      const topGenre = byGenre.length > 0 ? byGenre[0].genre : null;

      return {
        total,
        byGenre,
        topGenre,
      };
    } catch (error) {
      this.handleError(error, 'get archive stats');
    }
  }

  /**
   * Invalidate cache when archive changes
   */
  async invalidateArchiveCache(): Promise<void> {
    await this.invalidateCache('analytics:archive-by-genre');
    await this.invalidateCache('analytics:total-archived-stories');
    logger.info('Archive cache invalidated');
  }
}

/**
 * Helper function to create an ArchiveAnalyticsService instance
 */
export function createArchiveAnalyticsService(
  context: RepositoryContextType = 'server'
): ArchiveAnalyticsService {
  return new ArchiveAnalyticsService(context);
}

/**
 * Archive Repository
 *
 * Handles data access for archive and rejected_archive tables.
 * Archives track rejected stories and call reports with rejection metadata.
 *
 * Usage:
 * ```typescript
 * const archiveRepo = new ArchiveRepository('server');
 * const archivedStories = await archiveRepo.findAllStoryArchives();
 * const rejectedReports = await archiveRepo.findAllRejectedReports();
 * ```
 */

import { BaseRepository, QueryOptions, type RepositoryContextType } from './base';
import { logger } from '@/lib/logger';

/**
 * StoryArchive data structure (from archive table)
 */
export interface StoryArchive {
  id: string;
  archive_id: string;
  story_id: string;
  rejection_stage: string;
  rejection_date: string;
  rejection_reason: string;
  rejection_category?: string;
  time_in_system_days?: number;
  archived_at: string;
  rejected_by?: string;
  // Joined fields (optional)
  story?: any;
  rejected_by_user?: any;
}

/**
 * RejectedArchive data structure (from rejected_archive table)
 */
export interface RejectedArchive {
  id: string;
  call_report_id: string;
  working_title: string;
  writer_name: string;
  category?: string;
  average_score?: number;
  total_evaluations?: number;
  rejection_reason?: string;
  archived_at: string;
  original_created_at?: string;
}

/**
 * Archive repository
 * Handles both archive (stories) and rejected_archive (call reports) tables
 */
export class ArchiveRepository extends BaseRepository<StoryArchive> {
  constructor(context: RepositoryContextType = 'server') {
    super('archive', context);
  }

  /**
   * Find all story archives
   *
   * @param options - Query options
   * @returns Array of story archives
   */
  async findAllStoryArchives(options?: QueryOptions): Promise<StoryArchive[]> {
    try {
      logger.info('Finding all story archives');

      return await this.findAll({
        ...options,
        order: options?.order || { column: 'archived_at', ascending: false },
      });
    } catch (error) {
      logger.error(`Error finding story archives: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find story archives by genre
   *
   * @param genre - Genre filter
   * @param options - Query options
   * @returns Array of story archives
   */
  async findStoryArchivesByGenre(genre: string, options?: QueryOptions): Promise<StoryArchive[]> {
    try {
      logger.info(`Finding story archives by genre: ${genre}`);

      const client = await this.getClient();
      let query = client
        .from(this.tableName)
        .select(options?.select || `
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
            id,
            title,
            writer_originator_name,
            genre,
            category
          )
        `)
        .eq('story.genre', genre);

      // Apply order
      if (options?.order) {
        const orders = Array.isArray(options.order) ? options.order : [options.order];
        orders.forEach(order => {
          query = query.order(order.column, {
            ascending: order.ascending ?? true,
          });
        });
      } else {
        query = query.order('archived_at', { ascending: false });
      }

      // Apply pagination
      if (options?.pagination) {
        const { limit, offset } = options.pagination;
        if (limit !== undefined) {
          if (offset !== undefined) {
            query = query.range(offset, offset + limit - 1);
          } else {
            query = query.limit(limit);
          }
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      logger.info(`Found ${data?.length || 0} story archives for genre: ${genre}`);
      return (data as unknown as StoryArchive[]) || [];
    } catch (error) {
      logger.error(`Error finding story archives by genre: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find all rejected call reports
   *
   * @param options - Query options
   * @returns Array of rejected call reports
   */
  async findAllRejectedReports(options?: QueryOptions): Promise<RejectedArchive[]> {
    try {
      logger.info('Finding all rejected call reports');

      const client = await this.getClient();
      let query = client
        .from('rejected_archive')
        .select(options?.select || '*');

      // Apply order
      if (options?.order) {
        const orders = Array.isArray(options.order) ? options.order : [options.order];
        orders.forEach(order => {
          query = query.order(order.column, {
            ascending: order.ascending ?? true,
          });
        });
      } else {
        query = query.order('archived_at', { ascending: false });
      }

      // Apply pagination
      if (options?.pagination) {
        const { limit, offset } = options.pagination;
        if (limit !== undefined) {
          if (offset !== undefined) {
            query = query.range(offset, offset + limit - 1);
          } else {
            query = query.limit(limit);
          }
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      logger.info(`Found ${data?.length || 0} rejected call reports`);
      return (data as unknown as RejectedArchive[]) || [];
    } catch (error) {
      logger.error(`Error finding rejected call reports: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find archive by story ID
   *
   * @param storyId - Story ID
   * @param select - Fields to select
   * @returns StoryArchive or null
   */
  async findByStoryId(
    storyId: string,
    select: string = '*'
  ): Promise<StoryArchive | null> {
    try {
      logger.info(`Finding archive for story: ${storyId}`);

      return await this.findOne(
        { story_id: storyId },
        select
      );
    } catch (error) {
      logger.error(`Error finding archive by story: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find archives by rejection stage
   *
   * @param stage - Rejection stage
   * @param options - Query options
   * @returns Array of story archives
   */
  async findByRejectionStage(stage: string, options?: QueryOptions): Promise<StoryArchive[]> {
    try {
      logger.info(`Finding archives by rejection stage: ${stage}`);

      return await this.findAll({
        ...options,
        filters: { ...options?.filters, rejection_stage: stage },
      });
    } catch (error) {
      logger.error(`Error finding archives by rejection stage: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find archives by date range
   *
   * @param fromDate - Start date
   * @param toDate - End date
   * @param options - Query options
   * @returns Array of story archives
   */
  async findByDateRange(
    fromDate: Date,
    toDate: Date,
    options?: QueryOptions
  ): Promise<StoryArchive[]> {
    try {
      logger.info(`Finding archives between ${fromDate.toISOString()} and ${toDate.toISOString()}`);

      const client = await this.getClient();
      let query = client
        .from(this.tableName)
        .select(options?.select || '*')
        .gte('archived_at', fromDate.toISOString())
        .lte('archived_at', toDate.toISOString());

      // Apply additional filters
      if (options?.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            query = query.in(key, value);
          } else {
            query = query.eq(key, value);
          }
        });
      }

      // Apply order
      if (options?.order) {
        const orders = Array.isArray(options.order) ? options.order : [options.order];
        orders.forEach(order => {
          query = query.order(order.column, {
            ascending: order.ascending ?? true,
          });
        });
      }

      // Apply pagination
      if (options?.pagination) {
        const { limit, offset } = options.pagination;
        if (limit !== undefined) {
          if (offset !== undefined) {
            query = query.range(offset, offset + limit - 1);
          } else {
            query = query.limit(limit);
          }
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      logger.info(`Found ${data?.length || 0} archives in date range`);
      return (data as unknown as StoryArchive[]) || [];
    } catch (error) {
      logger.error(`Error finding archives by date range: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get total count of story archives
   *
   * @returns Total count
   */
  async countStoryArchives(): Promise<number> {
    try {
      logger.info('Counting story archives');

      const client = await this.getClient();
      const { count, error } = await client
        .from(this.tableName)
        .select('*', { count: 'exact', head: true });

      if (error) throw error;

      logger.info(`Total story archives: ${count || 0}`);
      return count || 0;
    } catch (error) {
      logger.error(`Error counting story archives: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get total count of rejected call reports
   *
   * @returns Total count
   */
  async countRejectedReports(): Promise<number> {
    try {
      logger.info('Counting rejected call reports');

      const client = await this.getClient();
      const { count, error } = await client
        .from('rejected_archive')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;

      logger.info(`Total rejected call reports: ${count || 0}`);
      return count || 0;
    } catch (error) {
      logger.error(`Error counting rejected call reports: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Create story archive
   *
   * @param data - Story archive data
   * @returns Created archive
   */
  async createStoryArchive(data: Partial<StoryArchive>): Promise<StoryArchive> {
    try {
      logger.info(`Creating story archive for story: ${data.story_id}`);

      const archiveData = {
        ...data,
        archived_at: data.archived_at || new Date().toISOString(),
      };

      return await this.create(archiveData);
    } catch (error) {
      logger.error(`Error creating story archive: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Create rejected call report archive
   *
   * @param data - Rejected archive data
   * @returns Created rejected archive
   */
  async createRejectedReport(data: Partial<RejectedArchive>): Promise<RejectedArchive> {
    try {
      logger.info(`Creating rejected archive for call report: ${data.call_report_id}`);

      const client = await this.getClient();

      const archiveData = {
        ...data,
        archived_at: data.archived_at || new Date().toISOString(),
      };

      const { data: created, error } = await client
        .from('rejected_archive')
        .insert(archiveData)
        .select()
        .single();

      if (error) throw error;

      logger.info(`Created rejected archive: ${created.id}`);
      return created as RejectedArchive;
    } catch (error) {
      logger.error(`Error creating rejected archive: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}

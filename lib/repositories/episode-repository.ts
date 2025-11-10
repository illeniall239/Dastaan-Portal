/**
 * Episode Repository
 *
 * Handles all database operations for episodes.
 * Manages episode attachments linked to call reports or stories.
 *
 * Usage:
 * ```typescript
 * const repo = new EpisodeRepository('server');
 *
 * // Create an episode
 * const episode = await repo.createEpisode({
 *   call_report_id: '...',
 *   episode_number: 1,
 *   title: 'Episode 1',
 *   logged_by: userId,
 * });
 *
 * // Find episodes for a call report
 * const episodes = await repo.findByCallReportId(callReportId);
 *
 * // Create multiple episodes at once
 * await repo.createMany([...]);
 * ```
 */

import { BaseRepository, type RepositoryContextType, type QueryOptions } from './base';
import { logger } from '@/lib/logger';
import type { Episode, EpisodeWithDetails } from '@/types';

/**
 * Episode creation data
 */
export interface EpisodeCreateData {
  call_report_id?: string | null;
  story_id?: string | null;
  episode_number: number;
  title?: string | null;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_type?: string | null;
  additional_info?: string | null;
  logged_by: string; // User ID
}

/**
 * Episode update data
 */
export interface EpisodeUpdateData {
  episode_number?: number;
  title?: string | null;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_type?: string | null;
  additional_info?: string | null;
}

/**
 * Episode search filters
 */
export interface EpisodeSearchFilters {
  call_report_id?: string;
  story_id?: string;
  logged_by?: string;
  episode_number?: number;
}

/**
 * Episode statistics
 */
export interface EpisodeStatistics {
  total: number;
  by_source: {
    call_reports: number;
    stories: number;
  };
  with_attachments: number;
  without_attachments: number;
  by_user: Record<string, number>;
}

/**
 * Episode repository for managing episode data
 */
export class EpisodeRepository extends BaseRepository<Episode> {
  constructor(context: RepositoryContextType = 'server') {
    super('episodes', context);
  }

  /**
   * Validate that either call_report_id or story_id is provided
   *
   * @param data - Episode data
   * @throws Error if validation fails
   */
  private validateSourceReference(data: EpisodeCreateData): void {
    if (!data.call_report_id && !data.story_id) {
      throw new Error('Either call_report_id or story_id must be provided');
    }
    if (data.call_report_id && data.story_id) {
      throw new Error('Cannot provide both call_report_id and story_id');
    }
  }

  /**
   * Create a new episode
   *
   * @param data - Episode creation data
   * @returns Created episode
   */
  async createEpisode(data: EpisodeCreateData): Promise<Episode> {
    try {
      logger.info(`Creating episode number ${data.episode_number}`);

      // Validate source reference
      this.validateSourceReference(data);

      const episodeData = {
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const episode = await this.create(episodeData as Partial<Episode>);
      logger.info(`Episode created: ${episode.id}`);
      return episode;
    } catch (error) {
      logger.error(`Failed to create episode: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Create multiple episodes at once
   *
   * @param episodes - Array of episode creation data
   * @returns Array of created episodes
   */
  async createMultipleEpisodes(episodes: EpisodeCreateData[]): Promise<Episode[]> {
    try {
      logger.info(`Creating ${episodes.length} episodes`);

      // Validate all episodes
      for (const episode of episodes) {
        this.validateSourceReference(episode);
      }

      const episodesData = episodes.map((episode) => ({
        ...episode,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const createdEpisodes = await this.createMany(episodesData as Partial<Episode>[]);
      logger.info(`Created ${createdEpisodes.length} episodes`);
      return createdEpisodes;
    } catch (error) {
      logger.error(`Failed to create episodes: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find episodes by call report ID
   *
   * @param callReportId - Call report ID
   * @param options - Query options
   * @returns Array of episodes
   */
  async findByCallReportId(callReportId: string, options?: QueryOptions): Promise<Episode[]> {
    try {
      logger.info(`Finding episodes for call report: ${callReportId}`);

      return await this.findAll({
        ...options,
        filters: {
          ...options?.filters,
          call_report_id: callReportId,
        },
        order: options?.order || { column: 'episode_number', ascending: true },
      });
    } catch (error) {
      logger.error(`Failed to find episodes by call report: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find episodes by story ID
   *
   * @param storyId - Story ID
   * @param options - Query options
   * @returns Array of episodes
   */
  async findByStoryId(storyId: string, options?: QueryOptions): Promise<Episode[]> {
    try {
      logger.info(`Finding episodes for story: ${storyId}`);

      return await this.findAll({
        ...options,
        filters: {
          ...options?.filters,
          story_id: storyId,
        },
        order: options?.order || { column: 'episode_number', ascending: true },
      });
    } catch (error) {
      logger.error(`Failed to find episodes by story: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find episodes by user (logged_by)
   *
   * @param userId - User ID
   * @param options - Query options
   * @returns Array of episodes
   */
  async findByUser(userId: string, options?: QueryOptions): Promise<Episode[]> {
    try {
      logger.info(`Finding episodes logged by user: ${userId}`);

      return await this.findAll({
        ...options,
        filters: {
          ...options?.filters,
          logged_by: userId,
        },
      });
    } catch (error) {
      logger.error(`Failed to find episodes by user: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find episode by number for a call report
   *
   * @param callReportId - Call report ID
   * @param episodeNumber - Episode number
   * @returns Episode or null
   */
  async findByCallReportAndNumber(callReportId: string, episodeNumber: number): Promise<Episode | null> {
    try {
      logger.info(`Finding episode ${episodeNumber} for call report ${callReportId}`);

      return await this.findOne({
        call_report_id: callReportId,
        episode_number: episodeNumber,
      });
    } catch (error) {
      logger.error(`Failed to find episode by call report and number: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find episode by number for a story
   *
   * @param storyId - Story ID
   * @param episodeNumber - Episode number
   * @returns Episode or null
   */
  async findByStoryAndNumber(storyId: string, episodeNumber: number): Promise<Episode | null> {
    try {
      logger.info(`Finding episode ${episodeNumber} for story ${storyId}`);

      return await this.findOne({
        story_id: storyId,
        episode_number: episodeNumber,
      });
    } catch (error) {
      logger.error(`Failed to find episode by story and number: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Check if episode number exists for a call report
   *
   * @param callReportId - Call report ID
   * @param episodeNumber - Episode number
   * @returns True if exists
   */
  async episodeNumberExists(callReportId: string, episodeNumber: number): Promise<boolean> {
    try {
      logger.info(`Checking if episode ${episodeNumber} exists for call report ${callReportId}`);

      const episode = await this.findByCallReportAndNumber(callReportId, episodeNumber);
      return episode !== null;
    } catch (error) {
      logger.error(`Failed to check episode number existence: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get episode count for a call report
   *
   * @param callReportId - Call report ID
   * @returns Episode count
   */
  async countByCallReportId(callReportId: string): Promise<number> {
    try {
      logger.info(`Counting episodes for call report: ${callReportId}`);

      return await this.count({ call_report_id: callReportId });
    } catch (error) {
      logger.error(`Failed to count episodes: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get episode count for a story
   *
   * @param storyId - Story ID
   * @returns Episode count
   */
  async countByStoryId(storyId: string): Promise<number> {
    try {
      logger.info(`Counting episodes for story: ${storyId}`);

      return await this.count({ story_id: storyId });
    } catch (error) {
      logger.error(`Failed to count episodes: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get next episode number for a call report
   *
   * @param callReportId - Call report ID
   * @returns Next available episode number
   */
  async getNextEpisodeNumber(callReportId: string): Promise<number> {
    try {
      logger.info(`Getting next episode number for call report: ${callReportId}`);

      const episodes = await this.findByCallReportId(callReportId);

      if (episodes.length === 0) {
        return 1;
      }

      const maxNumber = Math.max(...episodes.map((ep) => ep.episode_number));
      return maxNumber + 1;
    } catch (error) {
      logger.error(`Failed to get next episode number: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find episodes with attachments
   *
   * @param options - Query options
   * @returns Array of episodes with attachments
   */
  async findWithAttachments(options?: QueryOptions): Promise<Episode[]> {
    try {
      logger.info(`Finding episodes with attachments`);

      const client = await this.getClient();
      let query = client.from(this.tableName).select(options?.select || '*');

      // Filter for episodes with attachment_url
      query = query.not('attachment_url', 'is', null);

      // Apply additional filters
      if (options?.filters) {
        query = this.buildQuery(query, options.filters);
      }

      // Apply ordering
      if (options?.order) {
        query = this.applyOrdering(query, options.order);
      }

      // Apply pagination
      if (options?.pagination) {
        query = this.applyPagination(query, options.pagination);
      }

      const { data, error } = await query;

      if (error) this.handleError(error);

      logger.info(`Found ${data?.length || 0} episodes with attachments`);
      return (data as unknown as Episode[]) || [];
    } catch (error) {
      logger.error(`Failed to find episodes with attachments: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find episodes without attachments
   *
   * @param options - Query options
   * @returns Array of episodes without attachments
   */
  async findWithoutAttachments(options?: QueryOptions): Promise<Episode[]> {
    try {
      logger.info(`Finding episodes without attachments`);

      const client = await this.getClient();
      let query = client.from(this.tableName).select(options?.select || '*');

      // Filter for episodes without attachment_url
      query = query.is('attachment_url', null);

      // Apply additional filters
      if (options?.filters) {
        query = this.buildQuery(query, options.filters);
      }

      // Apply ordering
      if (options?.order) {
        query = this.applyOrdering(query, options.order);
      }

      // Apply pagination
      if (options?.pagination) {
        query = this.applyPagination(query, options.pagination);
      }

      const { data, error } = await query;

      if (error) this.handleError(error);

      logger.info(`Found ${data?.length || 0} episodes without attachments`);
      return (data as unknown as Episode[]) || [];
    } catch (error) {
      logger.error(`Failed to find episodes without attachments: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Update episode
   *
   * @param episodeId - Episode ID
   * @param data - Episode update data
   * @returns Updated episode
   */
  async updateEpisode(episodeId: string, data: EpisodeUpdateData): Promise<Episode> {
    try {
      logger.info(`Updating episode: ${episodeId}`);

      const updateData = {
        ...data,
        updated_at: new Date().toISOString(),
      };

      return await this.update(episodeId, updateData as Partial<Episode>);
    } catch (error) {
      logger.error(`Failed to update episode: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Update episode attachment
   *
   * @param episodeId - Episode ID
   * @param attachmentUrl - Attachment URL
   * @param attachmentName - Attachment filename
   * @param attachmentType - Attachment MIME type
   * @returns Updated episode
   */
  async updateAttachment(
    episodeId: string,
    attachmentUrl: string,
    attachmentName: string,
    attachmentType: string
  ): Promise<Episode> {
    try {
      logger.info(`Updating episode attachment: ${episodeId}`);

      return await this.update(episodeId, {
        attachment_url: attachmentUrl,
        attachment_name: attachmentName,
        attachment_type: attachmentType,
        updated_at: new Date().toISOString(),
      } as Partial<Episode>);
    } catch (error) {
      logger.error(`Failed to update episode attachment: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Remove episode attachment
   *
   * @param episodeId - Episode ID
   * @returns Updated episode
   */
  async removeAttachment(episodeId: string): Promise<Episode> {
    try {
      logger.info(`Removing episode attachment: ${episodeId}`);

      return await this.update(episodeId, {
        attachment_url: null,
        attachment_name: null,
        attachment_type: null,
        updated_at: new Date().toISOString(),
      } as unknown as Partial<Episode>);
    } catch (error) {
      logger.error(`Failed to remove episode attachment: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Search episodes with complex filters
   *
   * @param filters - Search filters
   * @param options - Query options
   * @returns Array of matching episodes
   */
  async searchWithFilters(filters: EpisodeSearchFilters, options?: QueryOptions): Promise<Episode[]> {
    try {
      logger.info(`Searching episodes with filters`);

      const queryFilters: any = { ...options?.filters };

      if (filters.call_report_id) {
        queryFilters.call_report_id = filters.call_report_id;
      }

      if (filters.story_id) {
        queryFilters.story_id = filters.story_id;
      }

      if (filters.logged_by) {
        queryFilters.logged_by = filters.logged_by;
      }

      if (filters.episode_number !== undefined) {
        queryFilters.episode_number = filters.episode_number;
      }

      return await this.findAll({
        ...options,
        filters: queryFilters,
      });
    } catch (error) {
      logger.error(`Failed to search episodes: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get episode statistics
   *
   * @returns Statistics object
   */
  async getStatistics(): Promise<EpisodeStatistics> {
    try {
      logger.info(`Calculating episode statistics`);

      const client = await this.getClient();
      const { data, error } = await client
        .from(this.tableName)
        .select('call_report_id, story_id, attachment_url, logged_by');

      if (error) this.handleError(error);

      const stats: EpisodeStatistics = {
        total: data?.length || 0,
        by_source: {
          call_reports: 0,
          stories: 0,
        },
        with_attachments: 0,
        without_attachments: 0,
        by_user: {},
      };

      for (const row of data || []) {
        // Count by source
        if (row.call_report_id) {
          stats.by_source.call_reports++;
        }
        if (row.story_id) {
          stats.by_source.stories++;
        }

        // Count attachments
        if (row.attachment_url) {
          stats.with_attachments++;
        } else {
          stats.without_attachments++;
        }

        // Count by user
        if (row.logged_by) {
          stats.by_user[row.logged_by] = (stats.by_user[row.logged_by] || 0) + 1;
        }
      }

      logger.info(`Statistics calculated`);
      return stats;
    } catch (error) {
      logger.error(`Failed to get statistics: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Delete an episode
   *
   * @param episodeId - Episode ID
   */
  async deleteEpisode(episodeId: string): Promise<void> {
    try {
      logger.info(`Deleting episode: ${episodeId}`);
      await this.delete(episodeId);
      logger.info(`Episode deleted: ${episodeId}`);
    } catch (error) {
      logger.error(`Failed to delete episode: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Delete all episodes for a call report
   *
   * @param callReportId - Call report ID
   * @returns Number of episodes deleted
   */
  async deleteByCallReportId(callReportId: string): Promise<number> {
    try {
      logger.info(`Deleting all episodes for call report: ${callReportId}`);

      const count = await this.deleteMany({ call_report_id: callReportId });

      logger.info(`Deleted ${count} episodes`);
      return count;
    } catch (error) {
      logger.error(`Failed to delete episodes: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Delete all episodes for a story
   *
   * @param storyId - Story ID
   * @returns Number of episodes deleted
   */
  async deleteByStoryId(storyId: string): Promise<number> {
    try {
      logger.info(`Deleting all episodes for story: ${storyId}`);

      const count = await this.deleteMany({ story_id: storyId });

      logger.info(`Deleted ${count} episodes`);
      return count;
    } catch (error) {
      logger.error(`Failed to delete episodes: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}

/**
 * Helper function to create an EpisodeRepository instance
 *
 * @param context - Repository context
 * @returns EpisodeRepository instance
 */
export function createEpisodeRepository(context: RepositoryContextType = 'server'): EpisodeRepository {
  return new EpisodeRepository(context);
}

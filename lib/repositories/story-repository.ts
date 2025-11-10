/**
 * Story Repository
 *
 * Handles all database operations for stories.
 * Manages the story submission workflow from draft to contracted.
 *
 * Usage:
 * ```typescript
 * const repo = new StoryRepository('server');
 *
 * // Create a story
 * const story = await repo.createStory({
 *   title: 'My Story',
 *   category: 'writer_pitch',
 *   synopsis: '...',
 *   ...
 * });
 *
 * // Find by status
 * const submitted = await repo.findByStatus('submitted');
 *
 * // Update story status
 * await repo.updateStatus(storyId, 'in_evaluation');
 * ```
 */

import { BaseRepository, type RepositoryContextType, type QueryOptions } from './base';
import { logger } from '@/lib/logger';
import type { Story, StoryStatus, Genre } from '@/types';

/**
 * Story category types
 */
export type StoryCategory = 'external_producer' | 'writer_pitch' | 'inhouse_content';

/**
 * Story creation data
 */
export interface StoryCreateData {
  title: string;
  logged_by: string; // User name
  category: StoryCategory;
  writer_originator_name: string;
  suggested_writer?: string;
  synopsis: string;
  genre: string;
  target_audience: string;
  status?: StoryStatus;
  current_stage?: string;
  created_by: string; // User ID
}

/**
 * Story update data
 */
export interface StoryUpdateData {
  title?: string;
  logged_by?: string;
  category?: StoryCategory;
  writer_originator_name?: string;
  suggested_writer?: string;
  synopsis?: string;
  genre?: string;
  target_audience?: string;
  status?: StoryStatus;
  current_stage?: string;
}

/**
 * Story search filters
 */
export interface StorySearchFilters {
  status?: StoryStatus | StoryStatus[];
  category?: StoryCategory | StoryCategory[];
  genre?: string | string[];
  created_by?: string;
}

/**
 * Story statistics
 */
export interface StoryStatistics {
  total: number;
  by_status: Record<string, number>;
  by_category: Record<string, number>;
  by_genre: Record<string, number>;
  draft: number;
  submitted: number;
  in_evaluation: number;
  approved: number;
  rejected: number;
}

/**
 * Story repository for managing story data
 */
export class StoryRepository extends BaseRepository<Story> {
  constructor(context: RepositoryContextType = 'server') {
    super('stories', context);
  }

  /**
   * Create a new story
   *
   * @param data - Story creation data
   * @returns Created story
   */
  async createStory(data: StoryCreateData): Promise<Story> {
    try {
      logger.info(`Creating story: ${data.title}`);

      const storyData = {
        ...data,
        status: data.status || 'draft',
        current_stage: data.current_stage || 'submitted',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const story = await this.create(storyData as unknown as Partial<Story>);
      logger.info(`Story created: ${story.id}`);
      return story;
    } catch (error) {
      logger.error(`Failed to create story: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find story by story_id (STR-YYYY-NNNN format)
   *
   * @param storyId - Story ID in STR-YYYY-NNNN format
   * @returns Story or null
   */
  async findByStoryId(storyId: string): Promise<Story | null> {
    try {
      logger.info(`Finding story by story_id: ${storyId}`);

      return await this.findOne({ story_id: storyId });
    } catch (error) {
      logger.error(`Failed to find story by story_id: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find stories by status
   *
   * @param status - Story status or array of statuses
   * @param options - Query options
   * @returns Array of stories
   */
  async findByStatus(status: StoryStatus | StoryStatus[], options?: QueryOptions): Promise<Story[]> {
    try {
      logger.info(`Finding stories by status: ${Array.isArray(status) ? status.join(', ') : status}`);

      return await this.findAll({
        ...options,
        filters: {
          ...options?.filters,
          status,
        },
      });
    } catch (error) {
      logger.error(`Failed to find stories by status: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find stories by category
   *
   * @param category - Story category or array of categories
   * @param options - Query options
   * @returns Array of stories
   */
  async findByCategory(category: StoryCategory | StoryCategory[], options?: QueryOptions): Promise<Story[]> {
    try {
      logger.info(`Finding stories by category: ${Array.isArray(category) ? category.join(', ') : category}`);

      return await this.findAll({
        ...options,
        filters: {
          ...options?.filters,
          category,
        },
      });
    } catch (error) {
      logger.error(`Failed to find stories by category: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find stories by genre
   *
   * @param genre - Genre or array of genres
   * @param options - Query options
   * @returns Array of stories
   */
  async findByGenre(genre: string | string[], options?: QueryOptions): Promise<Story[]> {
    try {
      logger.info(`Finding stories by genre: ${Array.isArray(genre) ? genre.join(', ') : genre}`);

      return await this.findAll({
        ...options,
        filters: {
          ...options?.filters,
          genre,
        },
      });
    } catch (error) {
      logger.error(`Failed to find stories by genre: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find stories created by a specific user
   *
   * @param userId - User ID
   * @param options - Query options
   * @returns Array of stories
   */
  async findByCreator(userId: string, options?: QueryOptions): Promise<Story[]> {
    try {
      logger.info(`Finding stories created by user: ${userId}`);

      return await this.findAll({
        ...options,
        filters: {
          ...options?.filters,
          created_by: userId,
        },
      });
    } catch (error) {
      logger.error(`Failed to find stories by creator: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Search stories by title or synopsis
   *
   * @param query - Search query
   * @param options - Query options
   * @returns Array of matching stories
   */
  async search(query: string, options?: QueryOptions): Promise<Story[]> {
    try {
      logger.info(`Searching stories with query: ${query}`);

      const client = await this.getClient();
      let dbQuery = client.from(this.tableName).select(options?.select || '*');

      // Search in title and synopsis using OR
      dbQuery = dbQuery.or(`title.ilike.%${query}%,synopsis.ilike.%${query}%`);

      // Apply filters
      if (options?.filters) {
        dbQuery = this.buildQuery(dbQuery, options.filters);
      }

      // Apply ordering
      if (options?.order) {
        dbQuery = this.applyOrdering(dbQuery, options.order);
      }

      // Apply pagination
      if (options?.pagination) {
        dbQuery = this.applyPagination(dbQuery, options.pagination);
      }

      const { data, error } = await dbQuery;

      if (error) this.handleError(error);

      logger.info(`Found ${data?.length || 0} stories matching query`);
      return (data as unknown as Story[]) || [];
    } catch (error) {
      logger.error(`Failed to search stories: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Update story
   *
   * @param storyId - Story ID (UUID)
   * @param data - Story update data
   * @returns Updated story
   */
  async updateStory(storyId: string, data: StoryUpdateData): Promise<Story> {
    try {
      logger.info(`Updating story: ${storyId}`);

      const updateData = {
        ...data,
        updated_at: new Date().toISOString(),
      };

      return await this.update(storyId, updateData as unknown as Partial<Story>);
    } catch (error) {
      logger.error(`Failed to update story: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Update story status
   *
   * @param storyId - Story ID
   * @param status - New status
   * @returns Updated story
   */
  async updateStatus(storyId: string, status: StoryStatus): Promise<Story> {
    try {
      logger.info(`Updating story status: ${storyId} to ${status}`);

      return await this.update(storyId, {
        status,
        updated_at: new Date().toISOString(),
      } as unknown as Partial<Story>);
    } catch (error) {
      logger.error(`Failed to update story status: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Update current stage
   *
   * @param storyId - Story ID
   * @param stage - New stage
   * @returns Updated story
   */
  async updateCurrentStage(storyId: string, stage: string): Promise<Story> {
    try {
      logger.info(`Updating story stage: ${storyId} to ${stage}`);

      return await this.update(storyId, {
        current_stage: stage,
        updated_at: new Date().toISOString(),
      } as unknown as Partial<Story>);
    } catch (error) {
      logger.error(`Failed to update story stage: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Archive a story (set status to archived)
   *
   * @param storyId - Story ID
   * @param reason - Reason for archiving
   * @returns Updated story
   */
  async archive(storyId: string): Promise<Story> {
    try {
      logger.info(`Archiving story: ${storyId}`);

      return await this.updateStatus(storyId, 'archived');
    } catch (error) {
      logger.error(`Failed to archive story: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Reject a story (set status to rejected)
   *
   * @param storyId - Story ID
   * @returns Updated story
   */
  async reject(storyId: string): Promise<Story> {
    try {
      logger.info(`Rejecting story: ${storyId}`);

      return await this.updateStatus(storyId, 'rejected');
    } catch (error) {
      logger.error(`Failed to reject story: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Approve a story (set status to approved)
   *
   * @param storyId - Story ID
   * @returns Updated story
   */
  async approve(storyId: string): Promise<Story> {
    try {
      logger.info(`Approving story: ${storyId}`);

      return await this.updateStatus(storyId, 'approved');
    } catch (error) {
      logger.error(`Failed to approve story: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Count stories by status
   *
   * @returns Object with counts by status
   */
  async countByStatus(): Promise<Record<StoryStatus, number>> {
    try {
      logger.info(`Counting stories by status`);

      const client = await this.getClient();
      const { data, error } = await client.from(this.tableName).select('status');

      if (error) this.handleError(error);

      const counts: Record<string, number> = {};

      for (const row of data || []) {
        if (row.status) {
          counts[row.status] = (counts[row.status] || 0) + 1;
        }
      }

      logger.info(`Counted stories by status`);
      return counts as Record<StoryStatus, number>;
    } catch (error) {
      logger.error(`Failed to count by status: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Count stories by category
   *
   * @returns Object with counts by category
   */
  async countByCategory(): Promise<Record<StoryCategory, number>> {
    try {
      logger.info(`Counting stories by category`);

      const client = await this.getClient();
      const { data, error } = await client.from(this.tableName).select('category');

      if (error) this.handleError(error);

      const counts: Record<string, number> = {};

      for (const row of data || []) {
        if (row.category) {
          counts[row.category] = (counts[row.category] || 0) + 1;
        }
      }

      logger.info(`Counted stories by category`);
      return counts as Record<StoryCategory, number>;
    } catch (error) {
      logger.error(`Failed to count by category: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Count stories by genre
   *
   * @returns Object with counts by genre
   */
  async countByGenre(): Promise<Record<string, number>> {
    try {
      logger.info(`Counting stories by genre`);

      const client = await this.getClient();
      const { data, error } = await client.from(this.tableName).select('genre');

      if (error) this.handleError(error);

      const counts: Record<string, number> = {};

      for (const row of data || []) {
        if (row.genre) {
          counts[row.genre] = (counts[row.genre] || 0) + 1;
        }
      }

      logger.info(`Counted stories by genre`);
      return counts;
    } catch (error) {
      logger.error(`Failed to count by genre: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Search stories with complex filters
   *
   * @param filters - Search filters
   * @param options - Query options
   * @returns Array of matching stories
   */
  async searchWithFilters(filters: StorySearchFilters, options?: QueryOptions): Promise<Story[]> {
    try {
      logger.info(`Searching stories with filters`);

      const queryFilters: any = { ...options?.filters };

      if (filters.status) {
        queryFilters.status = filters.status;
      }

      if (filters.category) {
        queryFilters.category = filters.category;
      }

      if (filters.genre) {
        queryFilters.genre = filters.genre;
      }

      if (filters.created_by) {
        queryFilters.created_by = filters.created_by;
      }

      return await this.findAll({
        ...options,
        filters: queryFilters,
      });
    } catch (error) {
      logger.error(`Failed to search stories: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get story statistics
   *
   * @returns Statistics object
   */
  async getStatistics(): Promise<StoryStatistics> {
    try {
      logger.info(`Calculating story statistics`);

      const client = await this.getClient();
      const { data, error } = await client.from(this.tableName).select('status, category, genre');

      if (error) this.handleError(error);

      const stats: StoryStatistics = {
        total: data?.length || 0,
        by_status: {},
        by_category: {},
        by_genre: {},
        draft: 0,
        submitted: 0,
        in_evaluation: 0,
        approved: 0,
        rejected: 0,
      };

      for (const row of data || []) {
        // Count by status
        if (row.status) {
          stats.by_status[row.status] = (stats.by_status[row.status] || 0) + 1;

          // Count specific statuses
          if (row.status === 'draft') stats.draft++;
          if (row.status === 'submitted') stats.submitted++;
          if (row.status === 'in_evaluation') stats.in_evaluation++;
          if (row.status === 'approved') stats.approved++;
          if (row.status === 'rejected') stats.rejected++;
        }

        // Count by category
        if (row.category) {
          stats.by_category[row.category] = (stats.by_category[row.category] || 0) + 1;
        }

        // Count by genre
        if (row.genre) {
          stats.by_genre[row.genre] = (stats.by_genre[row.genre] || 0) + 1;
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
   * Delete a story
   *
   * @param storyId - Story ID
   */
  async deleteStory(storyId: string): Promise<void> {
    try {
      logger.info(`Deleting story: ${storyId}`);
      await this.delete(storyId);
      logger.info(`Story deleted: ${storyId}`);
    } catch (error) {
      logger.error(`Failed to delete story: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}

/**
 * Helper function to create a StoryRepository instance
 *
 * @param context - Repository context
 * @returns StoryRepository instance
 */
export function createStoryRepository(context: RepositoryContextType = 'server'): StoryRepository {
  return new StoryRepository(context);
}
